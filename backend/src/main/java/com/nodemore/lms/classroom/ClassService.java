package com.nodemore.lms.classroom;

import com.nodemore.lms.audit.AuditService;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.config.LocaleConfig;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.lesson.LessonRepository;
import com.nodemore.lms.material.MaterialRepository;
import com.nodemore.lms.plan.SubscriptionService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.storage.FileKeys;
import com.nodemore.lms.storage.StorageService;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClassService {

    private final ClassRoomRepository classes;
    private final EnrollmentRepository enrollments;
    private final LessonRepository lessons;
    private final MaterialRepository materials;
    private final SubscriptionService subscriptions;
    private final AccessService access;
    private final ClassMapper mapper;
    private final StorageService storage;
    private final AuditService audit;

    public record ClassRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 10000) String description,
            @NotBlank @Size(max = 100) String subject,
            @Size(max = 60) String gradeLevel,
            String medium,
            String thumbnailKey,
            @Size(max = 300) String scheduleText,
            @NotNull EnrollmentMode enrollmentMode,
            @NotNull BillingType billingType,
            @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal fee,
            @Min(1) @Max(100000) Integer maxStudents) {}

    @Transactional(readOnly = true)
    public List<ClassDto> mine() {
        return mapper.toDtos(classes.findByTeacherIdOrderByCreatedAtDesc(CurrentUser.get().id()));
    }

    @Transactional(readOnly = true)
    public ClassDto get(UUID id) {
        return mapper.toDto(access.requireOwner(id));
    }

    @Transactional
    public ClassDto create(ClassRequest req) {
        UUID teacherId = CurrentUser.get().id();
        subscriptions.assertCanCreateClass(teacherId);
        ClassRoom c = new ClassRoom();
        c.setTeacherId(teacherId);
        c.setStatus(ClassStatus.DRAFT);
        apply(c, req, teacherId);
        classes.save(c);
        audit.log("CLASS_CREATED", "Class", c.getId().toString(), c.getTitle());
        return mapper.toDto(c);
    }

    @Transactional
    public ClassDto update(UUID id, ClassRequest req) {
        ClassRoom c = access.requireOwningTeacher(id);
        String oldThumb = c.getThumbnailKey();
        apply(c, req, c.getTeacherId());
        if (oldThumb != null && !oldThumb.equals(c.getThumbnailKey())) storage.delete(oldThumb);
        return mapper.toDto(c);
    }

    private void apply(ClassRoom c, ClassRequest req, UUID teacherId) {
        BigDecimal fee = req.fee() == null ? BigDecimal.ZERO : req.fee();
        if (req.billingType() == BillingType.FREE) {
            fee = BigDecimal.ZERO;
        } else if (fee.signum() <= 0) {
            throw ApiException.badRequest("error.fee_required");
        }
        if (req.thumbnailKey() != null && !req.thumbnailKey().isBlank()
                && !req.thumbnailKey().equals(c.getThumbnailKey())) {
            FileKeys.requireTeacherKey(req.thumbnailKey(), teacherId, "general", "thumbnails");
            if (!storage.exists(req.thumbnailKey())) throw ApiException.badRequest("error.invalid_file");
            c.setThumbnailKey(req.thumbnailKey());
        } else if (req.thumbnailKey() == null || req.thumbnailKey().isBlank()) {
            c.setThumbnailKey(null);
        }
        c.setTitle(req.title().trim());
        c.setDescription(req.description());
        c.setSubject(req.subject().trim());
        c.setGradeLevel(req.gradeLevel());
        c.setMedium(LocaleConfig.normalize(req.medium()));
        c.setScheduleText(req.scheduleText());
        c.setEnrollmentMode(req.enrollmentMode());
        c.setBillingType(req.billingType());
        c.setFee(fee);
        c.setMaxStudents(req.maxStudents());
    }

    @Transactional
    public ClassDto setStatus(UUID id, ClassStatus status) {
        ClassRoom c = access.requireOwningTeacher(id);
        if (status == ClassStatus.PUBLISHED && c.getStatus() == ClassStatus.ARCHIVED) {
            subscriptions.assertCanCreateClass(c.getTeacherId());
        }
        c.setStatus(status);
        audit.log("CLASS_STATUS_" + status, "Class", id.toString(), c.getTitle());
        return mapper.toDto(c);
    }

    /** Deletes a class that never had students; otherwise it must be archived so records are kept. */
    @Transactional
    public void delete(UUID id) {
        ClassRoom c = access.requireOwningTeacher(id);
        if (enrollments.countByClassId(id) > 0) throw ApiException.conflict("error.class_has_students");
        List<String> keys = new ArrayList<>();
        lessons.findByClassIdOrderByPositionAscCreatedAtAsc(id).forEach(l -> {
            if (l.getVideoKey() != null) keys.add(l.getVideoKey());
            if (l.getNotesKey() != null) keys.add(l.getNotesKey());
        });
        materials.findByClassIdOrderByCreatedAtDesc(id).forEach(m -> keys.add(m.getFileKey()));
        if (c.getThumbnailKey() != null) keys.add(c.getThumbnailKey());
        classes.delete(c);
        keys.forEach(storage::delete);
        audit.log("CLASS_DELETED", "Class", id.toString(), c.getTitle());
    }
}
