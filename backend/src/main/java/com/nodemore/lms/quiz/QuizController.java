package com.nodemore.lms.quiz;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class QuizController {

    private final QuizService service;

    @GetMapping("/api/classes/{classId}/quizzes")
    public List<QuizService.QuizDto> list(@PathVariable UUID classId) { return service.list(classId); }

    @PostMapping("/api/teacher/classes/{classId}/quizzes")
    public QuizService.QuizDto create(@PathVariable UUID classId, @Valid @RequestBody QuizService.QuizRequest req) {
        return service.create(classId, req);
    }

    @PutMapping("/api/teacher/classes/{classId}/quizzes/{quizId}")
    public QuizService.QuizDto update(@PathVariable UUID classId, @PathVariable UUID quizId,
                                      @Valid @RequestBody QuizService.QuizRequest req) {
        return service.update(classId, quizId, req);
    }

    @DeleteMapping("/api/teacher/classes/{classId}/quizzes/{quizId}")
    public Map<String, Object> delete(@PathVariable UUID classId, @PathVariable UUID quizId) {
        service.delete(classId, quizId);
        return Map.of("ok", true);
    }

    @GetMapping("/api/teacher/quizzes/{quizId}")
    public QuizService.QuizDto get(@PathVariable UUID quizId) { return service.getForTeacher(quizId); }

    @GetMapping("/api/teacher/quizzes/{quizId}/results")
    public List<QuizService.AttemptDto> results(@PathVariable UUID quizId) { return service.results(quizId); }

    @PostMapping("/api/student/quizzes/{quizId}/start")
    public QuizService.AttemptDto start(@PathVariable UUID quizId) { return service.start(quizId); }

    @PutMapping("/api/student/attempts/{attemptId}/answers")
    public Map<String, Object> save(@PathVariable UUID attemptId, @RequestBody Map<String, Integer> answers) {
        return service.saveAnswers(attemptId, answers);
    }

    @PostMapping("/api/student/attempts/{attemptId}/submit")
    public QuizService.AttemptDto submit(@PathVariable UUID attemptId, @RequestBody Map<String, Integer> answers) {
        return service.submit(attemptId, answers);
    }

    @GetMapping("/api/attempts/{attemptId}")
    public QuizService.AttemptDto result(@PathVariable UUID attemptId) { return service.result(attemptId); }
}
