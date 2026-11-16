package com.nodemore.lms.assignment;

import com.nodemore.lms.classroom.AccessService;
import com.nodemore.lms.classroom.ClassMapper;
import com.nodemore.lms.classroom.ClassRoom;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.DateFormats;
import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.security.UserPrincipal;
import com.nodemore.lms.storage.FileKeys;
import com.nodemore.lms.storage.StorageService;
import com.nodemore.lms.user.User;
import com.nodemore.lms.user.UserRepository;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignments;
    private final SubmissionRepository submissions;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AccessService access;
    private final StorageService storage;
    private final NotificationService notifications;
    private final DateFormats dates;

    public record AssignmentRequest(@NotBlank @Size(max = 200) String title, @Size(max = 20000) String instructions,
                                    @NotNull Instant dueAt, @Min(1) @Max(1000) int maxMarks, String attachmentKey,
                                    String attachmentName, boolean allowLate, boolean published) {}

    /** keepFile=true keeps the file of the previous submission when re-submitting without a new upload. */
    public record SubmitRequest(@Size(max = 20000) String textAnswer, String fileKey, String fileName, Boolean keepFile) {}

    public record GradeRequest(@NotNull @Min(0) Integer marks, @Size(max = 5000) String feedback) {}

    public record SubmissionDto(UUID id, UUID assignmentId, UUID studentId, String studentName, String textAnswer,
                                String fileName, boolean hasFile, int version, Instant submittedAt, boolean late,
                                Submission.Status status, Integer marks, String feedback, Instant gradedAt) {}

    public record AssignmentDto(UUID id, UUID classId, String title, String instructions, Instant dueAt, int maxMarks,
                                String attachmentName, boolean hasAttachment, String attachmentKey, boolean allowLate,
                                boolean published, Long submissionCount, SubmissionDto mySubmission, Instant createdAt) {}

    // ------------------------------------------------------------- teacher
    @Transactional
    public AssignmentDto create(UUID classId, AssignmentRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        Assignment a = new Assignment();
        a.setClassId(classId);
        a.setTeacherId(c.getTeacherId());
        apply(a, req, c);
        assignments.save(a);
        if (a.isPublished()) announce(c, a);
        return dto(a, 0L, null);
    }

    @Transactional
    public AssignmentDto update(UUID classId, UUID id, AssignmentRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        Assignment a = owned(classId, id);
        boolean wasPublished = a.isPublished();
        Instant oldDue = a.getDueAt();
        apply(a, req, c);
        if (!oldDue.equals(a.getDueAt())) a.setReminderSent(false);
        if (!wasPublished && a.isPublished()) announce(c, a);
        return dto(a, null, null);
    }

    private void apply(Assignment a, AssignmentRequest req, ClassRoom c) {
        a.setTitle(req.title().trim());
        a.setInstructions(req.instructions());
        a.setDueAt(req.dueAt());
        a.setMaxMarks(req.maxMarks());
        a.setAllowLate(req.allowLate());
        a.setPublished(req.published());
        if (req.attachmentKey() != null && !req.attachmentKey().isBlank()) {
            if (!req.attachmentKey().equals(a.getAttachmentKey())) {
                FileKeys.requireTeacherKey(req.attachmentKey(), c.getTeacherId(), c.getId(), "assignments");
                if (!storage.exists(req.attachmentKey())) throw ApiException.badRequest("error.invalid_file");
                if (a.getAttachmentKey() != null) storage.delete(a.getAttachmentKey());
                a.setAttachmentKey(req.attachmentKey());
                a.setAttachmentName(FileKeys.cleanName(req.attachmentName()));
            }
        } else if (a.getAttachmentKey() != null) {
            storage.delete(a.getAttachmentKey());
            a.setAttachmentKey(null);
            a.setAttachmentName(null);
        }
    }

    private void announce(ClassRoom c, Assignment a) {
        notifications.notifyMany(enrollments.studentIds(c.getId(), EnrollmentStatus.ACTIVE), "NEW_ASSIGNMENT",
                Map.of("className", c.getTitle(), "title", a.getTitle(), "due", dates.format(a.getDueAt())),
                "/student/classes/" + c.getId() + "?tab=assignments", true);
    }

    @Transactional
    public void delete(UUID classId, UUID id) {
        access.requireOwningTeacher(classId);
        Assignment a = owned(classId, id);
        List<String> keys = new ArrayList<>();
        if (a.getAttachmentKey() != null) keys.add(a.getAttachmentKey());
        submissions.findByAssignmentIdOrderBySubmittedAtDesc(id).forEach(s -> { if (s.getFileKey() != null) keys.add(s.getFileKey()); });
        assignments.delete(a);
        keys.forEach(storage::delete);
    }

    private Assignment owned(UUID classId, UUID id) {
        return assignments.findById(id).filter(a -> a.getClassId().equals(classId)).orElseThrow(ApiException::notFound);
    }

    @Transactional(readOnly = true)
    public List<SubmissionDto> submissionsFor(UUID assignmentId) {
        Assignment a = assignments.findById(assignmentId).orElseThrow(ApiException::notFound);
        access.requireOwner(a.getClassId());
        List<Submission> list = submissions.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId);
        Map<UUID, User> us = ClassMapper.index(users.findAllById(list.stream().map(Submission::getStudentId).toList()), User::getId);
        return list.stream().map(s -> sdto(s, us.containsKey(s.getStudentId()) ? us.get(s.getStudentId()).getFullName() : "")).toList();
    }

    @Transactional
    public SubmissionDto grade(UUID submissionId, GradeRequest req) {
        Submission s = submissions.findById(submissionId).orElseThrow(ApiException::notFound);
        access.requireOwningTeacher(s.getClassId());
        Assignment a = assignments.findById(s.getAssignmentId()).orElseThrow(ApiException::notFound);
        if (req.marks() > a.getMaxMarks()) throw ApiException.badRequest("error.marks_too_high", a.getMaxMarks());
        s.setMarks(req.marks());
        s.setFeedback(req.feedback());
        s.setStatus(Submission.Status.GRADED);
        s.setGradedAt(Instant.now());
        notifications.notify(s.getStudentId(), "ASSIGNMENT_GRADED",
                Map.of("title", a.getTitle(), "marks", req.marks(), "max", a.getMaxMarks()),
                "/student/classes/" + a.getClassId() + "?tab=assignments", true);
        return sdto(s, users.findById(s.getStudentId()).map(User::getFullName).orElse(""));
    }

    // ------------------------------------------------------------- shared listing
    @Transactional(readOnly = true)
    public List<AssignmentDto> list(UUID classId) {
        access.requireContent(classId);
        UserPrincipal p = CurrentUser.get();
        List<Assignment> all = assignments.findByClassIdOrderByDueAtDesc(classId);
        if (p.isStudent()) {
            Map<UUID, Submission> mine = ClassMapper.index(submissions.findByClassIdAndStudentId(classId, p.id()), Submission::getAssignmentId);
            return all.stream().filter(Assignment::isPublished)
                    .map(a -> dto(a, null, mine.containsKey(a.getId()) ? sdto(mine.get(a.getId()), null) : null)).toList();
        }
        Map<UUID, Long> counts = new HashMap<>();
        if (!all.isEmpty()) {
            for (Object[] r : submissions.countByAssignments(all.stream().map(Assignment::getId).toList())) {
                counts.put((UUID) r[0], ((Number) r[1]).longValue());
            }
        }
        return all.stream().map(a -> dto(a, counts.getOrDefault(a.getId(), 0L), null)).toList();
    }

    // ------------------------------------------------------------- student
    @Transactional
    public SubmissionDto submit(UUID assignmentId, SubmitRequest req) {
        UserPrincipal p = CurrentUser.get();
        if (!p.isStudent()) throw ApiException.forbidden();
        Assignment a = assignments.findById(assignmentId).filter(Assignment::isPublished).orElseThrow(ApiException::notFound);
        access.requireContent(a.getClassId());
        Instant now = Instant.now();
        boolean late = now.isAfter(a.getDueAt());
        if (late && !a.isAllowLate()) throw ApiException.conflict("error.assignment_closed");
        boolean hasText = req.textAnswer() != null && !req.textAnswer().isBlank();
        boolean newFile = req.fileKey() != null && !req.fileKey().isBlank();

        Submission s = submissions.findByAssignmentIdAndStudentId(assignmentId, p.id()).orElse(null);
        if (s != null && s.getStatus() == Submission.Status.GRADED) throw ApiException.conflict("error.already_graded");
        boolean keep = !newFile && Boolean.TRUE.equals(req.keepFile()) && s != null && s.getFileKey() != null;
        if (!hasText && !newFile && !keep) throw ApiException.badRequest("error.submission_empty");
        if (s == null) {
            s = new Submission();
            s.setAssignmentId(assignmentId);
            s.setClassId(a.getClassId());
            s.setStudentId(p.id());
            s.setTeacherId(a.getTeacherId());
        } else {
            s.setVersion(s.getVersion() + 1);
        }
        if (newFile && !req.fileKey().equals(s.getFileKey())) {
            FileKeys.requireStudentKey(req.fileKey(), p.id(), a.getClassId(), "submissions");
            if (!storage.exists(req.fileKey())) throw ApiException.badRequest("error.invalid_file");
            if (s.getFileKey() != null) storage.delete(s.getFileKey());
            s.setFileKey(req.fileKey());
            s.setFileName(FileKeys.cleanName(req.fileName()));
        } else if (!newFile && !keep && s.getFileKey() != null) {
            storage.delete(s.getFileKey());
            s.setFileKey(null);
            s.setFileName(null);
        }
        s.setTextAnswer(req.textAnswer());
        s.setSubmittedAt(now);
        s.setLate(late);
        s.setStatus(Submission.Status.SUBMITTED);
        submissions.save(s);
        String studentName = users.findById(p.id()).map(User::getFullName).orElse("");
        notifications.notify(a.getTeacherId(), "ASSIGNMENT_SUBMITTED", Map.of("title", a.getTitle(), "studentName", studentName),
                "/teacher/classes/" + a.getClassId() + "?tab=assignments", false);
        return sdto(s, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> attachmentUrl(UUID assignmentId) {
        Assignment a = assignments.findById(assignmentId).orElseThrow(ApiException::notFound);
        access.requireContent(a.getClassId());
        if (a.getAttachmentKey() == null) throw ApiException.notFound();
        return Map.of("url", storage.signedUrl(a.getAttachmentKey(), Duration.ofMinutes(30), a.getAttachmentName(), true));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> submissionFileUrl(UUID submissionId) {
        Submission s = submissions.findById(submissionId).orElseThrow(ApiException::notFound);
        UserPrincipal p = CurrentUser.get();
        if (!(p.isStudent() && s.getStudentId().equals(p.id()))) access.requireOwner(s.getClassId());
        if (s.getFileKey() == null) throw ApiException.notFound();
        return Map.of("url", storage.signedUrl(s.getFileKey(), Duration.ofMinutes(30), s.getFileName(), true));
    }

    private static AssignmentDto dto(Assignment a, Long count, SubmissionDto mine) {
        return new AssignmentDto(a.getId(), a.getClassId(), a.getTitle(), a.getInstructions(), a.getDueAt(), a.getMaxMarks(),
                a.getAttachmentName(), a.getAttachmentKey() != null, a.getAttachmentKey(), a.isAllowLate(), a.isPublished(),
                count, mine, a.getCreatedAt());
    }

    private static SubmissionDto sdto(Submission s, String name) {
        return new SubmissionDto(s.getId(), s.getAssignmentId(), s.getStudentId(), name, s.getTextAnswer(), s.getFileName(),
                s.getFileKey() != null, s.getVersion(), s.getSubmittedAt(), s.isLate(), s.getStatus(), s.getMarks(),
                s.getFeedback(), s.getGradedAt());
    }
}
