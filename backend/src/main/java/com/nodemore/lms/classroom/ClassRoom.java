package com.nodemore.lms.classroom;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "classes")
public class ClassRoom extends BaseEntity {
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "text")
    private String description;
    @Column(nullable = false)
    private String subject;
    @Column(name = "grade_level")
    private String gradeLevel;
    /** Teaching medium: en, si or ta. */
    @Column(nullable = false)
    private String medium = "en";
    @Column(name = "thumbnail_key")
    private String thumbnailKey;
    @Column(name = "schedule_text")
    private String scheduleText;
    @Enumerated(EnumType.STRING)
    @Column(name = "enrollment_mode", nullable = false)
    private EnrollmentMode enrollmentMode;
    @Enumerated(EnumType.STRING)
    @Column(name = "billing_type", nullable = false)
    private BillingType billingType;
    @Column(nullable = false)
    private BigDecimal fee = BigDecimal.ZERO;
    @Column(nullable = false)
    private String currency = "LKR";
    @Column(name = "max_students")
    private Integer maxStudents;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClassStatus status;

    public boolean isPaid() {
        return billingType != BillingType.FREE && fee != null && fee.signum() > 0;
    }
}
