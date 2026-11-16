package com.nodemore.lms.storage;

import com.nodemore.lms.classroom.AccessService;
import com.nodemore.lms.classroom.ClassRoom;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.config.AppProperties;
import com.nodemore.lms.plan.SubscriptionService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

/**
 * Step 1 of every upload: validates who may upload what (type, size, class ownership/enrollment,
 * plan storage quota) and returns a short-lived URL the browser uploads to directly.
 * Step 2 is the normal create call (lesson, note, submission...) that references the returned key.
 */
@RestController
@RequiredArgsConstructor
public class UploadController {

    public enum Purpose { CLASS_THUMBNAIL, LESSON_VIDEO, MATERIAL, ASSIGNMENT_ATTACHMENT, SUBMISSION, PAYMENT_SLIP }

    private final StorageService storage;
    private final AccessService access;
    private final SubscriptionService subscriptions;
    private final AppProperties props;

    public record PresignRequest(@NotNull Purpose purpose, UUID classId, @NotBlank String fileName, @Min(1) long size) {}

    @PostMapping("/api/uploads/presign")
    public StorageService.UploadTicket presign(@Valid @RequestBody PresignRequest req) {
        UserPrincipal p = CurrentUser.get();
        String ext = FileKeys.extension(req.fileName());
        long mb = 1024L * 1024L;
        var s = props.getStorage();
        String key;
        long max;
        switch (req.purpose()) {
            case CLASS_THUMBNAIL -> {
                requireTeacher(p);
                check(ext, FileKeys.IMAGE);
                max = s.getMaxImageMb() * mb;
                key = FileKeys.teacherKey(p.id(), "general", "thumbnails", ext);
            }
            case LESSON_VIDEO -> {
                ClassRoom c = ownedClass(p, req.classId());
                check(ext, FileKeys.VIDEO);
                max = s.getMaxVideoMb() * mb;
                subscriptions.assertStorage(c.getTeacherId(), req.size());
                key = FileKeys.teacherKey(p.id(), c.getId(), "lessons", ext);
            }
            case MATERIAL -> {
                ClassRoom c = ownedClass(p, req.classId());
                check(ext, FileKeys.DOCUMENT);
                max = s.getMaxDocumentMb() * mb;
                subscriptions.assertStorage(c.getTeacherId(), req.size());
                key = FileKeys.teacherKey(p.id(), c.getId(), "materials", ext);
            }
            case ASSIGNMENT_ATTACHMENT -> {
                ClassRoom c = ownedClass(p, req.classId());
                check(ext, FileKeys.DOCUMENT);
                max = s.getMaxDocumentMb() * mb;
                key = FileKeys.teacherKey(p.id(), c.getId(), "assignments", ext);
            }
            case SUBMISSION -> {
                if (!p.isStudent() || req.classId() == null) throw ApiException.forbidden();
                access.requireContent(req.classId());
                check(ext, FileKeys.DOCUMENT);
                max = s.getMaxDocumentMb() * mb;
                key = FileKeys.studentKey(p.id(), req.classId(), "submissions", ext);
            }
            case PAYMENT_SLIP -> {
                if (!p.isStudent() || req.classId() == null) throw ApiException.forbidden();
                access.requireMember(req.classId());
                check(ext, FileKeys.SLIP);
                max = s.getMaxImageMb() * 2 * mb;
                key = FileKeys.studentKey(p.id(), req.classId(), "slips", ext);
            }
            default -> throw ApiException.badRequest("error.bad_request");
        }
        if (req.size() > max) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "error.file_too_large");
        return storage.presignUpload(key, FileKeys.contentTypeFor(req.fileName()), max);
    }

    private static void requireTeacher(UserPrincipal p) {
        if (!p.isTeacher()) throw ApiException.forbidden();
    }

    private ClassRoom ownedClass(UserPrincipal p, UUID classId) {
        requireTeacher(p);
        if (classId == null) throw ApiException.badRequest("error.bad_request");
        return access.requireOwningTeacher(classId);
    }

    private static void check(String ext, Set<String> allowed) {
        if (!allowed.contains(ext)) throw ApiException.badRequest("error.file_type_not_allowed");
    }
}
