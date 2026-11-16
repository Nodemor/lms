package com.nodemore.lms.jobs;

import com.nodemore.lms.assignment.Assignment;
import com.nodemore.lms.assignment.AssignmentRepository;
import com.nodemore.lms.assignment.SubmissionRepository;
import com.nodemore.lms.classroom.ClassRoom;
import com.nodemore.lms.classroom.ClassRoomRepository;
import com.nodemore.lms.common.DateFormats;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.live.ClassSession;
import com.nodemore.lms.live.ClassSessionRepository;
import com.nodemore.lms.live.LiveService;
import com.nodemore.lms.live.SessionStatus;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.quiz.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Background work. Designed for one API instance; when scaling out, enable it on one node only
 * (APP_JOBS_ENABLED=false on the others) or add ShedLock.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.jobs-enabled", havingValue = "true", matchIfMissing = true)
public class ScheduledJobs {

    private final ClassSessionRepository sessions;
    private final AssignmentRepository assignments;
    private final SubmissionRepository submissions;
    private final ClassRoomRepository classes;
    private final EnrollmentRepository enrollments;
    private final NotificationService notifications;
    private final LiveService liveService;
    private final QuizService quizService;
    private final DateFormats dates;

    /** Reminds students 30 minutes before a live class. */
    @Scheduled(fixedDelay = 120_000, initialDelay = 30_000)
    @Transactional
    public void sessionReminders() {
        Instant now = Instant.now();
        for (ClassSession s : sessions.findByStatusAndReminderSentFalseAndScheduledStartBetween(SessionStatus.SCHEDULED,
                now, now.plus(Duration.ofMinutes(30)))) {
            String title = classes.findById(s.getClassId()).map(ClassRoom::getTitle).orElse("");
            notifications.notifyMany(enrollments.studentIds(s.getClassId(), EnrollmentStatus.ACTIVE), "SESSION_STARTING",
                    Map.of("className", title, "title", s.getTitle(), "start", dates.format(s.getScheduledStart())),
                    "/student/classes/" + s.getClassId() + "?tab=live", true);
            s.setReminderSent(true);
        }
    }

    /** Reminds students who have not submitted, 24 hours before an assignment is due. */
    @Scheduled(fixedDelay = 600_000, initialDelay = 60_000)
    @Transactional
    public void assignmentReminders() {
        Instant now = Instant.now();
        for (Assignment a : assignments.findByPublishedTrueAndReminderSentFalseAndDueAtBetween(now, now.plus(Duration.ofHours(24)))) {
            Set<UUID> pending = new HashSet<>(enrollments.studentIds(a.getClassId(), EnrollmentStatus.ACTIVE));
            List<UUID> done = submissions.submittedStudentIds(a.getId());
            done.forEach(pending::remove);
            String title = classes.findById(a.getClassId()).map(ClassRoom::getTitle).orElse("");
            notifications.notifyMany(pending, "ASSIGNMENT_DUE",
                    Map.of("className", title, "title", a.getTitle(), "due", dates.format(a.getDueAt())),
                    "/student/classes/" + a.getClassId() + "?tab=assignments", true);
            a.setReminderSent(true);
        }
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 45_000)
    public void closeExpiredQuizAttempts() {
        try { quizService.closeExpiredAttempts(); } catch (Exception e) { log.error("Quiz auto-submit failed", e); }
    }

    @Scheduled(fixedDelay = 900_000, initialDelay = 90_000)
    public void housekeeping() {
        try { liveService.closeStaleSessions(); } catch (Exception e) { log.error("Stale session cleanup failed", e); }
    }
}
