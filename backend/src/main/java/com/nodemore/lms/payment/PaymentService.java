package com.nodemore.lms.payment;

import com.nodemore.lms.audit.AuditService;
import com.nodemore.lms.classroom.AccessService;
import com.nodemore.lms.classroom.BillingType;
import com.nodemore.lms.classroom.ClassMapper;
import com.nodemore.lms.classroom.ClassRoom;
import com.nodemore.lms.classroom.ClassRoomRepository;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.Hashing;
import com.nodemore.lms.common.PageResponse;
import com.nodemore.lms.common.Pages;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.plan.Plan;
import com.nodemore.lms.plan.PlanRepository;
import com.nodemore.lms.plan.SubscriptionService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.security.UserPrincipal;
import com.nodemore.lms.settings.SettingsService;
import com.nodemore.lms.storage.FileKeys;
import com.nodemore.lms.storage.StorageService;
import com.nodemore.lms.user.TeacherProfile;
import com.nodemore.lms.user.TeacherProfileRepository;
import com.nodemore.lms.user.User;
import com.nodemore.lms.user.UserRepository;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository payments;
    private final ClassRoomRepository classes;
    private final PlanRepository plans;
    private final UserRepository users;
    private final AccessService access;
    private final PaymentAccessService paymentAccess;
    private final SubscriptionService subscriptions;
    private final NotificationService notifications;
    private final StorageService storage;
    private final SettingsService settings;
    private final AuditService audit;
    private final TeacherProfileRepository teacherProfiles;

    public record ClassCheckoutRequest(@NotNull PaymentEnums.Method method,
                                       @Pattern(regexp = "^\\d{4}-\\d{2}$") String periodMonth,
                                       String slipKey, @Size(max = 500) String note) {}

    public record CashRequest(@NotNull UUID studentId, @Pattern(regexp = "^\\d{4}-\\d{2}$") String periodMonth,
                              @Size(max = 500) String note) {}

    public record DecisionRequest(boolean approve, @Size(max = 500) String note) {}

    public record PaymentDto(UUID id, String orderId, PaymentEnums.Type type, PaymentEnums.Method method,
                             PaymentEnums.Status status, UUID classId, String classTitle, UUID studentId,
                             String studentName, String teacherName, String planName, String periodMonth,
                             BigDecimal amount, String currency, boolean hasSlip, String note, Instant paidAt,
                             Instant createdAt) {}

    // ------------------------------------------------------------- student: class fees
    @Transactional
    public Map<String, Object> classCheckout(UUID classId, ClassCheckoutRequest req) {
        UserPrincipal p = CurrentUser.get();
        if (!p.isStudent()) throw ApiException.forbidden();
        ClassRoom c = access.requireMember(classId);
        if (!c.isPaid()) throw ApiException.badRequest("error.class_is_free");
        String period = resolvePeriod(c, req.periodMonth());
        boolean alreadyPaid = c.getBillingType() == BillingType.ONE_TIME
                ? payments.existsByStudentIdAndClassIdAndStatus(p.id(), classId, PaymentEnums.Status.PAID)
                : payments.existsByStudentIdAndClassIdAndPeriodMonthAndStatus(p.id(), classId, period, PaymentEnums.Status.PAID);
        if (alreadyPaid) throw ApiException.conflict("error.already_paid");

        User student = users.findById(p.id()).orElseThrow(ApiException::notFound);
        Payment pay = new Payment();
        pay.setOrderId(newOrderId());
        pay.setType(PaymentEnums.Type.CLASS_FEE);
        pay.setMethod(req.method());
        pay.setStatus(PaymentEnums.Status.PENDING);
        pay.setTeacherId(c.getTeacherId());
        pay.setStudentId(p.id());
        pay.setClassId(classId);
        pay.setPeriodMonth(period);
        pay.setAmount(c.getFee());
        pay.setCurrency(c.getCurrency());
        pay.setNote(req.note());

        if (req.method() != PaymentEnums.Method.BANK_TRANSFER) throw ApiException.badRequest("error.bad_request");
        if (req.slipKey() == null || req.slipKey().isBlank()) throw ApiException.badRequest("error.slip_required");
        FileKeys.requireStudentKey(req.slipKey(), p.id(), classId, "slips");
        if (!storage.exists(req.slipKey())) throw ApiException.badRequest("error.invalid_file");
        pay.setSlipKey(req.slipKey());
        payments.save(pay);
        notifications.notify(c.getTeacherId(), "PAYMENT_PENDING_REVIEW",
                Map.of("studentName", student.getFullName(), "className", c.getTitle(),
                        "amount", money(c.getFee()) + " " + c.getCurrency()),
                "/teacher/payments", true);
        return Map.of("gateway", "BANK_TRANSFER", "orderId", pay.getOrderId(), "status", pay.getStatus());
    }

    private String resolvePeriod(ClassRoom c, String requested) {
        if (c.getBillingType() != BillingType.MONTHLY) return null;
        YearMonth current = YearMonth.parse(paymentAccess.currentPeriod());
        if (requested == null || requested.isBlank()) return current.toString();
        YearMonth ym;
        try {
            ym = YearMonth.parse(requested);
        } catch (Exception e) {
            throw ApiException.badRequest("error.invalid_period");
        }
        if (ym.isBefore(current.minusMonths(1)) || ym.isAfter(current.plusMonths(3))) {
            throw ApiException.badRequest("error.invalid_period");
        }
        return ym.toString();
    }

    private static String money(BigDecimal a) {
        return a.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }

    private static String newOrderId() {
        return "NM" + Long.toString(System.currentTimeMillis(), 36).toUpperCase(Locale.ROOT)
                + Hashing.randomDigits(6);
    }

    /** Bank account for slips: the class teacher's own details, or the platform account as a fallback. */
    @Transactional(readOnly = true)
    public Map<String, Object> bankDetails(UUID classId) {
        String details = null;
        if (classId != null) {
            ClassRoom c = access.requireMember(classId);
            details = teacherProfiles.findByUserId(c.getTeacherId()).map(TeacherProfile::getBankDetails)
                    .filter(d -> d != null && !d.isBlank()).orElse(null);
        }
        if (details == null) details = settings.get("bank.details", "");
        return Map.of("details", details);
    }

    private void markPaid(Payment pay, UUID verifiedBy) {
        pay.setStatus(PaymentEnums.Status.PAID);
        pay.setPaidAt(Instant.now());
        pay.setVerifiedBy(verifiedBy);
        String amount = money(pay.getAmount()) + " " + pay.getCurrency();
        if (pay.getType() == PaymentEnums.Type.SUBSCRIPTION) {
            subscriptions.activatePaid(pay.getTeacherId(), pay.getPlanId());
            String planName = plans.findById(pay.getPlanId()).map(Plan::getName).orElse("");
            notifications.notify(pay.getTeacherId(), "SUBSCRIPTION_ACTIVATED", Map.of("plan", planName, "amount", amount),
                    "/teacher/subscription", true);
        } else {
            String title = classes.findById(pay.getClassId()).map(ClassRoom::getTitle).orElse("");
            notifications.notify(pay.getStudentId(), "PAYMENT_CONFIRMED", Map.of("className", title, "amount", amount),
                    "/student/classes/" + pay.getClassId(), true);
            notifications.notify(pay.getTeacherId(), "PAYMENT_RECEIVED", Map.of("className", title, "amount", amount),
                    "/teacher/payments", false);
        }
    }

    // ------------------------------------------------------------- teacher: manage class payments
    @Transactional
    public PaymentDto decide(UUID paymentId, DecisionRequest req) {
        UserPrincipal p = CurrentUser.get();
        Payment pay = payments.findById(paymentId).filter(x -> x.getTeacherId().equals(p.id())
                && x.getType() == PaymentEnums.Type.CLASS_FEE).orElseThrow(ApiException::notFound);
        if (pay.getStatus() != PaymentEnums.Status.PENDING || pay.getMethod() != PaymentEnums.Method.BANK_TRANSFER) {
            throw ApiException.conflict("error.payment_not_pending");
        }
        if (req.approve()) {
            markPaid(pay, p.id());
        } else {
            pay.setStatus(PaymentEnums.Status.FAILED);
            pay.setNote(req.note());
            String title = classes.findById(pay.getClassId()).map(ClassRoom::getTitle).orElse("");
            notifications.notify(pay.getStudentId(), "PAYMENT_REJECTED",
                    Map.of("className", title, "reason", req.note() == null ? "" : req.note()),
                    "/student/classes/" + pay.getClassId() + "?tab=payments", true);
        }
        audit.log(req.approve() ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED", "Payment", pay.getId().toString(), pay.getOrderId());
        return dtos(List.of(pay)).get(0);
    }

    @Transactional
    public PaymentDto recordCash(UUID classId, CashRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        if (!c.isPaid()) throw ApiException.badRequest("error.class_is_free");
        if (access.activeEnrollment(classId, req.studentId()) == null) throw ApiException.badRequest("error.student_not_enrolled");
        String period = resolvePeriod(c, req.periodMonth());
        boolean alreadyPaid = c.getBillingType() == BillingType.ONE_TIME
                ? payments.existsByStudentIdAndClassIdAndStatus(req.studentId(), classId, PaymentEnums.Status.PAID)
                : payments.existsByStudentIdAndClassIdAndPeriodMonthAndStatus(req.studentId(), classId, period, PaymentEnums.Status.PAID);
        if (alreadyPaid) throw ApiException.conflict("error.already_paid");
        Payment pay = new Payment();
        pay.setOrderId(newOrderId());
        pay.setType(PaymentEnums.Type.CLASS_FEE);
        pay.setMethod(PaymentEnums.Method.CASH);
        pay.setStatus(PaymentEnums.Status.PENDING);
        pay.setTeacherId(c.getTeacherId());
        pay.setStudentId(req.studentId());
        pay.setClassId(classId);
        pay.setPeriodMonth(period);
        pay.setAmount(c.getFee());
        pay.setCurrency(c.getCurrency());
        pay.setNote(req.note());
        markPaid(pay, CurrentUser.get().id());
        payments.save(pay);
        audit.log("PAYMENT_CASH_RECORDED", "Payment", pay.getId().toString(), pay.getOrderId());
        return dtos(List.of(pay)).get(0);
    }

    @Transactional
    public PaymentDto refund(UUID paymentId, String note) {
        UserPrincipal p = CurrentUser.get();
        Payment pay = payments.findById(paymentId)
                .filter(x -> p.isAdmin() || x.getTeacherId().equals(p.id()))
                .orElseThrow(ApiException::notFound);
        if (pay.getStatus() != PaymentEnums.Status.PAID) throw ApiException.conflict("error.payment_not_paid");
        pay.setStatus(PaymentEnums.Status.REFUNDED);
        pay.setNote(note);
        audit.log("PAYMENT_REFUNDED", "Payment", pay.getId().toString(), pay.getOrderId());
        return dtos(List.of(pay)).get(0);
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentDto> teacherList(UUID classId, PaymentEnums.Status status, int page, int size) {
        UUID me = CurrentUser.get().id();
        Pageable pg = Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Payment> p;
        if (classId != null) {
            access.requireOwningTeacher(classId);
            p = status == null ? payments.findByClassId(classId, pg) : payments.findByClassIdAndStatus(classId, status, pg);
        } else {
            p = status == null ? payments.findByTeacherIdAndType(me, PaymentEnums.Type.CLASS_FEE, pg)
                    : payments.findByTeacherIdAndTypeAndStatus(me, PaymentEnums.Type.CLASS_FEE, status, pg);
        }
        return new PageResponse<>(dtos(p.getContent()), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentDto> studentList(int page, int size) {
        Page<Payment> p = payments.findByStudentId(CurrentUser.get().id(), Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(dtos(p.getContent()), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentDto> adminList(PaymentEnums.Status status, PaymentEnums.Type type, int page, int size) {
        Page<Payment> p = payments.searchAdmin(status, type, Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(dtos(p.getContent()), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @Transactional(readOnly = true)
    public PaymentDto byOrder(String orderId) {
        UserPrincipal p = CurrentUser.get();
        Payment pay = payments.findByOrderId(orderId)
                .filter(x -> p.isAdmin() || p.id().equals(x.getStudentId()) || p.id().equals(x.getTeacherId()))
                .orElseThrow(ApiException::notFound);
        return dtos(List.of(pay)).get(0);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> slipUrl(UUID paymentId) {
        UserPrincipal p = CurrentUser.get();
        Payment pay = payments.findById(paymentId)
                .filter(x -> p.isAdmin() || p.id().equals(x.getStudentId()) || p.id().equals(x.getTeacherId()))
                .orElseThrow(ApiException::notFound);
        if (pay.getSlipKey() == null) throw ApiException.notFound();
        return Map.of("url", storage.signedUrl(pay.getSlipKey(), Duration.ofMinutes(15), "slip-" + pay.getOrderId()
                + "." + FileKeys.extension(pay.getSlipKey()), false));
    }

    private List<PaymentDto> dtos(List<Payment> list) {
        if (list.isEmpty()) return List.of();
        Set<UUID> userIds = new HashSet<>();
        Set<UUID> classIds = new HashSet<>();
        Set<UUID> planIds = new HashSet<>();
        for (Payment x : list) {
            if (x.getStudentId() != null) userIds.add(x.getStudentId());
            userIds.add(x.getTeacherId());
            if (x.getClassId() != null) classIds.add(x.getClassId());
            if (x.getPlanId() != null) planIds.add(x.getPlanId());
        }
        Map<UUID, User> us = ClassMapper.index(users.findAllById(userIds), User::getId);
        Map<UUID, ClassRoom> cs = ClassMapper.index(classes.findAllById(classIds), ClassRoom::getId);
        Map<UUID, Plan> ps = ClassMapper.index(plans.findAllById(planIds), Plan::getId);
        return list.stream().map(x -> new PaymentDto(x.getId(), x.getOrderId(), x.getType(), x.getMethod(), x.getStatus(),
                x.getClassId(), cs.containsKey(x.getClassId()) ? cs.get(x.getClassId()).getTitle() : null,
                x.getStudentId(), us.containsKey(x.getStudentId()) ? us.get(x.getStudentId()).getFullName() : null,
                us.containsKey(x.getTeacherId()) ? us.get(x.getTeacherId()).getFullName() : null,
                ps.containsKey(x.getPlanId()) ? ps.get(x.getPlanId()).getName() : null,
                x.getPeriodMonth(), x.getAmount(), x.getCurrency(), x.getSlipKey() != null, x.getNote(), x.getPaidAt(),
                x.getCreatedAt())).toList();
    }

}
