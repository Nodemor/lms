package com.nodemore.lms.announcement;

import com.nodemore.lms.classroom.AccessService;
import com.nodemore.lms.classroom.ClassRoom;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.notification.NotificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Teacher announcements to a class. Visible to every active member (also students who have not paid
 * yet, so reminders like "fees due" reach them).
 */
@RestController
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementRepository repo;
    private final AccessService access;
    private final EnrollmentRepository enrollments;
    private final NotificationService notifications;

    public record AnnouncementRequest(@NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 10000) String body,
                                      boolean pinned, Boolean notifyStudents) {}

    public record AnnouncementDto(UUID id, UUID classId, String title, String body, boolean pinned, Instant createdAt,
                                  Instant updatedAt) {
        static AnnouncementDto of(Announcement a) {
            return new AnnouncementDto(a.getId(), a.getClassId(), a.getTitle(), a.getBody(), a.isPinned(),
                    a.getCreatedAt(), a.getUpdatedAt());
        }
    }

    @GetMapping("/api/classes/{classId}/announcements")
    @Transactional(readOnly = true)
    public List<AnnouncementDto> list(@PathVariable UUID classId) {
        access.requireMember(classId);
        return repo.findTop100ByClassIdOrderByPinnedDescCreatedAtDesc(classId).stream().map(AnnouncementDto::of).toList();
    }

    @PostMapping("/api/teacher/classes/{classId}/announcements")
    @Transactional
    public AnnouncementDto create(@PathVariable UUID classId, @Valid @RequestBody AnnouncementRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        Announcement a = new Announcement();
        a.setClassId(classId);
        a.setTeacherId(c.getTeacherId());
        a.setTitle(req.title().trim());
        a.setBody(req.body().trim());
        a.setPinned(req.pinned());
        repo.save(a);
        if (!Boolean.FALSE.equals(req.notifyStudents())) {
            notifications.notifyMany(enrollments.studentIds(classId, EnrollmentStatus.ACTIVE), "ANNOUNCEMENT",
                    Map.of("className", c.getTitle(), "title", a.getTitle(), "body", a.getBody()),
                    "/student/classes/" + classId + "?tab=announcements", true);
        }
        return AnnouncementDto.of(a);
    }

    @PutMapping("/api/teacher/classes/{classId}/announcements/{id}")
    @Transactional
    public AnnouncementDto update(@PathVariable UUID classId, @PathVariable UUID id, @Valid @RequestBody AnnouncementRequest req) {
        access.requireOwningTeacher(classId);
        Announcement a = owned(classId, id);
        a.setTitle(req.title().trim());
        a.setBody(req.body().trim());
        a.setPinned(req.pinned());
        return AnnouncementDto.of(a);
    }

    @DeleteMapping("/api/teacher/classes/{classId}/announcements/{id}")
    @Transactional
    public Map<String, Object> delete(@PathVariable UUID classId, @PathVariable UUID id) {
        access.requireOwningTeacher(classId);
        repo.delete(owned(classId, id));
        return Map.of("ok", true);
    }

    private Announcement owned(UUID classId, UUID id) {
        return repo.findById(id).filter(a -> a.getClassId().equals(classId)).orElseThrow(ApiException::notFound);
    }
}
