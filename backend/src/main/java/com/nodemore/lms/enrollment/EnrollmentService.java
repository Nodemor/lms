package com.nodemore.lms.enrollment;

import com.nodemore.lms.audit.AuditService;
import com.nodemore.lms.classroom.*;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.PageResponse;
import com.nodemore.lms.common.Pages;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.payment.PaymentAccessService;
import com.nodemore.lms.plan.SubscriptionService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.security.UserPrincipal;
import com.nodemore.lms.user.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository repo;
    private final ClassRoomRepository classes;
    private final UserRepository users;
    private final AccessService access;
    private final SubscriptionService subscriptions;
    private final NotificationService notifications;
    private final PaymentAccessService paymentAccess;
    private final ClassMapper classMapper;
    private final AuditService audit;

    public record EnrollmentDto(UUID id, UUID classId, UUID studentId, String studentName, String studentEmail,
                                String studentPhone, EnrollmentStatus status, Boolean paidCurrentPeriod,
                                Instant createdAt, Instant approvedAt) {}

    public record MyEnrollmentDto(UUID id, EnrollmentStatus status, boolean hasContentAccess, ClassDto classInfo,
                                  Instant createdAt) {}

    // ------------------------------------------------------------- student actions
    @Transactional
    public MyEnrollmentDto enroll(UUID classId) {
        UserPrincipal p = CurrentUser.get();
        if (!p.isStudent()) throw ApiException.forbidden();
        ClassRoom c = classes.findById(classId).filter(x -> x.getStatus() == ClassStatus.PUBLISHED)
                .orElseThrow(ApiException::notFound);
        Enrollment e = repo.findByClassIdAndStudentId(classId, p.id()).orElse(null);
        if (e != null && (e.getStatus() == EnrollmentStatus.ACTIVE || e.getStatus() == EnrollmentStatus.PENDING)) {
            throw ApiException.conflict("error.already_enrolled");
        }
        if (e != null && e.getStatus() == EnrollmentStatus.REMOVED) throw ApiException.forbidden();
        assertCapacity(c);
        if (e == null) {
            e = new Enrollment();
            e.setClassId(classId);
            e.setStudentId(p.id());
            e.setTeacherId(c.getTeacherId());
        }
        String studentName = users.findById(p.id()).map(User::getFullName).orElse("");
        Map<String, Object> params = Map.of("className", c.getTitle(), "studentName", studentName);
        if (c.getEnrollmentMode() == EnrollmentMode.OPEN) {
            subscriptions.assertCanAddStudent(c.getTeacherId());
            e.setStatus(EnrollmentStatus.ACTIVE);
            e.setApprovedAt(Instant.now());
            repo.save(e);
            notifications.notify(p.id(), "ENROLLMENT_CONFIRMED", params, "/student/classes/" + classId, true);
            notifications.notify(c.getTeacherId(), "NEW_STUDENT", params, "/teacher/classes/" + classId + "?tab=students", false);
        } else {
            e.setStatus(EnrollmentStatus.PENDING);
            repo.save(e);
            notifications.notify(c.getTeacherId(), "ENROLLMENT_REQUEST", params, "/teacher/classes/" + classId + "?tab=students", true);
        }
        return toMine(e, c);
    }

    @Transactional
    public void cancel(UUID classId) {
        UserPrincipal p = CurrentUser.get();
        Enrollment e = repo.findByClassIdAndStudentId(classId, p.id()).orElseThrow(ApiException::notFound);
        if (e.getStatus() == EnrollmentStatus.ACTIVE || e.getStatus() == EnrollmentStatus.PENDING) {
            e.setStatus(EnrollmentStatus.CANCELLED);
        }
    }

    @Transactional(readOnly = true)
    public List<MyEnrollmentDto> mine() {
        UUID me = CurrentUser.get().id();
        List<Enrollment> list = repo.findByStudentIdOrderByCreatedAtDesc(me).stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE || e.getStatus() == EnrollmentStatus.PENDING)
                .toList();
        Map<UUID, ClassRoom> cls = ClassMapper.index(classes.findAllById(list.stream().map(Enrollment::getClassId).toList()), ClassRoom::getId);
        Map<UUID, ClassDto> dtos = ClassMapper.index(classMapper.toDtos(cls.values()), ClassDto::id);
        List<MyEnrollmentDto> out = new ArrayList<>();
        for (Enrollment e : list) {
            ClassRoom c = cls.get(e.getClassId());
            if (c == null) continue;
            boolean accessOk = e.getStatus() == EnrollmentStatus.ACTIVE && paymentAccess.hasPaidAccess(c, me);
            out.add(new MyEnrollmentDto(e.getId(), e.getStatus(), accessOk, dtos.get(c.getId()), e.getCreatedAt()));
        }
        return out;
    }

    private MyEnrollmentDto toMine(Enrollment e, ClassRoom c) {
        boolean ok = e.getStatus() == EnrollmentStatus.ACTIVE && paymentAccess.hasPaidAccess(c, e.getStudentId());
        return new MyEnrollmentDto(e.getId(), e.getStatus(), ok, classMapper.toDto(c), e.getCreatedAt());
    }

    // ------------------------------------------------------------- teacher actions
    @Transactional(readOnly = true)
    public PageResponse<EnrollmentDto> listForClass(UUID classId, EnrollmentStatus status, String q, int page, int size) {
        ClassRoom c = access.requireOwner(classId);
        Page<Enrollment> p = repo.searchInClass(classId, status, q == null ? "" : q.trim(),
                Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        Map<UUID, User> us = ClassMapper.index(users.findAllById(p.getContent().stream().map(Enrollment::getStudentId).toList()), User::getId);
        Set<UUID> paid = c.isPaid() ? paymentAccess.paidStudentIds(c) : Set.of();
        List<EnrollmentDto> items = p.getContent().stream().map(e -> {
            User u = us.get(e.getStudentId());
            Boolean paidNow = c.isPaid() ? paid.contains(e.getStudentId()) : null;
            return new EnrollmentDto(e.getId(), e.getClassId(), e.getStudentId(), u == null ? "" : u.getFullName(),
                    u == null ? "" : u.getEmail(), u == null ? null : u.getPhone(), e.getStatus(), paidNow,
                    e.getCreatedAt(), e.getApprovedAt());
        }).toList();
        return new PageResponse<>(items, p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @Transactional
    public void decide(UUID classId, UUID enrollmentId, String action) {
        ClassRoom c = access.requireOwningTeacher(classId);
        Enrollment e = repo.findById(enrollmentId).filter(x -> x.getClassId().equals(classId))
                .orElseThrow(ApiException::notFound);
        Map<String, Object> params = Map.of("className", c.getTitle());
        String link = "/student/classes/" + classId;
        switch (action) {
            case "approve" -> {
                if (e.getStatus() == EnrollmentStatus.ACTIVE) return;
                assertCapacity(c);
                subscriptions.assertCanAddStudent(c.getTeacherId());
                e.setStatus(EnrollmentStatus.ACTIVE);
                e.setApprovedAt(Instant.now());
                notifications.notify(e.getStudentId(), "ENROLLMENT_APPROVED", params, link, true);
            }
            case "reject" -> {
                e.setStatus(EnrollmentStatus.REJECTED);
                notifications.notify(e.getStudentId(), "ENROLLMENT_REJECTED", params, "/classes", true);
            }
            case "remove" -> {
                e.setStatus(EnrollmentStatus.REMOVED);
                notifications.notify(e.getStudentId(), "ENROLLMENT_REMOVED", params, "/classes", false);
            }
            case "restore" -> {
                assertCapacity(c);
                subscriptions.assertCanAddStudent(c.getTeacherId());
                e.setStatus(EnrollmentStatus.ACTIVE);
                e.setApprovedAt(Instant.now());
                notifications.notify(e.getStudentId(), "ENROLLMENT_APPROVED", params, link, true);
            }
            default -> throw ApiException.badRequest("error.bad_request");
        }
        audit.log("ENROLLMENT_" + action.toUpperCase(Locale.ROOT), "Enrollment", e.getId().toString(), c.getTitle());
    }

    /** Teacher adds an existing student account to the class by e-mail. */
    @Transactional
    public void addByEmail(UUID classId, String email) {
        ClassRoom c = access.requireOwningTeacher(classId);
        User s = users.findByEmailIgnoreCase(email.trim())
                .filter(u -> u.getRole() == Role.STUDENT && u.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> ApiException.badRequest("error.student_not_found"));
        Enrollment e = repo.findByClassIdAndStudentId(classId, s.getId()).orElse(null);
        if (e != null && e.getStatus() == EnrollmentStatus.ACTIVE) throw ApiException.conflict("error.already_enrolled");
        assertCapacity(c);
        subscriptions.assertCanAddStudent(c.getTeacherId());
        if (e == null) {
            e = new Enrollment();
            e.setClassId(classId);
            e.setStudentId(s.getId());
            e.setTeacherId(c.getTeacherId());
        }
        e.setStatus(EnrollmentStatus.ACTIVE);
        e.setApprovedAt(Instant.now());
        repo.save(e);
        notifications.notify(s.getId(), "ENROLLMENT_CONFIRMED", Map.of("className", c.getTitle()),
                "/student/classes/" + classId, true);
        audit.log("ENROLLMENT_ADDED", "Enrollment", e.getId().toString(), c.getTitle());
    }

    private void assertCapacity(ClassRoom c) {
        if (c.getMaxStudents() != null && repo.countByClassIdAndStatus(c.getId(), EnrollmentStatus.ACTIVE) >= c.getMaxStudents()) {
            throw ApiException.conflict("error.class_full");
        }
    }

    /** Students the teacher teaches across all classes (for the teacher "Students" page). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> allStudentsOfTeacher() {
        UUID teacherId = CurrentUser.get().id();
        List<ClassRoom> mine = classes.findByTeacherIdOrderByCreatedAtDesc(teacherId);
        Map<UUID, String> classTitles = mine.stream().collect(Collectors.toMap(ClassRoom::getId, ClassRoom::getTitle));
        Map<UUID, List<String>> byStudent = new LinkedHashMap<>();
        for (ClassRoom c : mine) {
            for (UUID sid : repo.studentIds(c.getId(), EnrollmentStatus.ACTIVE)) {
                byStudent.computeIfAbsent(sid, k -> new ArrayList<>()).add(classTitles.get(c.getId()));
            }
        }
        Map<UUID, User> us = ClassMapper.index(users.findAllById(byStudent.keySet()), User::getId);
        List<Map<String, Object>> out = new ArrayList<>();
        byStudent.forEach((sid, titles) -> {
            User u = us.get(sid);
            if (u == null) return;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", sid);
            m.put("name", u.getFullName());
            m.put("email", u.getEmail());
            m.put("phone", u.getPhone());
            m.put("classes", titles);
            out.add(m);
        });
        out.sort(Comparator.comparing(m -> String.valueOf(m.get("name"))));
        return out;
    }
}
