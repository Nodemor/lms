package com.nodemore.lms.material;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "materials")
public class Material extends BaseEntity {
    @Column(name = "class_id", nullable = false)
    private UUID classId;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "text")
    private String description;
    private String category;
    @Column(name = "file_key", nullable = false)
    private String fileKey;
    @Column(name = "file_name", nullable = false)
    private String fileName;
    @Column(name = "content_type")
    private String contentType;
    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;
    @Column(nullable = false)
    private boolean downloadable = true;
}
