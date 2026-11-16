package com.nodemore.lms.quiz;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {
    List<QuizAttempt> findByQuizIdAndStudentIdOrderByStartedAtDesc(UUID quizId, UUID studentId);
    List<QuizAttempt> findByClassIdAndStudentId(UUID classId, UUID studentId);
    List<QuizAttempt> findByQuizIdAndStatusOrderBySubmittedAtDesc(UUID quizId, QuizAttempt.Status status);
    Optional<QuizAttempt> findFirstByQuizIdAndStudentIdAndStatus(UUID quizId, UUID studentId, QuizAttempt.Status status);
    long countByQuizIdAndStudentIdAndStatus(UUID quizId, UUID studentId, QuizAttempt.Status status);
    long countByQuizId(UUID quizId);
    List<QuizAttempt> findByStatusAndDeadlineAtBefore(QuizAttempt.Status status, Instant before);
    List<QuizAttempt> findTop5ByStudentIdAndStatusOrderBySubmittedAtDesc(UUID studentId, QuizAttempt.Status status);
    List<QuizAttempt> findTop200ByStudentIdAndStatusOrderBySubmittedAtDesc(UUID studentId, QuizAttempt.Status status);
}
