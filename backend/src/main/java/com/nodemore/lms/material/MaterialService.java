package com.nodemore.lms.material;

import com.nodemore.lms.classroom.AccessService;
import com.nodemore.lms.classroom.ClassRoom;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.plan.SubscriptionService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.storage.FileKeys;
import com.nodemore.lms.storage.StorageService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MaterialService {

    private final MaterialRepository materials;
    private final EnrollmentRepository enrollments;
    private final AccessService access;
    private final StorageService storage;
    private final SubscriptionService subscriptions;
    private final NotificationService notifications;

    public record MaterialRequest(@NotBlank @Size(max = 200) String title, @Size(max = 5000) String description,
                                  @Size(max = 60) String category, String fileKey, String fileName, boolean downloadable) {}

    public record MaterialDto(UUID id, UUID classId, String title, String description, String category, String fileName,
                              String contentType, long sizeBytes, boolean downloadable, Instant createdAt) {
        static MaterialDto of(Material m) {
            return new MaterialDto(m.getId(), m.getClassId(), m.getTitle(), m.getDescription(), m.getCategory(),
                    m.getFileName(), m.getContentType(), m.getSizeBytes(), m.isDownloadable(), m.getCreatedAt());
        }
    }

    @Transactional
    public MaterialDto create(UUID classId, MaterialRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        if (req.fileKey() == null) throw ApiException.badRequest("error.invalid_file");
        FileKeys.requireTeacherKey(req.fileKey(), c.getTeacherId(), classId, "materials");
        long size = storage.size(req.fileKey());
        if (size < 0) throw ApiException.badRequest("error.invalid_file");
        subscriptions.assertStorage(c.getTeacherId(), size);
        Material m = new Material();
        m.setClassId(classId);
        m.setTeacherId(c.getTeacherId());
        m.setFileKey(req.fileKey());
        m.setFileName(FileKeys.cleanName(req.fileName()));
        m.setContentType(FileKeys.contentTypeFor(req.fileKey()));
        m.setSizeBytes(size);
        apply(m, req);
        materials.save(m);
        notifications.notifyMany(enrollments.studentIds(classId, EnrollmentStatus.ACTIVE), "NEW_MATERIAL",
                Map.of("className", c.getTitle(), "title", m.getTitle()),
                "/student/classes/" + classId + "?tab=materials", true);
        return MaterialDto.of(m);
    }

    @Transactional
    public MaterialDto update(UUID classId, UUID id, MaterialRequest req) {
        access.requireOwningTeacher(classId);
        Material m = owned(classId, id);
        apply(m, req);
        return MaterialDto.of(m);
    }

    private void apply(Material m, MaterialRequest req) {
        m.setTitle(req.title().trim());
        m.setDescription(req.description());
        m.setCategory(req.category());
        m.setDownloadable(req.downloadable());
    }

    @Transactional
    public void delete(UUID classId, UUID id) {
        access.requireOwningTeacher(classId);
        Material m = owned(classId, id);
        materials.delete(m);
        storage.delete(m.getFileKey());
    }

    private Material owned(UUID classId, UUID id) {
        return materials.findById(id).filter(m -> m.getClassId().equals(classId)).orElseThrow(ApiException::notFound);
    }

    @Transactional(readOnly = true)
    public List<MaterialDto> list(UUID classId) {
        access.requireContent(classId);
        return materials.findByClassIdOrderByCreatedAtDesc(classId).stream().map(MaterialDto::of).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> url(UUID id, boolean download) {
        Material m = materials.findById(id).orElseThrow(ApiException::notFound);
        access.requireContent(m.getClassId());
        if (download && !m.isDownloadable() && CurrentUser.get().isStudent()) {
            throw ApiException.badRequest("error.download_disabled");
        }
        return Map.of("url", storage.signedUrl(m.getFileKey(), Duration.ofMinutes(30), m.getFileName(), download),
                "contentType", m.getContentType() == null ? "" : m.getContentType());
    }
}
