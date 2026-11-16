package com.nodemore.lms.dashboard;

import com.nodemore.lms.assignment.Assignment;
import com.nodemore.lms.assignment.AssignmentRepository;
import com.nodemore.lms.assignment.Submission;
import com.nodemore.lms.assignment.SubmissionRepository;
import com.nodemore.lms.classroom.*;
import com.nodemore.lms.enrollment.Enrollment;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.lesson.LessonProgressRepository;
import com.nodemore.lms.lesson.LessonRepository;
import com.nodemore.lms.live.AttendanceRepository;
import com.nodemore.lms.live.ClassSession;
import com.nodemore.lms.live.ClassSessionRepository;
import com.nodemore.lms.live.SessionStatus;
import com.nodemore.lms.material.MaterialRepository;
import com.nodemore.lms.payment.PaymentEnums;
import com.nodemore.lms.payment.PaymentRepository;
import com.nodemore.lms.plan.SubscriptionService;
import com.nodemore.lms.quiz.QuizAttempt;
import com.nodemore.lms.quiz.QuizAttemptRepository;
import com.nodemore.lms.quiz.QuizRepository;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.user.User;
import com.nodemore.lms.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final ClassRoomRepository classes;
    private final EnrollmentRepository enrollments;
    private final ClassSessionRepository sessions;
    private final LessonRepository lessons;
    private final LessonProgressRepository progress;
    private final MaterialRepository materials;
    private final AssignmentRepository assignments;
    private final SubmissionRepository submissions;
    private final QuizRepository quizzes;
    private final QuizAttemptRepository attempts;
    private final AttendanceRepository attendance;
    private final PaymentRepository payments;
    private final UserRepository users;
    private final ClassMapper classMapper;
    private final AccessService access;
    private final SubscriptionService subscriptions;

    private static Map<String, Object> session(ClassSession s, String classTitle) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("classId", s.getClassId());
        m.put("classTitle", classTitle);
        m.put("title", s.getTitle());
        m.put("scheduledStart", s.getScheduledStart());
        m.put("durationMinutes", s.getDurationMinutes());
        m.put("status", s.getStatus());
        m.put("external", s.isExternal());
        m.put("inPerson", s.isInPerson());
        m.put("meetingProvider", s.getMeetingProvider());
        m.put("joinOpensAt", s.isExternal() ? s.getScheduledStart().minus(com.nodemore.lms.live.LiveService.EARLY_JOIN) : null);
        return m;
    }

    @GetMapping("/api/teacher/dashboard")
    @Transactional(readOnly = true)
    public Map<String, Object> teacher() {
        UUID me = CurrentUser.get().id();
        List<ClassRoom> mine = classes.findByTeacherIdOrderByCreatedAtDesc(me);
        Map<UUID, String> titles = new HashMap<>();
        mine.forEach(c -> titles.put(c.getId(), c.getTitle()));
        List<UUID> ids = mine.stream().map(ClassRoom::getId).toList();
        Instant monthStart = ZonedDateTime.now(ZoneId.of("Asia/Colombo")).withDayOfMonth(1).toLocalDate()
                .atStartOfDay(ZoneId.of("Asia/Colombo")).toInstant();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalStudents", enrollments.countDistinctStudents(me, EnrollmentStatus.ACTIVE));
        stats.put("totalClasses", mine.size());
        stats.put("activeClasses", mine.stream().filter(c -> c.getStatus() == ClassStatus.PUBLISHED).count());
        stats.put("upcomingSessions", sessions.countUpcomingForTeacher(me, SessionStatus.SCHEDULED, Instant.now()));
        stats.put("recordedLessons", lessons.countByTeacherId(me));
        stats.put("materials", materials.countByTeacherId(me));
        stats.put("pendingEnrollments", enrollments.countByTeacherIdAndStatus(me, EnrollmentStatus.PENDING));
        stats.put("toGrade", submissions.countByTeacherIdAndStatus(me, Submission.Status.SUBMITTED));
        stats.put("pendingSlips", payments.countByTeacherIdAndStatusAndMethod(me, PaymentEnums.Status.PENDING, PaymentEnums.Method.BANK_TRANSFER));
        stats.put("revenueThisMonth", payments.sumForTeacherSince(me, PaymentEnums.Status.PAID, PaymentEnums.Type.CLASS_FEE, monthStart));

        List<Map<String, Object>> upcoming = ids.isEmpty() ? List.of() :
                sessions.upcoming(ids, List.of(SessionStatus.SCHEDULED, SessionStatus.LIVE), Instant.now().minusSeconds(4 * 3600), PageRequest.of(0, 6))
                        .stream().filter(s -> s.getStatus() == SessionStatus.LIVE || s.getScheduledStart().isAfter(Instant.now().minusSeconds(3600)))
                        .map(s -> session(s, titles.get(s.getClassId()))).toList();

        List<Enrollment> recent = enrollments.findTop8ByTeacherIdOrderByCreatedAtDesc(me);
        Map<UUID, User> us = ClassMapper.index(users.findAllById(recent.stream().map(Enrollment::getStudentId).toList()), User::getId);
        List<Map<String, Object>> recentEnrollments = recent.stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("classId", e.getClassId());
            m.put("classTitle", titles.get(e.getClassId()));
            m.put("studentName", us.containsKey(e.getStudentId()) ? us.get(e.getStudentId()).getFullName() : "");
            m.put("status", e.getStatus());
            m.put("createdAt", e.getCreatedAt());
            return m;
        }).toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("stats", stats);
        out.put("upcomingSessions", upcoming);
        out.put("recentEnrollments", recentEnrollments);
        out.put("subscription", subscriptions.summary(me));
        return out;
    }

    @GetMapping("/api/student/dashboard")
    @Transactional(readOnly = true)
    public Map<String, Object> student() {
        UUID me = CurrentUser.get().id();
        List<UUID> classIds = enrollments.classIdsForStudent(me, EnrollmentStatus.ACTIVE);
        List<ClassRoom> cls = classes.findAllById(classIds);
        Map<UUID, String> titles = new HashMap<>();
        cls.forEach(c -> titles.put(c.getId(), c.getTitle()));

        List<Map<String, Object>> upcoming = classIds.isEmpty() ? List.of() :
                sessions.upcoming(classIds, List.of(SessionStatus.SCHEDULED, SessionStatus.LIVE), Instant.now().minusSeconds(4 * 3600), PageRequest.of(0, 6))
                        .stream().filter(s -> s.getStatus() == SessionStatus.LIVE || s.getScheduledStart().isAfter(Instant.now().minusSeconds(3600)))
                        .map(s -> session(s, titles.get(s.getClassId()))).toList();

        List<Map<String, Object>> due = new ArrayList<>();
        if (!classIds.isEmpty()) {
            List<Assignment> open = assignments.openForClasses(classIds, Instant.now());
            Set<UUID> done = open.isEmpty() ? Set.of()
                    : new HashSet<>(submissions.submittedAssignmentIds(me, open.stream().map(Assignment::getId).toList()));
            for (Assignment a : open) {
                if (done.contains(a.getId())) continue;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", a.getId());
                m.put("classId", a.getClassId());
                m.put("classTitle", titles.get(a.getClassId()));
                m.put("title", a.getTitle());
                m.put("dueAt", a.getDueAt());
                due.add(m);
                if (due.size() >= 6) break;
            }
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (QuizAttempt a : attempts.findTop5ByStudentIdAndStatusOrderBySubmittedAtDesc(me, QuizAttempt.Status.SUBMITTED)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("kind", "quiz");
            m.put("id", a.getId());
            m.put("classTitle", titles.get(a.getClassId()));
            m.put("title", quizzes.findById(a.getQuizId()).map(q -> q.getTitle()).orElse(""));
            m.put("score", a.getScore());
            m.put("max", a.getMaxScore());
            m.put("at", a.getSubmittedAt());
            results.add(m);
        }
        for (Submission s : submissions.findTop5ByStudentIdAndStatusOrderByGradedAtDesc(me, Submission.Status.GRADED)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("kind", "assignment");
            m.put("id", s.getId());
            m.put("classTitle", titles.get(s.getClassId()));
            m.put("title", assignments.findById(s.getAssignmentId()).map(Assignment::getTitle).orElse(""));
            m.put("score", s.getMarks());
            m.put("max", assignments.findById(s.getAssignmentId()).map(Assignment::getMaxMarks).orElse(null));
            m.put("at", s.getGradedAt());
            results.add(m);
        }
        results.sort((x, y) -> String.valueOf(y.get("at")).compareTo(String.valueOf(x.get("at"))));

        long needPayment = cls.stream().filter(c -> !access.hasContentAccess(c, me)).count();

        // Lesson progress per class (drives the progress ring and "continue learning").
        Map<UUID, Map<String, Object>> progressByClass = new LinkedHashMap<>();
        long totalLessons = 0, totalDone = 0;
        for (ClassRoom c : cls) {
            long total = lessons.countByClassIdAndPublishedTrue(c.getId());
            long done = progress.countByClassIdAndStudentIdAndCompletedTrue(c.getId(), me);
            totalLessons += total;
            totalDone += Math.min(done, total);
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("lessons", total);
            pm.put("completed", Math.min(done, total));
            pm.put("hasAccess", access.hasContentAccess(c, me));
            progressByClass.put(c.getId(), pm);
        }
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("enrolledClasses", classIds.size());
        stats.put("upcomingSessions", upcoming.size());
        stats.put("assignmentsDue", due.size());
        stats.put("paymentsDue", needPayment);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("stats", stats);
        out.put("classes", classMapper.toDtos(cls));
        out.put("progress", progressByClass);
        out.put("overallProgress", totalLessons == 0 ? null : Math.round(totalDone * 100.0 / totalLessons));
        out.put("upcomingSessions", upcoming);
        out.put("assignmentsDue", due);
        out.put("recentResults", results.size() > 6 ? results.subList(0, 6) : results);
        return out;
    }

    /** Every quiz result and assignment mark of the signed-in student (result history). */
    @GetMapping("/api/student/results")
    @Transactional(readOnly = true)
    public Map<String, Object> results() {
        UUID me = CurrentUser.get().id();
        List<QuizAttempt> qa = attempts.findTop200ByStudentIdAndStatusOrderBySubmittedAtDesc(me, QuizAttempt.Status.SUBMITTED);
        List<Submission> subs = submissions.findTop200ByStudentIdOrderBySubmittedAtDesc(me);
        Set<UUID> classIds = new HashSet<>();
        qa.forEach(a -> classIds.add(a.getClassId()));
        subs.forEach(s -> classIds.add(s.getClassId()));
        Map<UUID, String> titles = new HashMap<>();
        classes.findAllById(classIds).forEach(c -> titles.put(c.getId(), c.getTitle()));
        Map<UUID, String> quizTitles = new HashMap<>();
        quizzes.findAllById(qa.stream().map(QuizAttempt::getQuizId).collect(java.util.stream.Collectors.toSet()))
                .forEach(q -> quizTitles.put(q.getId(), q.getTitle()));
        Map<UUID, Assignment> asg = ClassMapper.index(assignments.findAllById(subs.stream().map(Submission::getAssignmentId)
                .collect(java.util.stream.Collectors.toSet())), Assignment::getId);

        List<Map<String, Object>> quizRows = new ArrayList<>();
        long quizPctSum = 0;
        for (QuizAttempt a : qa) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("classId", a.getClassId());
            m.put("classTitle", titles.getOrDefault(a.getClassId(), ""));
            m.put("title", quizTitles.getOrDefault(a.getQuizId(), ""));
            m.put("score", a.getScore());
            m.put("max", a.getMaxScore());
            m.put("at", a.getSubmittedAt());
            quizRows.add(m);
            if (a.getMaxScore() != null && a.getMaxScore() > 0 && a.getScore() != null) quizPctSum += Math.round(a.getScore() * 100.0 / a.getMaxScore());
        }
        List<Map<String, Object>> asgRows = new ArrayList<>();
        long asgPctSum = 0;
        int graded = 0;
        for (Submission s : subs) {
            Assignment a = asg.get(s.getAssignmentId());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("classId", s.getClassId());
            m.put("classTitle", titles.getOrDefault(s.getClassId(), ""));
            m.put("title", a == null ? "" : a.getTitle());
            m.put("status", s.getStatus());
            m.put("score", s.getMarks());
            m.put("max", a == null ? null : a.getMaxMarks());
            m.put("late", s.isLate());
            m.put("feedback", s.getFeedback());
            m.put("at", s.getGradedAt() != null ? s.getGradedAt() : s.getSubmittedAt());
            asgRows.add(m);
            if (s.getMarks() != null && a != null && a.getMaxMarks() > 0) {
                asgPctSum += Math.round(s.getMarks() * 100.0 / a.getMaxMarks());
                graded++;
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("quizzes", quizRows);
        out.put("assignments", asgRows);
        out.put("quizAverage", quizRows.isEmpty() ? null : quizPctSum / quizRows.size());
        out.put("assignmentAverage", graded == 0 ? null : asgPctSum / graded);
        return out;
    }

    /** Per-class analytics for the owning teacher. */
    @GetMapping("/api/teacher/classes/{classId}/analytics")
    @Transactional(readOnly = true)
    public Map<String, Object> classAnalytics(@PathVariable UUID classId) {
        ClassRoom c = access.requireOwner(classId);
        List<UUID> studentIds = enrollments.studentIds(classId, EnrollmentStatus.ACTIVE);
        long students = studentIds.size();
        long lessonCount = lessons.countByClassIdAndPublishedTrue(classId);
        long sessionsHeld = sessions.countByClassIdAndStatus(classId, SessionStatus.ENDED);
        long assignmentCount = assignments.countByClassIdAndPublishedTrue(classId);

        Map<UUID, Long> completed = new HashMap<>();
        for (Object[] r : progress.completedCountsByStudent(classId)) completed.put((UUID) r[0], ((Number) r[1]).longValue());
        Map<UUID, Long> submitted = new HashMap<>();
        for (Object[] r : submissions.countByStudentInClass(classId)) submitted.put((UUID) r[0], ((Number) r[1]).longValue());
        Map<UUID, Long> present = new HashMap<>();
        for (Object[] r : attendance.presentCountsByStudent(classId)) present.put((UUID) r[0], ((Number) r[1]).longValue());

        Map<UUID, User> us = ClassMapper.index(users.findAllById(studentIds), User::getId);
        List<Map<String, Object>> perStudent = new ArrayList<>();
        double sumLesson = 0, sumAttendance = 0, sumSubmission = 0;
        for (UUID id : studentIds) {
            double lp = lessonCount == 0 ? 0 : Math.min(100, completed.getOrDefault(id, 0L) * 100.0 / lessonCount);
            double ap = sessionsHeld == 0 ? 0 : Math.min(100, present.getOrDefault(id, 0L) * 100.0 / sessionsHeld);
            double sp = assignmentCount == 0 ? 0 : Math.min(100, submitted.getOrDefault(id, 0L) * 100.0 / assignmentCount);
            sumLesson += lp;
            sumAttendance += ap;
            sumSubmission += sp;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("studentId", id);
            m.put("name", us.containsKey(id) ? us.get(id).getFullName() : "");
            m.put("lessonCompletion", Math.round(lp));
            m.put("attendance", Math.round(ap));
            m.put("submissions", Math.round(sp));
            perStudent.add(m);
        }
        perStudent.sort(Comparator.comparing(m -> String.valueOf(m.get("name"))));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("classTitle", c.getTitle());
        out.put("students", students);
        out.put("lessons", lessonCount);
        out.put("sessionsHeld", sessionsHeld);
        out.put("assignments", assignmentCount);
        out.put("avgLessonCompletion", students == 0 ? 0 : Math.round(sumLesson / students));
        out.put("avgAttendance", students == 0 ? 0 : Math.round(sumAttendance / students));
        out.put("avgSubmissionRate", students == 0 ? 0 : Math.round(sumSubmission / students));
        out.put("perStudent", perStudent);
        return out;
    }
}
