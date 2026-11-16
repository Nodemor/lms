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
@Table(name = "assignments")
public class Assignment extends BaseEntity {
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "text")
    private String instructions;
    @Column(name = "due_at", nullable = false)
    private Instant dueAt;
    @Column(name = "max_marks", nullable = false)
    private int maxMarks;
    @Column(name = "attachment_key")
    private String attachmentKey;
    @Column(name = "attachment_name")
    private String attachmentName;
    @Column(name = "allow_late", nullable = false)
    private boolean allowLate;
    @Column(nullable = false)
    private boolean published = true;
    @Column(name = "reminder_sent", nullable = false)
    private boolean reminderSent;
}
