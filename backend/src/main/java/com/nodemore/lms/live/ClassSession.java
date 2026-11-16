package com.nodemore.lms.live;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "class_sessions")
public class ClassSession extends BaseEntity {
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "text")
    private String description;
    @Column(name = "scheduled_start", nullable = false)
    private Instant scheduledStart;
    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status;
    @Column(name = "room_name", nullable = false, unique = true)
    private String roomName;
    @Column(name = "started_at")
    private Instant startedAt;
    @Column(name = "ended_at")
    private Instant endedAt;
    @Column(name = "reminder_sent", nullable = false)
    private boolean reminderSent;
    /** External meeting link (Zoom, Meet, Teams...). Null means the built-in LiveKit room. */
    @Column(name = "meeting_url")
    private String meetingUrl;
    /** ZOOM, GOOGLE_MEET, TEAMS or OTHER (for the icon/label only). */
    @Column(name = "meeting_provider")
    private String meetingProvider;

    /** Physical class at a venue: students check in by scanning the teacher's QR code. */
    @Column(name = "in_person", nullable = false)
    private boolean inPerson;

    /** Attendance is confirmed by the teacher or by QR check-in, not measured from a video room. */
    public boolean isManualAttendance() {
        return isExternal() || inPerson;
    }

    public boolean isExternal() {
        return meetingUrl != null && !meetingUrl.isBlank();
    }
}
