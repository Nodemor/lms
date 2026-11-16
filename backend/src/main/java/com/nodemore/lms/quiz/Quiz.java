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
@Table(name = "quizzes")
public class Quiz extends BaseEntity {
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "text")
    private String description;
    @Column(name = "opens_at")
    private Instant opensAt;
    @Column(name = "closes_at")
    private Instant closesAt;
    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;
    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts = 1;
    @Column(name = "shuffle_questions", nullable = false)
    private boolean shuffleQuestions;
    @Column(name = "show_answers", nullable = false)
    private boolean showAnswers = true;
    @Column(nullable = false)
    private boolean published;

    public boolean isOpen(Instant now) {
        return published && (opensAt == null || !now.isBefore(opensAt)) && (closesAt == null || now.isBefore(closesAt));
    }
}
