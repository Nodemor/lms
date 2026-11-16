package com.nodemore.lms.lesson;

import com.nodemore.lms.classroom.AccessService;
import com.nodemore.lms.classroom.ClassMapper;
import com.nodemore.lms.classroom.ClassRoom;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.plan.SubscriptionService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.security.UserPrincipal;
import com.nodemore.lms.storage.FileKeys;
import com.nodemore.lms.storage.StorageService;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Recorded lessons. A lesson is either an uploaded video (private storage, signed URLs) or an
 * unlisted YouTube link, and may carry a lecture-notes file shown with the lesson.
 */
@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessons;
    private final LessonProgressRepository progress;
    private final EnrollmentRepository enrollments;
    private final AccessService access;
    private final StorageService storage;
    private final SubscriptionService subscriptions;
    private final NotificationService notifications;

    public record LessonRequest(@NotBlank @Size(max = 200) String title, @Size(max = 10000) String description,
                                Lesson.SourceType sourceType, String videoKey, @Size(max = 500) String youtubeUrl,
                                @Min(0) Integer durationSeconds, boolean published, Instant availableFrom,
                                String notesKey, @Size(max = 255) String notesName, Boolean removeNotes) {}

    public record LessonDto(UUID id, UUID classId, String title, String description, Lesson.SourceType sourceType,
                            String youtubeId, String thumbnailUrl, Integer durationSeconds, long sizeBytes, int position,
                            boolean published, Instant availableFrom, boolean hasNotes, String notesName,
                            Integer lastPositionSeconds, Boolean completed, Instant createdAt) {}

    public record ProgressRequest(@Min(0) int positionSeconds, @Min(0) int durationSeconds) {}

    @Transactional
    public LessonDto create(UUID classId, LessonRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        Lesson l = new Lesson();
        l.setClassId(classId);
        l.setTeacherId(c.getTeacherId());
        Lesson.SourceType type = req.sourceType() == null ? Lesson.SourceType.UPLOAD : req.sourceType();
        l.setSourceType(type);
        if (type == Lesson.SourceType.YOUTUBE) {
            l.setYoutubeId(requireYoutubeId(req.youtubeUrl()));
        } else {
            if (req.videoKey() == null || req.videoKey().isBlank()) throw ApiException.badRequest("error.invalid_file");
            FileKeys.requireTeacherKey(req.videoKey(), c.getTeacherId(), classId, "lessons");
            long size = storage.size(req.videoKey());
            if (size < 0) throw ApiException.badRequest("error.invalid_file");
            subscriptions.assertStorage(c.getTeacherId(), size);
            l.setVideoKey(req.videoKey());
            l.setContentType(FileKeys.contentTypeFor(req.videoKey()));
            l.setSizeBytes(size);
        }
        l.setPosition(lessons.maxPosition(classId) + 1);
        apply(l, req);
        applyNotes(l, req, c);
        lessons.save(l);
        if (l.isVisibleToStudents()) announce(c, l);
        return dto(l, null);
    }

    @Transactional
    public LessonDto update(UUID classId, UUID lessonId, LessonRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        Lesson l = owned(classId, lessonId);
        boolean wasVisible = l.isVisibleToStudents();
        // A YouTube lesson's link can be replaced; switching an upload to YouTube is also allowed.
        if (req.youtubeUrl() != null && !req.youtubeUrl().isBlank() && req.sourceType() == Lesson.SourceType.YOUTUBE) {
            String id = requireYoutubeId(req.youtubeUrl());
            if (l.getSourceType() == Lesson.SourceType.UPLOAD && l.getVideoKey() != null) {
                storage.delete(l.getVideoKey());
                l.setVideoKey(null);
                l.setSizeBytes(0);
                l.setContentType(null);
            }
            if (!id.equals(l.getYoutubeId())) l.setDurationSeconds(null);
            l.setSourceType(Lesson.SourceType.YOUTUBE);
            l.setYoutubeId(id);
        }
        apply(l, req);
        applyNotes(l, req, c);
        if (!wasVisible && l.isVisibleToStudents()) announce(c, l);
        return dto(l, null);
    }

    private static String requireYoutubeId(String url) {
        String id = YouTube.extractId(url);
        if (id == null) throw ApiException.badRequest("error.youtube_invalid");
        return id;
    }

    private void apply(Lesson l, LessonRequest req) {
        l.setTitle(req.title().trim());
        l.setDescription(req.description());
        if (req.durationSeconds() != null) l.setDurationSeconds(req.durationSeconds());
        l.setPublished(req.published());
        l.setAvailableFrom(req.availableFrom());
    }

    /** Attaches, replaces or removes the lecture-notes file of a lesson. */
    private void applyNotes(Lesson l, LessonRequest req, ClassRoom c) {
        boolean newNotes = req.notesKey() != null && !req.notesKey().isBlank() && !req.notesKey().equals(l.getNotesKey());
        if (newNotes) {
            FileKeys.requireTeacherKey(req.notesKey(), c.getTeacherId(), c.getId(), "materials");
            long size = storage.size(req.notesKey());
            if (size < 0) throw ApiException.badRequest("error.invalid_file");
            subscriptions.assertStorage(c.getTeacherId(), size);
            if (l.getNotesKey() != null) storage.delete(l.getNotesKey());
            l.setNotesKey(req.notesKey());
            l.setNotesName(FileKeys.cleanName(req.notesName()));
            l.setNotesSizeBytes(size);
        } else if (Boolean.TRUE.equals(req.removeNotes()) && l.getNotesKey() != null) {
            storage.delete(l.getNotesKey());
            l.setNotesKey(null);
            l.setNotesName(null);
            l.setNotesSizeBytes(0);
        }
    }

    private void announce(ClassRoom c, Lesson l) {
        notifications.notifyMany(enrollments.studentIds(c.getId(), EnrollmentStatus.ACTIVE), "NEW_LESSON",
                Map.of("className", c.getTitle(), "title", l.getTitle()),
                "/student/classes/" + c.getId() + "?tab=lessons", true);
    }

    @Transactional
    public void reorder(UUID classId, List<UUID> orderedIds) {
        access.requireOwningTeacher(classId);
        Map<UUID, Lesson> byId = ClassMapper.index(lessons.findByClassIdOrderByPositionAscCreatedAtAsc(classId), Lesson::getId);
        int pos = 1;
        for (UUID id : orderedIds) {
            Lesson l = byId.get(id);
            if (l != null) l.setPosition(pos++);
        }
    }

    @Transactional
    public void delete(UUID classId, UUID lessonId) {
        access.requireOwningTeacher(classId);
        Lesson l = owned(classId, lessonId);
        lessons.delete(l);
        if (l.getVideoKey() != null) storage.delete(l.getVideoKey());
        if (l.getNotesKey() != null) storage.delete(l.getNotesKey());
    }

    private Lesson owned(UUID classId, UUID lessonId) {
        return lessons.findById(lessonId).filter(l -> l.getClassId().equals(classId)).orElseThrow(ApiException::notFound);
    }

    @Transactional(readOnly = true)
    public List<LessonDto> list(UUID classId) {
        access.requireContent(classId);
        UserPrincipal p = CurrentUser.get();
        List<Lesson> all = lessons.findByClassIdOrderByPositionAscCreatedAtAsc(classId);
        if (!p.isStudent()) return all.stream().map(l -> dto(l, null)).toList();
        Map<UUID, LessonProgress> prog = ClassMapper.index(progress.findByClassIdAndStudentId(classId, p.id()), LessonProgress::getLessonId);
        return all.stream().filter(Lesson::isVisibleToStudents).map(l -> dto(l, prog.get(l.getId()))).toList();
    }

    private Lesson viewable(UUID lessonId) {
        Lesson l = lessons.findById(lessonId).orElseThrow(ApiException::notFound);
        access.requireContent(l.getClassId());
        if (CurrentUser.get().isStudent() && !l.isVisibleToStudents()) throw ApiException.notFound();
        return l;
    }

    /** Uploaded video: short-lived signed URL. YouTube lesson: the video id for the embedded player. */
    @Transactional(readOnly = true)
    public Map<String, Object> stream(UUID lessonId) {
        Lesson l = viewable(lessonId);
        if (l.getSourceType() == Lesson.SourceType.YOUTUBE) {
            return Map.of("type", "YOUTUBE", "youtubeId", l.getYoutubeId());
        }
        return Map.of("type", "UPLOAD", "url", storage.signedUrl(l.getVideoKey(), Duration.ofHours(4), null, false),
                "contentType", l.getContentType() == null ? "video/mp4" : l.getContentType());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> notesUrl(UUID lessonId, boolean download) {
        Lesson l = viewable(lessonId);
        if (l.getNotesKey() == null) throw ApiException.notFound();
        return Map.of("url", storage.signedUrl(l.getNotesKey(), Duration.ofMinutes(30), l.getNotesName(), download));
    }

    @Transactional
    public Map<String, Object> saveProgress(UUID lessonId, ProgressRequest req) {
        UserPrincipal p = CurrentUser.get();
        if (!p.isStudent()) return Map.of("ok", true);
        Lesson l = lessons.findById(lessonId).orElseThrow(ApiException::notFound);
        access.requireContent(l.getClassId());
        LessonProgress lp = progress.findByLessonIdAndStudentId(lessonId, p.id()).orElseGet(() -> {
            LessonProgress n = new LessonProgress();
            n.setLessonId(lessonId);
            n.setStudentId(p.id());
            n.setClassId(l.getClassId());
            return n;
        });
        int duration = req.durationSeconds() > 0 ? req.durationSeconds()
                : (l.getDurationSeconds() == null ? 0 : l.getDurationSeconds());
        int pos = duration > 0 ? Math.min(req.positionSeconds(), duration) : req.positionSeconds();
        lp.setLastPositionSeconds(pos);
        lp.setWatchedSeconds(Math.max(lp.getWatchedSeconds(), pos));
        if (duration > 0 && lp.getWatchedSeconds() >= duration * 0.9) lp.setCompleted(true);
        progress.save(lp);
        if ((l.getDurationSeconds() == null || l.getDurationSeconds() == 0) && req.durationSeconds() > 0) {
            l.setDurationSeconds(req.durationSeconds());
        }
        return Map.of("completed", lp.isCompleted());
    }

    private static LessonDto dto(Lesson l, LessonProgress p) {
        String thumb = l.getSourceType() == Lesson.SourceType.YOUTUBE ? YouTube.thumbnail(l.getYoutubeId()) : null;
        return new LessonDto(l.getId(), l.getClassId(), l.getTitle(), l.getDescription(), l.getSourceType(),
                l.getYoutubeId(), thumb, l.getDurationSeconds(), l.getSizeBytes(), l.getPosition(), l.isPublished(),
                l.getAvailableFrom(), l.getNotesKey() != null, l.getNotesName(),
                p == null ? null : p.getLastPositionSeconds(), p == null ? null : p.isCompleted(), l.getCreatedAt());
    }
}
