package com.nodemore.lms.enrollment;

import com.nodemore.lms.common.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService service;

    public record AddStudentRequest(@NotBlank @Email String email) {}

    @PostMapping("/api/student/classes/{classId}/enroll")
    public EnrollmentService.MyEnrollmentDto enroll(@PathVariable UUID classId) {
        return service.enroll(classId);
    }

    @PostMapping("/api/student/classes/{classId}/cancel")
    public Map<String, Object> cancel(@PathVariable UUID classId) {
        service.cancel(classId);
        return Map.of("ok", true);
    }

    @GetMapping("/api/student/enrollments")
    public List<EnrollmentService.MyEnrollmentDto> mine() {
        return service.mine();
    }

    @GetMapping("/api/teacher/classes/{classId}/enrollments")
    public PageResponse<EnrollmentService.EnrollmentDto> list(@PathVariable UUID classId,
                                                              @RequestParam(required = false) EnrollmentStatus status,
                                                              @RequestParam(defaultValue = "") String q,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        return service.listForClass(classId, status, q, page, size);
    }

    @PostMapping("/api/teacher/classes/{classId}/enrollments/{enrollmentId}/{action}")
    public Map<String, Object> decide(@PathVariable UUID classId, @PathVariable UUID enrollmentId, @PathVariable String action) {
        service.decide(classId, enrollmentId, action);
        return Map.of("ok", true);
    }

    @PostMapping("/api/teacher/classes/{classId}/enrollments")
    public Map<String, Object> add(@PathVariable UUID classId, @Valid @RequestBody AddStudentRequest req) {
        service.addByEmail(classId, req.email());
        return Map.of("ok", true);
    }

    @GetMapping("/api/teacher/students")
    public List<Map<String, Object>> allStudents() {
        return service.allStudentsOfTeacher();
    }
}
