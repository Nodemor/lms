package com.nodemore.lms.plan;

import com.nodemore.lms.classroom.ClassRoomRepository;
import com.nodemore.lms.classroom.ClassStatus;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.lesson.LessonRepository;
import com.nodemore.lms.material.MaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** Teacher subscriptions and the plan limits (classes, students, storage) they unlock. */
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    public static final String FREE = "FREE";
    private static final Duration PERIOD = Duration.ofDays(30);

    private final SubscriptionRepository subs;
    private final PlanRepository plans;
    private final ClassRoomRepository classes;
    private final EnrollmentRepository enrollments;
    private final LessonRepository lessons;
    private final MaterialRepository materials;

    @Transactional
    public Subscription ensureForTeacher(UUID teacherId) {
        return subs.findByTeacherId(teacherId).orElseGet(() -> {
            Plan free = freePlan();
            Subscription s = new Subscription();
            s.setTeacherId(teacherId);
            s.setPlanId(free.getId());
            s.setStatus(Subscription.Status.ACTIVE);
            s.setCurrentPeriodStart(Instant.now());
            return subs.save(s);
        });
    }

    private Plan freePlan() {
        return plans.findByCode(FREE).orElseThrow(() -> new IllegalStateException("FREE plan missing"));
    }

    /** The plan whose limits apply right now (falls back to Free when a paid period has lapsed). */
    @Transactional
    public Plan effectivePlan(UUID teacherId) {
        Subscription s = ensureForTeacher(teacherId);
        Plan p = plans.findById(s.getPlanId()).orElseGet(this::freePlan);
        boolean lapsed = s.getCurrentPeriodEnd() != null && s.getCurrentPeriodEnd().isBefore(Instant.now());
        if (!FREE.equals(p.getCode()) && (lapsed || s.getStatus() != Subscription.Status.ACTIVE)) return freePlan();
        return p;
    }

    @Transactional
    public void assertCanCreateClass(UUID teacherId) {
        Plan p = effectivePlan(teacherId);
        long count = classes.countByTeacherIdAndStatusNot(teacherId, ClassStatus.ARCHIVED);
        if (count >= p.getMaxClasses()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "error.plan_class_limit", p.getMaxClasses());
        }
    }

    @Transactional
    public void assertCanAddStudent(UUID teacherId) {
        Plan p = effectivePlan(teacherId);
        long count = enrollments.countDistinctStudents(teacherId, EnrollmentStatus.ACTIVE);
        if (count >= p.getMaxStudents()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "error.plan_student_limit", p.getMaxStudents());
        }
    }

    public long storageUsed(UUID teacherId) {
        return lessons.sumSizeByTeacher(teacherId) + materials.sumSizeByTeacher(teacherId);
    }

    @Transactional
    public void assertStorage(UUID teacherId, long additionalBytes) {
        Plan p = effectivePlan(teacherId);
        if (storageUsed(teacherId) + additionalBytes > p.getStorageMb() * 1024L * 1024L) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "error.plan_storage_limit", p.getStorageMb());
        }
    }

    /** Called when a subscription payment succeeds: switches plan and extends the period by 30 days. */
    @Transactional
    public void activatePaid(UUID teacherId, UUID planId) {
        Subscription s = ensureForTeacher(teacherId);
        Instant now = Instant.now();
        boolean samePlanStillRunning = s.getPlanId().equals(planId) && s.getCurrentPeriodEnd() != null
                && s.getCurrentPeriodEnd().isAfter(now) && s.getStatus() == Subscription.Status.ACTIVE;
        Instant base = samePlanStillRunning ? s.getCurrentPeriodEnd() : now;
        if (!samePlanStillRunning) s.setCurrentPeriodStart(now);
        s.setPlanId(planId);
        s.setStatus(Subscription.Status.ACTIVE);
        s.setCurrentPeriodEnd(base.plus(PERIOD));
        subs.save(s);
    }

    @Transactional
    public Map<String, Object> summary(UUID teacherId) {
        Subscription s = ensureForTeacher(teacherId);
        Plan subscribed = plans.findById(s.getPlanId()).orElseGet(this::freePlan);
        Plan effective = effectivePlan(teacherId);
        Map<String, Object> usage = new LinkedHashMap<>();
        usage.put("classes", classes.countByTeacherIdAndStatusNot(teacherId, ClassStatus.ARCHIVED));
        usage.put("students", enrollments.countDistinctStudents(teacherId, EnrollmentStatus.ACTIVE));
        usage.put("storageBytes", storageUsed(teacherId));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("subscribedPlan", PlanDto.of(subscribed));
        out.put("effectivePlan", PlanDto.of(effective));
        out.put("status", s.getStatus());
        out.put("currentPeriodEnd", s.getCurrentPeriodEnd());
        out.put("usage", usage);
        return out;
    }

    /** Marks lapsed paid subscriptions as past due every hour. */
    @Scheduled(cron = "0 5 * * * *")
    @Transactional
    public void markLapsed() {
        subs.findByStatusAndCurrentPeriodEndBefore(Subscription.Status.ACTIVE, Instant.now()).forEach(s -> {
            s.setStatus(Subscription.Status.PAST_DUE);
            subs.save(s);
        });
    }
}
