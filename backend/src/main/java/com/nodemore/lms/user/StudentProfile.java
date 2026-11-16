package com.nodemore.lms.user;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "student_profiles")
public class StudentProfile extends BaseEntity {
    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;
    private String school;
    private String grade;
    @Column(name = "guardian_name")
    private String guardianName;
    @Column(name = "guardian_phone")
    private String guardianPhone;
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;
}
