package com.nodemore.lms.lesson;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LessonController {

    private final LessonService service;

    @GetMapping("/api/classes/{classId}/lessons")
    public List<LessonService.LessonDto> list(@PathVariable UUID classId) { return service.list(classId); }

    @PostMapping("/api/teacher/classes/{classId}/lessons")
    public LessonService.LessonDto create(@PathVariable UUID classId, @Valid @RequestBody LessonService.LessonRequest req) {
        return service.create(classId, req);
    }

    @PutMapping("/api/teacher/classes/{classId}/lessons/{lessonId}")
    public LessonService.LessonDto update(@PathVariable UUID classId, @PathVariable UUID lessonId,
                                          @Valid @RequestBody LessonService.LessonRequest req) {
        return service.update(classId, lessonId, req);
    }

    @PutMapping("/api/teacher/classes/{classId}/lessons/order")
    public Map<String, Object> reorder(@PathVariable UUID classId, @RequestBody List<UUID> ids) {
        service.reorder(classId, ids);
        return Map.of("ok", true);
    }

    @DeleteMapping("/api/teacher/classes/{classId}/lessons/{lessonId}")
    public Map<String, Object> delete(@PathVariable UUID classId, @PathVariable UUID lessonId) {
        service.delete(classId, lessonId);
        return Map.of("ok", true);
    }

    @GetMapping("/api/lessons/{lessonId}/stream")
    public Map<String, Object> stream(@PathVariable UUID lessonId) { return service.stream(lessonId); }

    @GetMapping("/api/lessons/{lessonId}/notes")
    public Map<String, Object> notes(@PathVariable UUID lessonId, @RequestParam(defaultValue = "false") boolean download) {
        return service.notesUrl(lessonId, download);
    }

    @PostMapping("/api/lessons/{lessonId}/progress")
    public Map<String, Object> progress(@PathVariable UUID lessonId, @Valid @RequestBody LessonService.ProgressRequest req) {
        return service.saveProgress(lessonId, req);
    }
}
