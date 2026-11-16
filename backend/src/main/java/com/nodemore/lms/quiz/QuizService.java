package com.nodemore.lms.quiz;

import com.fasterxml.jackson.core.type.TypeReference;
import com.nodemore.lms.classroom.AccessService;
import com.nodemore.lms.classroom.ClassMapper;
import com.nodemore.lms.classroom.ClassRoom;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.Json;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.security.UserPrincipal;
import com.nodemore.lms.user.User;
import com.nodemore.lms.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class QuizService {

    /** Network grace after the deadline for the final auto-submit. */
    private static final Duration GRACE = Duration.ofSeconds(60);
    private static final TypeReference<List<String>> STRINGS = new TypeReference<>() {};
    private static final TypeReference<Map<String, Integer>> ANSWERS = new TypeReference<>() {};

    private final QuizRepository quizzes;
    private final QuestionRepository questions;
    private final QuizAttemptRepository attempts;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AccessService access;
    private final NotificationService notifications;

    public record QuestionRequest(@NotBlank @Size(max = 5000) String text, @NotNull Question.Type type,
                                  List<@Size(max = 1000) String> options, @Min(0) int correctIndex,
                                  @Min(1) @Max(100) int marks) {}

    public record QuizRequest(@NotBlank @Size(max = 200) String title, @Size(max = 5000) String description,
                              Instant opensAt, Instant closesAt, @Min(1) @Max(600) Integer timeLimitMinutes,
                              @Min(1) @Max(20) int maxAttempts, boolean shuffleQuestions, boolean showAnswers,
                              boolean published, @Valid @Size(max = 200) List<QuestionRequest> questions) {}

    public record QuestionDto(UUID id, String text, Question.Type type, List<String> options, Integer correctIndex, int marks) {}

    public record QuizDto(UUID id, UUID classId, String title, String description, Instant opensAt, Instant closesAt,
                          Integer timeLimitMinutes, int maxAttempts, boolean shuffleQuestions, boolean showAnswers,
                          boolean published, long questionCount, Long attemptCount, List<QuestionDto> questions,
                          Integer attemptsUsed, Integer bestScore, Integer maxScore, UUID inProgressAttemptId) {}

    public record AttemptDto(UUID id, UUID quizId, String quizTitle, QuizAttempt.Status status, Instant startedAt,
                             Instant deadlineAt, Instant submittedAt, Integer score, Integer maxScore,
                             List<QuestionDto> questions, Map<String, Integer> answers, String studentName) {}

    // ------------------------------------------------------------- teacher
    @Transactional
    public QuizDto create(UUID classId, QuizRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        Quiz q = new Quiz();
        q.setClassId(classId);
        q.setTeacherId(c.getTeacherId());
        applyMeta(q, req);
        quizzes.save(q);
        replaceQuestions(q, req.questions());
        if (q.isPublished()) announce(c, q);
        return teacherDto(q);
    }

    @Transactional
    public QuizDto update(UUID classId, UUID quizId, QuizRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        Quiz q = owned(classId, quizId);
        boolean wasPublished = q.isPublished();
        applyMeta(q, req);
        if (req.questions() != null) {
            boolean changed = !sameQuestions(questions.findByQuizIdOrderByPositionAsc(quizId), req.questions());
            if (changed && attempts.countByQuizId(quizId) > 0) throw ApiException.conflict("error.quiz_has_attempts");
            if (changed) replaceQuestions(q, req.questions());
        }
        if (!wasPublished && q.isPublished()) announce(c, q);
        return teacherDto(q);
    }

    private void applyMeta(Quiz q, QuizRequest req) {
        if (req.opensAt() != null && req.closesAt() != null && !req.closesAt().isAfter(req.opensAt())) {
            throw ApiException.badRequest("error.quiz_window_invalid");
        }
        q.setTitle(req.title().trim());
        q.setDescription(req.description());
        q.setOpensAt(req.opensAt());
        q.setClosesAt(req.closesAt());
        q.setTimeLimitMinutes(req.timeLimitMinutes());
        q.setMaxAttempts(req.maxAttempts());
        q.setShuffleQuestions(req.shuffleQuestions());
        q.setShowAnswers(req.showAnswers());
        q.setPublished(req.published());
        if (req.published() && (req.questions() == null || req.questions().isEmpty())
                && questions.findByQuizIdOrderByPositionAsc(q.getId() == null ? UUID.randomUUID() : q.getId()).isEmpty()) {
            throw ApiException.badRequest("error.quiz_needs_questions");
        }
    }

    private static List<String> normalizedOptions(QuestionRequest r) {
        if (r.type() == Question.Type.TRUE_FALSE) return List.of("true", "false");
        List<String> opts = r.options() == null ? List.of() : r.options().stream().map(String::trim).toList();
        if (opts.size() < 2 || opts.size() > 6 || opts.stream().anyMatch(String::isEmpty)) {
            throw ApiException.badRequest("error.question_options_invalid");
        }
        return opts;
    }

    private void replaceQuestions(Quiz q, List<QuestionRequest> reqs) {
        if (reqs == null) return;
        questions.deleteByQuiz(q.getId());
        List<Question> list = new ArrayList<>();
        int pos = 1;
        for (QuestionRequest r : reqs) {
            List<String> opts = normalizedOptions(r);
            if (r.correctIndex() >= opts.size()) throw ApiException.badRequest("error.question_options_invalid");
            Question qu = new Question();
            qu.setQuizId(q.getId());
            qu.setText(r.text().trim());
            qu.setType(r.type());
            qu.setOptionsJson(Json.write(opts));
            qu.setCorrectIndex(r.correctIndex());
            qu.setMarks(r.marks());
            qu.setPosition(pos++);
            list.add(qu);
        }
        questions.saveAll(list);
    }

    private static boolean sameQuestions(List<Question> existing, List<QuestionRequest> reqs) {
        if (existing.size() != reqs.size()) return false;
        for (int i = 0; i < existing.size(); i++) {
            Question e = existing.get(i);
            QuestionRequest r = reqs.get(i);
            if (!e.getText().equals(r.text().trim()) || e.getType() != r.type() || e.getCorrectIndex() != r.correctIndex()
                    || e.getMarks() != r.marks() || !e.getOptionsJson().equals(Json.write(normalizedOptions(r)))) {
                return false;
            }
        }
        return true;
    }

    private void announce(ClassRoom c, Quiz q) {
        notifications.notifyMany(enrollments.studentIds(c.getId(), EnrollmentStatus.ACTIVE), "NEW_QUIZ",
                Map.of("className", c.getTitle(), "title", q.getTitle()),
                "/student/classes/" + c.getId() + "?tab=quizzes", true);
    }

    @Transactional
    public void delete(UUID classId, UUID quizId) {
        access.requireOwningTeacher(classId);
        quizzes.delete(owned(classId, quizId));
    }

    private Quiz owned(UUID classId, UUID quizId) {
        return quizzes.findById(quizId).filter(q -> q.getClassId().equals(classId)).orElseThrow(ApiException::notFound);
    }

    @Transactional(readOnly = true)
    public QuizDto getForTeacher(UUID quizId) {
        Quiz q = quizzes.findById(quizId).orElseThrow(ApiException::notFound);
        access.requireOwner(q.getClassId());
        return teacherDto(q);
    }

    private QuizDto teacherDto(Quiz q) {
        List<QuestionDto> qs = questions.findByQuizIdOrderByPositionAsc(q.getId()).stream()
                .map(x -> qdto(x, true)).toList();
        return new QuizDto(q.getId(), q.getClassId(), q.getTitle(), q.getDescription(), q.getOpensAt(), q.getClosesAt(),
                q.getTimeLimitMinutes(), q.getMaxAttempts(), q.isShuffleQuestions(), q.isShowAnswers(), q.isPublished(),
                qs.size(), attempts.countByQuizId(q.getId()), qs, null, null,
                qs.stream().mapToInt(QuestionDto::marks).sum(), null);
    }

    @Transactional(readOnly = true)
    public List<AttemptDto> results(UUID quizId) {
        Quiz q = quizzes.findById(quizId).orElseThrow(ApiException::notFound);
        access.requireOwner(q.getClassId());
        List<QuizAttempt> list = attempts.findByQuizIdAndStatusOrderBySubmittedAtDesc(quizId, QuizAttempt.Status.SUBMITTED);
        Map<UUID, User> us = ClassMapper.index(users.findAllById(list.stream().map(QuizAttempt::getStudentId).toList()), User::getId);
        return list.stream().map(a -> new AttemptDto(a.getId(), quizId, q.getTitle(), a.getStatus(), a.getStartedAt(),
                a.getDeadlineAt(), a.getSubmittedAt(), a.getScore(), a.getMaxScore(), null, null,
                us.containsKey(a.getStudentId()) ? us.get(a.getStudentId()).getFullName() : "")).toList();
    }

    // ------------------------------------------------------------- shared list
    @Transactional(readOnly = true)
    public List<QuizDto> list(UUID classId) {
        access.requireContent(classId);
        UserPrincipal p = CurrentUser.get();
        List<Quiz> all = quizzes.findByClassIdOrderByCreatedAtDesc(classId);
        Map<UUID, Long> qCounts = new HashMap<>();
        if (!all.isEmpty()) {
            for (Object[] r : questions.countByQuizzes(all.stream().map(Quiz::getId).toList())) {
                qCounts.put((UUID) r[0], ((Number) r[1]).longValue());
            }
        }
        if (!p.isStudent()) {
            return all.stream().map(q -> new QuizDto(q.getId(), q.getClassId(), q.getTitle(), q.getDescription(), q.getOpensAt(),
                    q.getClosesAt(), q.getTimeLimitMinutes(), q.getMaxAttempts(), q.isShuffleQuestions(), q.isShowAnswers(),
                    q.isPublished(), qCounts.getOrDefault(q.getId(), 0L), attempts.countByQuizId(q.getId()), null,
                    null, null, null, null)).toList();
        }
        Map<UUID, List<QuizAttempt>> mine = new HashMap<>();
        for (QuizAttempt a : attempts.findByClassIdAndStudentId(classId, p.id())) {
            mine.computeIfAbsent(a.getQuizId(), k -> new ArrayList<>()).add(a);
        }
        return all.stream().filter(Quiz::isPublished).map(q -> {
            List<QuizAttempt> as = mine.getOrDefault(q.getId(), List.of());
            int used = (int) as.stream().filter(a -> a.getStatus() == QuizAttempt.Status.SUBMITTED).count();
            Integer best = as.stream().filter(a -> a.getScore() != null).map(QuizAttempt::getScore).max(Integer::compare).orElse(null);
            Integer max = as.stream().map(QuizAttempt::getMaxScore).filter(Objects::nonNull).findFirst().orElse(null);
            UUID inProgress = as.stream().filter(a -> a.getStatus() == QuizAttempt.Status.IN_PROGRESS).map(QuizAttempt::getId).findFirst().orElse(null);
            return new QuizDto(q.getId(), q.getClassId(), q.getTitle(), q.getDescription(), q.getOpensAt(), q.getClosesAt(),
                    q.getTimeLimitMinutes(), q.getMaxAttempts(), q.isShuffleQuestions(), q.isShowAnswers(), true,
                    qCounts.getOrDefault(q.getId(), 0L), null, null, used, best, max, inProgress);
        }).toList();
    }

    // ------------------------------------------------------------- student attempts
    @Transactional
    public AttemptDto start(UUID quizId) {
        UserPrincipal p = CurrentUser.get();
        if (!p.isStudent()) throw ApiException.forbidden();
        Quiz q = quizzes.findById(quizId).filter(Quiz::isPublished).orElseThrow(ApiException::notFound);
        access.requireContent(q.getClassId());
        Instant now = Instant.now();
        Optional<QuizAttempt> open = attempts.findFirstByQuizIdAndStudentIdAndStatus(quizId, p.id(), QuizAttempt.Status.IN_PROGRESS);
        if (open.isPresent()) {
            QuizAttempt a = open.get();
            if (a.getDeadlineAt() == null || now.isBefore(a.getDeadlineAt().plus(GRACE))) return attemptDto(a, q, false);
            finalizeAttempt(a, now);
        }
        if (!q.isOpen(now)) throw ApiException.conflict("error.quiz_closed");
        if (attempts.countByQuizIdAndStudentIdAndStatus(quizId, p.id(), QuizAttempt.Status.SUBMITTED) >= q.getMaxAttempts()) {
            throw ApiException.conflict("error.quiz_no_attempts");
        }
        QuizAttempt a = new QuizAttempt();
        a.setQuizId(quizId);
        a.setClassId(q.getClassId());
        a.setStudentId(p.id());
        a.setTeacherId(q.getTeacherId());
        a.setStatus(QuizAttempt.Status.IN_PROGRESS);
        a.setStartedAt(now);
        Instant deadline = q.getTimeLimitMinutes() == null ? null : now.plus(Duration.ofMinutes(q.getTimeLimitMinutes()));
        if (q.getClosesAt() != null && (deadline == null || q.getClosesAt().isBefore(deadline))) deadline = q.getClosesAt();
        a.setDeadlineAt(deadline);
        a.setAnswersJson("{}");
        attempts.save(a);
        return attemptDto(a, q, false);
    }

    /** Autosave while answering, so nothing is lost if the connection drops. */
    @Transactional
    public Map<String, Object> saveAnswers(UUID attemptId, Map<String, Integer> answers) {
        QuizAttempt a = mineInProgress(attemptId);
        if (a.getDeadlineAt() != null && Instant.now().isAfter(a.getDeadlineAt().plus(GRACE))) {
            throw ApiException.conflict("error.quiz_time_over");
        }
        a.setAnswersJson(Json.write(answers == null ? Map.of() : answers));
        return Map.of("ok", true);
    }

    @Transactional
    public AttemptDto submit(UUID attemptId, Map<String, Integer> answers) {
        QuizAttempt a = mineInProgress(attemptId);
        Instant now = Instant.now();
        boolean inTime = a.getDeadlineAt() == null || !now.isAfter(a.getDeadlineAt().plus(GRACE));
        if (inTime && answers != null) a.setAnswersJson(Json.write(answers));
        finalizeAttempt(a, now);
        Quiz q = quizzes.findById(a.getQuizId()).orElseThrow(ApiException::notFound);
        return attemptDto(a, q, true);
    }

    private QuizAttempt mineInProgress(UUID attemptId) {
        UUID me = CurrentUser.get().id();
        QuizAttempt a = attempts.findById(attemptId).filter(x -> x.getStudentId().equals(me)).orElseThrow(ApiException::notFound);
        if (a.getStatus() != QuizAttempt.Status.IN_PROGRESS) throw ApiException.conflict("error.quiz_already_submitted");
        return a;
    }

    /** Grades on the server from stored answers: the client never sees correct answers before submitting. */
    void finalizeAttempt(QuizAttempt a, Instant now) {
        Map<String, Integer> ans = Optional.ofNullable(Json.read(a.getAnswersJson(), ANSWERS)).orElse(Map.of());
        int score = 0;
        int max = 0;
        for (Question q : questions.findByQuizIdOrderByPositionAsc(a.getQuizId())) {
            max += q.getMarks();
            Integer chosen = ans.get(q.getId().toString());
            if (chosen != null && chosen == q.getCorrectIndex()) score += q.getMarks();
        }
        a.setScore(score);
        a.setMaxScore(max);
        a.setStatus(QuizAttempt.Status.SUBMITTED);
        a.setSubmittedAt(now);
        attempts.save(a);
    }

    @Transactional(readOnly = true)
    public AttemptDto result(UUID attemptId) {
        UserPrincipal p = CurrentUser.get();
        QuizAttempt a = attempts.findById(attemptId).orElseThrow(ApiException::notFound);
        if (!(p.isStudent() && a.getStudentId().equals(p.id()))) access.requireOwner(a.getClassId());
        Quiz q = quizzes.findById(a.getQuizId()).orElseThrow(ApiException::notFound);
        if (a.getStatus() == QuizAttempt.Status.IN_PROGRESS) return attemptDto(a, q, false);
        boolean reveal = q.isShowAnswers() || !p.isStudent();
        return attemptDto(a, q, reveal);
    }

    private AttemptDto attemptDto(QuizAttempt a, Quiz q, boolean revealAnswers) {
        List<Question> qs = new ArrayList<>(questions.findByQuizIdOrderByPositionAsc(q.getId()));
        if (q.isShuffleQuestions() && a.getStatus() == QuizAttempt.Status.IN_PROGRESS) {
            Collections.shuffle(qs, new Random(a.getId().getMostSignificantBits()));
        }
        boolean reveal = revealAnswers && a.getStatus() == QuizAttempt.Status.SUBMITTED && q.isShowAnswers()
                || revealAnswers && !CurrentUser.get().isStudent();
        List<QuestionDto> dtos = qs.stream().map(x -> qdto(x, reveal)).toList();
        Map<String, Integer> answers = Json.read(a.getAnswersJson(), ANSWERS);
        return new AttemptDto(a.getId(), q.getId(), q.getTitle(), a.getStatus(), a.getStartedAt(), a.getDeadlineAt(),
                a.getSubmittedAt(), a.getScore(), a.getMaxScore(), dtos, answers == null ? Map.of() : answers, null);
    }

    private static QuestionDto qdto(Question q, boolean withAnswer) {
        return new QuestionDto(q.getId(), q.getText(), q.getType(), Json.read(q.getOptionsJson(), STRINGS),
                withAnswer ? q.getCorrectIndex() : null, q.getMarks());
    }

    /** Grades attempts whose timer ran out without a final submit (browser closed, etc.). */
    @Transactional
    public void closeExpiredAttempts() {
        Instant now = Instant.now();
        for (QuizAttempt a : attempts.findByStatusAndDeadlineAtBefore(QuizAttempt.Status.IN_PROGRESS, now.minus(GRACE))) {
            finalizeAttempt(a, now);
        }
    }
}
