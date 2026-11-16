package com.nodemore.lms.classroom;

import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.PageResponse;
import com.nodemore.lms.common.Pages;
import com.nodemore.lms.enrollment.Enrollment;
import com.nodemore.lms.payment.PaymentAccessService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.security.UserPrincipal;
import com.nodemore.lms.user.TeacherProfileRepository;
import com.nodemore.lms.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ClassController {

    private final ClassService service;
    private final ClassRoomRepository classes;
    private final ClassMapper mapper;
    private final AccessService access;
    private final PaymentAccessService paymentAccess;
    private final UserRepository users;
    private final TeacherProfileRepository teacherProfiles;

    public record StatusRequest(@NotNull ClassStatus status) {}

    // ------------------------------------------------------------- teacher
    @GetMapping("/api/teacher/classes")
    public List<ClassDto> mine() { return service.mine(); }

    @PostMapping("/api/teacher/classes")
    public ClassDto create(@Valid @RequestBody ClassService.ClassRequest req) { return service.create(req); }

    @GetMapping("/api/teacher/classes/{id}")
    public ClassDto get(@PathVariable UUID id) { return service.get(id); }

    @PutMapping("/api/teacher/classes/{id}")
    public ClassDto update(@PathVariable UUID id, @Valid @RequestBody ClassService.ClassRequest req) {
        return service.update(id, req);
    }

    @PostMapping("/api/teacher/classes/{id}/status")
    public ClassDto status(@PathVariable UUID id, @Valid @RequestBody StatusRequest req) {
        return service.setStatus(id, req.status());
    }

    @DeleteMapping("/api/teacher/classes/{id}")
    public Map<String, Object> delete(@PathVariable UUID id) {
        service.delete(id);
        return Map.of("ok", true);
    }

    // ------------------------------------------------------------- public catalogue
    @GetMapping("/api/public/classes")
    @Transactional(readOnly = true)
    public PageResponse<ClassDto> browse(@RequestParam(defaultValue = "") String q,
                                         @RequestParam(defaultValue = "") String subject,
                                         @RequestParam(defaultValue = "") String grade,
                                         @RequestParam(defaultValue = "") String medium,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "12") int size) {
        Page<ClassRoom> p = classes.searchPublic(ClassStatus.PUBLISHED, q.trim(), subject.trim(), grade.trim(),
                medium.trim(), Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<ClassDto> dtos = mapper.toDtos(p.getContent());
        return new PageResponse<>(dtos, p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @GetMapping("/api/public/subjects")
    public List<String> subjects() {
        return classes.distinctSubjects(ClassStatus.PUBLISHED);
    }

    @GetMapping("/api/public/classes/{id}")
    @Transactional(readOnly = true)
    public Map<String, Object> publicDetail(@PathVariable UUID id) {
        ClassRoom c = classes.findById(id).filter(x -> x.getStatus() == ClassStatus.PUBLISHED)
                .orElseThrow(ApiException::notFound);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("class", mapper.toDto(c));
        Map<String, Object> teacher = new LinkedHashMap<>();
        users.findById(c.getTeacherId()).ifPresent(u -> teacher.put("name", u.getFullName()));
        teacherProfiles.findByUserId(c.getTeacherId()).ifPresent(p -> {
            teacher.put("headline", p.getHeadline());
            teacher.put("bio", p.getBio());
            teacher.put("qualifications", p.getQualifications());
            teacher.put("subjects", p.getSubjects());
        });
        out.put("teacher", teacher);
        return out;
    }

    // ------------------------------------------------------------- member view (student / owner)
    @GetMapping("/api/classes/{id}")
    @Transactional(readOnly = true)
    public Map<String, Object> memberView(@PathVariable UUID id) {
        ClassRoom c = access.requireMember(id);
        UserPrincipal p = CurrentUser.get();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("class", mapper.toDto(c));
        if (p.isStudent()) {
            Enrollment e = access.activeEnrollment(id, p.id());
            out.put("enrollmentId", e == null ? null : e.getId());
            boolean paid = paymentAccess.hasPaidAccess(c, p.id());
            out.put("hasContentAccess", paid);
            out.put("currentPeriod", paymentAccess.currentPeriod());
        } else {
            out.put("hasContentAccess", true);
        }
        return out;
    }
}
