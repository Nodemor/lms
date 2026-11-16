package com.nodemore.lms.admin;

import com.nodemore.lms.audit.AuditLog;
import com.nodemore.lms.audit.AuditLogRepository;
import com.nodemore.lms.audit.AuditService;
import com.nodemore.lms.auth.RefreshTokenRepository;
import com.nodemore.lms.classroom.*;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.PageResponse;
import com.nodemore.lms.common.Pages;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.live.ClassSessionRepository;
import com.nodemore.lms.live.SessionStatus;
import com.nodemore.lms.notification.EmailService;
import com.nodemore.lms.payment.PaymentEnums;
import com.nodemore.lms.payment.PaymentRepository;
import com.nodemore.lms.payment.PaymentService;
import com.nodemore.lms.plan.*;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.settings.SettingsService;
import com.nodemore.lms.support.SupportTicket;
import com.nodemore.lms.support.SupportTicketRepository;
import com.nodemore.lms.user.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

/** Super Admin API. Every route here requires ROLE_SUPER_ADMIN (see SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private static final List<String> SECURITY_ACTIONS = List.of("LOGIN_FAILED", "ACCOUNT_LOCKED", "REFRESH_TOKEN_REUSE",
            "PAYMENT_MISMATCH", "USER_SUSPENDED", "PASSWORD_RESET");

    private final UserRepository users;
    private final ClassRoomRepository classes;
    private final EnrollmentRepository enrollments;
    private final ClassSessionRepository sessions;
    private final PaymentRepository payments;
    private final PaymentService paymentService;
    private final PlanRepository plans;
    private final SubscriptionRepository subscriptions;
    private final SubscriptionService subscriptionService;
    private final SupportTicketRepository tickets;
    private final AuditLogRepository auditLogs;
    private final AuditService audit;
    private final SettingsService settings;
    private final RefreshTokenRepository refreshTokens;
    private final ClassMapper classMapper;
    private final EmailService email;

    public record StatusRequest(@NotNull UserStatus status, @Size(max = 500) String reason) {}

    public record PlanUpdate(@NotBlank @Size(max = 80) String name, @NotNull @DecimalMin("0") BigDecimal priceMonthly,
                             @Min(1) int maxClasses, @Min(1) int maxStudents, @Min(100) long storageMb,
                             boolean advancedAnalytics, boolean customBranding, boolean prioritySupport, boolean active) {}

    public record AssignPlanRequest(@NotBlank String planCode, @Min(1) @Max(36) int months) {}

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public Map<String, Object> stats() {
        Instant monthStart = ZonedDateTime.now(ZoneId.of("Asia/Colombo")).withDayOfMonth(1)
                .toLocalDate().atStartOfDay(ZoneId.of("Asia/Colombo")).toInstant();
        UUID freeId = plans.findByCode(SubscriptionService.FREE).map(Plan::getId).orElse(new UUID(0, 0));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("teachers", users.countByRole(Role.TEACHER));
        m.put("students", users.countByRole(Role.STUDENT));
        m.put("suspendedUsers", users.countByRoleAndStatus(Role.TEACHER, UserStatus.SUSPENDED)
                + users.countByRoleAndStatus(Role.STUDENT, UserStatus.SUSPENDED));
        m.put("publishedClasses", classes.countByStatus(ClassStatus.PUBLISHED));
        m.put("totalClasses", classes.count());
        m.put("activeEnrollments", enrollments.countByStatus(EnrollmentStatus.ACTIVE));
        m.put("pendingEnrollments", enrollments.countByStatus(EnrollmentStatus.PENDING));
        m.put("liveNow", sessions.countByStatus(SessionStatus.LIVE));
        m.put("paidSubscriptions", subscriptions.countByStatusAndPlanIdNot(Subscription.Status.ACTIVE, freeId));
        m.put("classFeesThisMonth", payments.sumSince(PaymentEnums.Status.PAID, PaymentEnums.Type.CLASS_FEE, monthStart));
        m.put("subscriptionRevenueThisMonth", payments.sumSince(PaymentEnums.Status.PAID, PaymentEnums.Type.SUBSCRIPTION, monthStart));
        m.put("openTickets", tickets.countByStatus(SupportTicket.Status.OPEN));
        return m;
    }

    // ------------------------------------------------------------- users
    @GetMapping("/users")
    @Transactional(readOnly = true)
    public PageResponse<UserDto> users(@RequestParam(required = false) Role role,
                                       @RequestParam(required = false) UserStatus status,
                                       @RequestParam(defaultValue = "") String q,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(users.search(role, status, q.trim(), Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))), UserDto::of);
    }

    @GetMapping("/users/{id}")
    @Transactional(readOnly = true)
    public Map<String, Object> user(@PathVariable UUID id) {
        User u = users.findById(id).orElseThrow(ApiException::notFound);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", UserDto.of(u));
        if (u.getRole() == Role.TEACHER) {
            out.put("classes", classMapper.toDtos(classes.findByTeacherIdOrderByCreatedAtDesc(id)));
            out.put("subscription", subscriptionService.summary(id));
        } else if (u.getRole() == Role.STUDENT) {
            out.put("enrollments", enrollments.findByStudentIdOrderByCreatedAtDesc(id).size());
        }
        return out;
    }

    @PostMapping("/users/{id}/status")
    @Transactional
    public UserDto setStatus(@PathVariable UUID id, @Valid @RequestBody StatusRequest req) {
        User u = users.findById(id).orElseThrow(ApiException::notFound);
        if (u.getRole() == Role.SUPER_ADMIN || u.getId().equals(CurrentUser.get().id())) throw ApiException.forbidden();
        if (req.status() == UserStatus.PENDING_VERIFICATION) throw ApiException.badRequest("error.bad_request");
        u.setStatus(req.status());
        if (req.status() == UserStatus.SUSPENDED) {
            refreshTokens.revokeAllForUser(u.getId(), Instant.now());
            email.sendTemplate(u.getEmail(), u.getPreferredLanguage(), "ACCOUNT_SUSPENDED",
                    Map.of("name", u.getFullName(), "reason", req.reason() == null ? "-" : req.reason()));
            audit.log("USER_SUSPENDED", "User", id.toString(), req.reason());
        } else {
            if (!u.isEmailVerified()) u.setEmailVerified(true);
            u.setLockedUntil(null);
            u.setFailedLoginAttempts(0);
            if (u.getRole() == Role.TEACHER) subscriptionService.ensureForTeacher(u.getId());
            audit.log("USER_ACTIVATED", "User", id.toString(), req.reason());
        }
        return UserDto.of(u);
    }

    @PostMapping("/users/{id}/plan")
    @Transactional
    public Map<String, Object> assignPlan(@PathVariable UUID id, @Valid @RequestBody AssignPlanRequest req) {
        User u = users.findById(id).filter(x -> x.getRole() == Role.TEACHER).orElseThrow(ApiException::notFound);
        Plan plan = plans.findByCode(req.planCode()).orElseThrow(ApiException::notFound);
        for (int i = 0; i < req.months(); i++) subscriptionService.activatePaid(u.getId(), plan.getId());
        audit.log("PLAN_ASSIGNED", "User", id.toString(), plan.getCode() + " x" + req.months());
        return subscriptionService.summary(u.getId());
    }

    // ------------------------------------------------------------- classes
    @GetMapping("/classes")
    @Transactional(readOnly = true)
    public PageResponse<ClassDto> classes(@RequestParam(required = false) ClassStatus status,
                                          @RequestParam(defaultValue = "") String q,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        Page<ClassRoom> p = classes.searchAdmin(status, q.trim(), Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(classMapper.toDtos(p.getContent()), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @PostMapping("/classes/{id}/archive")
    @Transactional
    public ClassDto archiveClass(@PathVariable UUID id) {
        ClassRoom c = classes.findById(id).orElseThrow(ApiException::notFound);
        c.setStatus(ClassStatus.ARCHIVED);
        audit.log("CLASS_ARCHIVED_BY_ADMIN", "Class", id.toString(), c.getTitle());
        return classMapper.toDto(c);
    }

    // ------------------------------------------------------------- payments
    @GetMapping("/payments")
    public PageResponse<PaymentService.PaymentDto> payments(@RequestParam(required = false) PaymentEnums.Status status,
                                                            @RequestParam(required = false) PaymentEnums.Type type,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "20") int size) {
        return paymentService.adminList(status, type, page, size);
    }

    // ------------------------------------------------------------- plans
    @GetMapping("/plans")
    public List<PlanDto> plans() {
        return plans.findAllByOrderBySortOrderAsc().stream().map(PlanDto::of).toList();
    }

    @PutMapping("/plans/{id}")
    @Transactional
    public PlanDto updatePlan(@PathVariable UUID id, @Valid @RequestBody PlanUpdate req) {
        Plan p = plans.findById(id).orElseThrow(ApiException::notFound);
        if (SubscriptionService.FREE.equals(p.getCode()) && (req.priceMonthly().signum() != 0 || !req.active())) {
            throw ApiException.badRequest("error.free_plan_locked");
        }
        p.setName(req.name());
        p.setPriceMonthly(req.priceMonthly());
        p.setMaxClasses(req.maxClasses());
        p.setMaxStudents(req.maxStudents());
        p.setStorageMb(req.storageMb());
        p.setAdvancedAnalytics(req.advancedAnalytics());
        p.setCustomBranding(req.customBranding());
        p.setPrioritySupport(req.prioritySupport());
        p.setActive(req.active());
        audit.log("PLAN_UPDATED", "Plan", id.toString(), p.getCode());
        return PlanDto.of(p);
    }

    // ------------------------------------------------------------- settings
    @GetMapping("/settings")
    public Map<String, String> getSettings() { return settings.all(); }

    @PutMapping("/settings")
    public Map<String, String> putSettings(@RequestBody Map<String, String> values) {
        for (var e : values.entrySet()) {
            if (!SettingsService.EDITABLE.contains(e.getKey())) throw ApiException.badRequest("error.bad_request");
            String v = e.getValue() == null ? "" : e.getValue();
            if (v.length() > 2000) throw ApiException.badRequest("error.bad_request");
            settings.put(e.getKey(), v);
        }
        audit.log("SETTINGS_UPDATED", "Settings", null, String.join(",", values.keySet()));
        return settings.all();
    }

    // ------------------------------------------------------------- audit + security
    public record AuditDto(UUID id, String actorEmail, String action, String entityType, String entityId,
                           String details, String ipAddress, Instant createdAt) {
        static AuditDto of(AuditLog a) {
            return new AuditDto(a.getId(), a.getActorEmail(), a.getAction(), a.getEntityType(), a.getEntityId(),
                    a.getDetails(), a.getIpAddress(), a.getCreatedAt());
        }
    }

    @GetMapping("/audit-logs")
    public PageResponse<AuditDto> auditLogs(@RequestParam(defaultValue = "") String action,
                                            @RequestParam(defaultValue = "") String q,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "30") int size) {
        return PageResponse.of(auditLogs.search(action.trim(), q.trim(),
                Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))), AuditDto::of);
    }

    @GetMapping("/security-events")
    public PageResponse<AuditDto> securityEvents(@RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "30") int size) {
        return PageResponse.of(auditLogs.findByActionIn(SECURITY_ACTIONS,
                Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))), AuditDto::of);
    }
}
