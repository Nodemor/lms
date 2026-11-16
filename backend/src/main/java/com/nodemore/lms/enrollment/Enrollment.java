package com.nodemore.lms.enrollment;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "enrollments")
public class Enrollment extends BaseEntity {
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "student_id", nullable = false)
    private UUID studentId;
    /** Tenant column: owning teacher of the class. */
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EnrollmentStatus status;
    private String note;
    @Column(name = "approved_at")
    private Instant approvedAt;
}
