package com.nodemore.lms.assignment;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService service;

    @GetMapping("/api/classes/{classId}/assignments")
    public List<AssignmentService.AssignmentDto> list(@PathVariable UUID classId) { return service.list(classId); }

    @PostMapping("/api/teacher/classes/{classId}/assignments")
    public AssignmentService.AssignmentDto create(@PathVariable UUID classId, @Valid @RequestBody AssignmentService.AssignmentRequest req) {
        return service.create(classId, req);
    }

    @PutMapping("/api/teacher/classes/{classId}/assignments/{id}")
    public AssignmentService.AssignmentDto update(@PathVariable UUID classId, @PathVariable UUID id,
                                                  @Valid @RequestBody AssignmentService.AssignmentRequest req) {
        return service.update(classId, id, req);
    }

    @DeleteMapping("/api/teacher/classes/{classId}/assignments/{id}")
    public Map<String, Object> delete(@PathVariable UUID classId, @PathVariable UUID id) {
        service.delete(classId, id);
        return Map.of("ok", true);
    }

    @GetMapping("/api/teacher/assignments/{id}/submissions")
    public List<AssignmentService.SubmissionDto> submissions(@PathVariable UUID id) { return service.submissionsFor(id); }

    @PostMapping("/api/teacher/submissions/{id}/grade")
    public AssignmentService.SubmissionDto grade(@PathVariable UUID id, @Valid @RequestBody AssignmentService.GradeRequest req) {
        return service.grade(id, req);
    }

    @PostMapping("/api/student/assignments/{id}/submit")
    public AssignmentService.SubmissionDto submit(@PathVariable UUID id, @Valid @RequestBody AssignmentService.SubmitRequest req) {
        return service.submit(id, req);
    }

    @GetMapping("/api/assignments/{id}/attachment")
    public Map<String, Object> attachment(@PathVariable UUID id) { return service.attachmentUrl(id); }

    @GetMapping("/api/submissions/{id}/file")
    public Map<String, Object> submissionFile(@PathVariable UUID id) { return service.submissionFileUrl(id); }
}
