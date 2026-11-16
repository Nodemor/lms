package com.nodemore.lms.classroom;

import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.enrollment.Enrollment;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.payment.PaymentAccessService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Central tenant-isolation checks. Every class-scoped endpoint goes through one of these methods:
 * a teacher can only touch classes they own, a student only classes they are actively enrolled in
 * (and, for learning content, have paid for when the class charges a fee).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccessService {

    private final ClassRoomRepository classes;
    private final EnrollmentRepository enrollments;
    private final PaymentAccessService paymentAccess;

    public ClassRoom load(UUID classId) {
        return classes.findById(classId).orElseThrow(ApiException::notFound);
    }

    public boolean isOwnerOrAdmin(ClassRoom c, UserPrincipal p) {
        return p.isAdmin() || (p.isTeacher() && c.getTeacherId().equals(p.id()));
    }

    /** Teacher who owns the class (or Super Admin). */
    public ClassRoom requireOwner(UUID classId) {
        UserPrincipal p = CurrentUser.get();
        ClassRoom c = load(classId);
        if (!isOwnerOrAdmin(c, p)) throw ApiException.notFound(); // 404 so class ids cannot be probed
        return c;
    }

    /** Strict: only the owning teacher (used for write actions; admins moderate through admin endpoints). */
    public ClassRoom requireOwningTeacher(UUID classId) {
        UserPrincipal p = CurrentUser.get();
        ClassRoom c = load(classId);
        if (!p.isTeacher() || !c.getTeacherId().equals(p.id())) throw ApiException.notFound();
        return c;
    }

    public Enrollment activeEnrollment(UUID classId, UUID studentId) {
        return enrollments.findByClassIdAndStudentId(classId, studentId)
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                .orElse(null);
    }

    /** Owner, admin, or an actively enrolled student (class overview, payments). */
    public ClassRoom requireMember(UUID classId) {
        UserPrincipal p = CurrentUser.get();
        ClassRoom c = load(classId);
        if (isOwnerOrAdmin(c, p)) return c;
        if (p.isStudent() && activeEnrollment(classId, p.id()) != null) return c;
        throw ApiException.notFound();
    }

    /** Learning content: owner/admin, or enrolled student whose fee is paid for the current period. */
    public ClassRoom requireContent(UUID classId) {
        UserPrincipal p = CurrentUser.get();
        ClassRoom c = load(classId);
        if (isOwnerOrAdmin(c, p)) return c;
        if (!p.isStudent() || activeEnrollment(classId, p.id()) == null) throw ApiException.notFound();
        if (!paymentAccess.hasPaidAccess(c, p.id())) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "error.payment_required");
        }
        return c;
    }

    public boolean hasContentAccess(ClassRoom c, UUID studentId) {
        return activeEnrollment(c.getId(), studentId) != null && paymentAccess.hasPaidAccess(c, studentId);
    }
}
