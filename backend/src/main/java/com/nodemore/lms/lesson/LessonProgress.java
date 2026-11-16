package com.nodemore.lms.lesson;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "lesson_progress")
public class LessonProgress extends BaseEntity {
    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;
    @Column(name = "student_id", nullable = false)
    private UUID studentId;
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "watched_seconds", nullable = false)
    private int watchedSeconds;
    @Column(name = "last_position_seconds", nullable = false)
    private int lastPositionSeconds;
    @Column(nullable = false)
    private boolean completed;
}
