package com.nodemore.lms.lesson;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "lessons")
public class Lesson extends BaseEntity {
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "text")
    private String description;
    public enum SourceType { UPLOAD, YOUTUBE }

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private SourceType sourceType = SourceType.UPLOAD;
    /** Uploaded video (null for YouTube lessons). */
    @Column(name = "video_key")
    private String videoKey;
    /** 11-character YouTube video id (for unlisted YouTube lessons). */
    @Column(name = "youtube_id")
    private String youtubeId;
    /** Optional lecture-notes file attached to this lesson. */
    @Column(name = "notes_key")
    private String notesKey;
    @Column(name = "notes_name")
    private String notesName;
    @Column(name = "notes_size_bytes", nullable = false)
    private long notesSizeBytes;
    @Column(name = "content_type")
    private String contentType;
    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;
    @Column(name = "duration_seconds")
    private Integer durationSeconds;
    @Column(nullable = false)
    private int position;
    @Column(nullable = false)
    private boolean published = true;
    @Column(name = "available_from")
    private Instant availableFrom;

    public boolean isVisibleToStudents() {
        return published && (availableFrom == null || !availableFrom.isAfter(Instant.now()));
    }
}
