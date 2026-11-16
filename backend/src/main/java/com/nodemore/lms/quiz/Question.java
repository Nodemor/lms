package com.nodemore.lms.quiz;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "questions")
public class Question extends BaseEntity {
    public enum Type { MCQ, TRUE_FALSE }

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;
    @Column(nullable = false, columnDefinition = "text")
    private String text;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;
    /** JSON array of option strings. TRUE_FALSE stores ["true","false"] and the UI translates them. */
    @Column(name = "options_json", nullable = false, columnDefinition = "text")
    private String optionsJson;
    @Column(name = "correct_index", nullable = false)
    private int correctIndex;
    @Column(nullable = false)
    private int marks = 1;
    @Column(nullable = false)
    private int position;
}
