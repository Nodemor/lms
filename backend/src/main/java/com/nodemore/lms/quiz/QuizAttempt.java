package com.nodemore.lms.quiz;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt extends BaseEntity {
    public enum Status { IN_PROGRESS, SUBMITTED }

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "student_id", nullable = false)
    private UUID studentId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    @Column(name = "started_at", nullable = false)
    private Instant startedAt;
    @Column(name = "deadline_at")
    private Instant deadlineAt;
    @Column(name = "submitted_at")
    private Instant submittedAt;
    @Column(name = "answers_json", columnDefinition = "text")
    private String answersJson;
    private Integer score;
    @Column(name = "max_score")
    private Integer maxScore;
}
