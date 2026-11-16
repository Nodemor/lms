package com.nodemore.lms.user;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "teacher_profiles")
public class TeacherProfile extends BaseEntity {
    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;
    private String headline;
    @Column(columnDefinition = "text")
    private String bio;
    private String subjects;
    @Column(columnDefinition = "text")
    private String qualifications;
    /** Shown to this teacher's students on the Fees tab for bank-slip payments. */
    @Column(name = "bank_details", columnDefinition = "text")
    private String bankDetails;
}
