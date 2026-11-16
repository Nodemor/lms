package com.nodemore.lms.live;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LiveController {

    private final LiveService service;
    private final LiveKitService liveKit;

    @GetMapping("/api/classes/{classId}/sessions")
    public List<LiveService.SessionDto> list(@PathVariable UUID classId) {
        return service.list(classId);
    }

    @PostMapping("/api/teacher/classes/{classId}/sessions")
    public LiveService.SessionDto create(@PathVariable UUID classId, @Valid @RequestBody LiveService.SessionRequest req) {
        return service.create(classId, req);
    }

    @PutMapping("/api/teacher/classes/{classId}/sessions/{sessionId}")
    public LiveService.SessionDto update(@PathVariable UUID classId, @PathVariable UUID sessionId,
                                         @Valid @RequestBody LiveService.SessionRequest req) {
        return service.update(classId, sessionId, req);
    }

    @PostMapping("/api/teacher/classes/{classId}/sessions/{sessionId}/cancel")
    public Map<String, Object> cancel(@PathVariable UUID classId, @PathVariable UUID sessionId) {
        service.cancel(classId, sessionId);
        return Map.of("ok", true);
    }

    @PostMapping("/api/sessions/{sessionId}/join")
    public LiveService.JoinInfo join(@PathVariable UUID sessionId) {
        return service.join(sessionId);
    }

    @PostMapping("/api/teacher/sessions/{sessionId}/end")
    public LiveService.SessionDto end(@PathVariable UUID sessionId) {
        return service.end(sessionId);
    }

    public record MarkRequest(boolean present) {}
    public record CheckinRequest(String token) {}

    @GetMapping("/api/teacher/sessions/{sessionId}/checkin-token")
    public Map<String, Object> checkinToken(@PathVariable UUID sessionId) {
        return service.checkinToken(sessionId);
    }

    @PostMapping("/api/student/sessions/{sessionId}/checkin")
    public Map<String, Object> checkIn(@PathVariable UUID sessionId, @RequestBody CheckinRequest req) {
        return service.checkIn(sessionId, req.token());
    }

    @GetMapping("/api/teacher/live/options")
    public Map<String, Object> options() {
        return service.options();
    }

    @PutMapping("/api/teacher/sessions/{sessionId}/attendance/{studentId}")
    public Map<String, Object> mark(@PathVariable UUID sessionId, @PathVariable UUID studentId, @RequestBody MarkRequest req) {
        service.markAttendance(sessionId, studentId, req.present());
        return Map.of("ok", true);
    }

    @GetMapping("/api/teacher/sessions/{sessionId}/attendance")
    public Map<String, Object> sessionAttendance(@PathVariable UUID sessionId) {
        return service.sessionAttendance(sessionId);
    }

    @GetMapping("/api/teacher/classes/{classId}/attendance")
    public Map<String, Object> classAttendance(@PathVariable UUID classId) {
        return service.classAttendance(classId);
    }

    @GetMapping("/api/student/classes/{classId}/attendance")
    public Map<String, Object> myAttendance(@PathVariable UUID classId) {
        return service.myAttendance(classId);
    }

    /** LiveKit server webhook: configure webhook URL to {backend}/api/live/webhook. */
    @PostMapping(value = "/api/live/webhook", consumes = "*/*")
    public Map<String, Object> webhook(@RequestHeader(value = "Authorization", required = false) String auth,
                                       @RequestBody String body) {
        service.handleWebhook(liveKit.verifyWebhook(auth, body));
        return Map.of("ok", true);
    }
}
