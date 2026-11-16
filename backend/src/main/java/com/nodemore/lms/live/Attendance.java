package com.nodemore.lms.live;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Attendance built from LiveKit server webhooks (participant_joined / participant_left), i.e. from
 * real presence in the media room, not from a student merely opening a link.
 */
@Getter
@Setter
@Entity
@Table(name = "attendance")
public class Attendance extends BaseEntity {
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "student_id", nullable = false)
    private UUID studentId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(name = "first_joined_at")
    private Instant firstJoinedAt;
    @Column(name = "last_left_at")
    private Instant lastLeftAt;
    @Column(name = "open_joined_at")
    private Instant openJoinedAt;
    @Column(name = "total_seconds", nullable = false)
    private int totalSeconds;
    @Column(name = "join_count", nullable = false)
    private int joinCount;
    @Column(nullable = false)
    private boolean present;
}
