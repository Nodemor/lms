package com.nodemore.lms.announcement;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "announcements")
public class Announcement extends BaseEntity {
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(nullable = false)
    private String title;
    @Column(nullable = false, columnDefinition = "text")
    private String body;
    @Column(nullable = false)
    private boolean pinned;
}
