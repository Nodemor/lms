package com.nodemore.lms.assignment;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "submissions")
public class Submission extends BaseEntity {
    public enum Status { SUBMITTED, GRADED }

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "student_id", nullable = false)
    private UUID studentId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(name = "text_answer", columnDefinition = "text")
    private String textAnswer;
    @Column(name = "file_key")
    private String fileKey;
    @Column(name = "file_name")
    private String fileName;
    @Column(nullable = false)
    private int version = 1;
    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;
    @Column(nullable = false)
    private boolean late;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    private Integer marks;
    @Column(columnDefinition = "text")
    private String feedback;
    @Column(name = "graded_at")
    private Instant gradedAt;
}
