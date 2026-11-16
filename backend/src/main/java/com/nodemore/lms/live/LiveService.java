package com.nodemore.lms.live;

import com.fasterxml.jackson.databind.JsonNode;
import com.nodemore.lms.audit.AuditService;
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
import com.nodemore.lms.settings.SettingsService;
import com.nodemore.lms.user.User;
import com.nodemore.lms.user.UserRepository;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Live classes. Each session runs either on an external meeting service (Zoom, Google Meet, Teams...,
 * the teacher pastes the link) or in the built-in LiveKit room (only when a LiveKit server is configured).
 *
 * External links are never sent in session lists to students: a student receives the link only from
 * {@link #join} after the enrolment and fee checks pass, then the browser redirects to it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LiveService {

    /** Students can open an external meeting this long before the scheduled start. */
    public static final Duration EARLY_JOIN = Duration.ofMinutes(15);

    private final ClassSessionRepository sessions;
    private final AttendanceRepository attendance;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final AccessService access;
    private final LiveKitService liveKit;
    private final NotificationService notifications;
    private final SettingsService settings;
    private final AuditService audit;
    private final DateFormats dates;
    private final com.nodemore.lms.config.AppProperties props;

    public record SessionRequest(@NotBlank @Size(max = 200) String title, @Size(max = 5000) String description,
                                 @NotNull Instant scheduledStart, @Min(5) @Max(600) int durationMinutes,
                                 @Size(max = 1000) String meetingUrl, Boolean inPerson) {}

    public record SessionDto(UUID id, UUID classId, String title, String description, Instant scheduledStart,
                             int durationMinutes, SessionStatus status, Instant startedAt, Instant endedAt,
                             boolean external, boolean inPerson, String meetingProvider, String meetingUrl,
                             Instant joinOpensAt, Boolean myPresent) {}

    public record JoinInfo(boolean external, String meetingUrl, String meetingProvider, String serverUrl, String token,
                           String roomName, boolean teacher, SessionDto session, String classTitle) {}

    private SessionDto dto(ClassSession s, Boolean present, boolean revealLink) {
        Instant opens = s.isExternal() ? s.getScheduledStart().minus(EARLY_JOIN) : null;
        return new SessionDto(s.getId(), s.getClassId(), s.getTitle(), s.getDescription(), s.getScheduledStart(),
                s.getDurationMinutes(), s.getStatus(), s.getStartedAt(), s.getEndedAt(), s.isExternal(), s.isInPerson(),
                s.getMeetingProvider(), revealLink ? s.getMeetingUrl() : null, opens, present);
    }

    // ------------------------------------------------------------- options
    public Map<String, Object> options() {
        UUID me = CurrentUser.get().id();
        String last = sessions.findFirstByTeacherIdAndMeetingUrlIsNotNullOrderByCreatedAtDesc(me)
                .map(ClassSession::getMeetingUrl).orElse("");
        return Map.of("builtInAvailable", liveKit.configured(), "lastMeetingUrl", last);
    }

    // ------------------------------------------------------------- scheduling
    @Transactional
    public SessionDto create(UUID classId, SessionRequest req) {
        ClassRoom c = access.requireOwningTeacher(classId);
        ClassSession s = new ClassSession();
        s.setClassId(classId);
        s.setTeacherId(c.getTeacherId());
        s.setRoomName("nm-" + UUID.randomUUID());
        s.setStatus(SessionStatus.SCHEDULED);
        apply(s, req);
        sessions.save(s);
        notifications.notifyMany(enrollments.studentIds(classId, EnrollmentStatus.ACTIVE), "SESSION_SCHEDULED",
                Map.of("className", c.getTitle(), "title", s.getTitle(), "start", dates.format(s.getScheduledStart())),
                "/student/classes/" + classId + "?tab=live", true);
        return dto(s, null, true);
    }

    @Transactional
    public SessionDto update(UUID classId, UUID sessionId, SessionRequest req) {
        access.requireOwningTeacher(classId);
        ClassSession s = owned(classId, sessionId);
        // A wrong meeting link can be fixed even while the class is live.
        if (s.getStatus() != SessionStatus.SCHEDULED && s.getStatus() != SessionStatus.LIVE) {
            throw ApiException.conflict("error.session_not_editable");
        }
        Instant oldStart = s.getScheduledStart();
        apply(s, req);
        if (!oldStart.equals(s.getScheduledStart())) s.setReminderSent(false);
        return dto(s, null, true);
    }

    private void apply(ClassSession s, SessionRequest req) {
        boolean inPerson = Boolean.TRUE.equals(req.inPerson());
        String url = inPerson ? null : MeetingLinks.clean(req.meetingUrl());
        if (!inPerson && url == null && !liveKit.configured()) throw ApiException.badRequest("error.meeting_link_required");
        s.setInPerson(inPerson);
        s.setTitle(req.title().trim());
        s.setDescription(req.description());
        s.setScheduledStart(req.scheduledStart());
        s.setDurationMinutes(req.durationMinutes());
        s.setMeetingUrl(url);
        s.setMeetingProvider(inPerson ? "IN_PERSON" : MeetingLinks.provider(url));
    }

    @Transactional
    public void cancel(UUID classId, UUID sessionId) {
        ClassRoom c = access.requireOwningTeacher(classId);
        ClassSession s = owned(classId, sessionId);
        if (s.getStatus() != SessionStatus.SCHEDULED) throw ApiException.conflict("error.session_not_editable");
        s.setStatus(SessionStatus.CANCELLED);
        notifications.notifyMany(enrollments.studentIds(classId, EnrollmentStatus.ACTIVE), "SESSION_CANCELLED",
                Map.of("className", c.getTitle(), "title", s.getTitle()), "/student/classes/" + classId + "?tab=live", true);
    }

    private ClassSession owned(UUID classId, UUID sessionId) {
        return sessions.findById(sessionId).filter(s -> s.getClassId().equals(classId)).orElseThrow(ApiException::notFound);
    }

    @Transactional(readOnly = true)
    public List<SessionDto> list(UUID classId) {
        ClassRoom c = access.requireMember(classId);
        UserPrincipal p = CurrentUser.get();
        List<ClassSession> list = sessions.findByClassIdOrderByScheduledStartDesc(classId);
        if (!p.isStudent()) return list.stream().map(s -> dto(s, null, true)).toList();
        Map<UUID, Attendance> mine = ClassMapper.index(attendance.findByClassIdAndStudentId(c.getId(), p.id()), Attendance::getSessionId);
        return list.stream().map(s -> {
            Attendance a = mine.get(s.getId());
            Boolean present = s.getStatus() == SessionStatus.ENDED ? (a != null && a.isPresent()) : null;
            return dto(s, present, false);
        }).toList();
    }

    // ------------------------------------------------------------- joining
    @Transactional
    public JoinInfo join(UUID sessionId) {
        UserPrincipal p = CurrentUser.get();
        ClassSession s = sessions.findById(sessionId).orElseThrow(ApiException::notFound);
        ClassRoom c = access.load(s.getClassId());
        boolean teacher = p.isTeacher() && c.getTeacherId().equals(p.id());
        if (s.getStatus() == SessionStatus.CANCELLED || s.getStatus() == SessionStatus.ENDED) {
            throw ApiException.conflict("error.session_closed");
        }
        if (s.isInPerson()) throw ApiException.conflict("error.session_in_person");
        if (teacher) {
            if (s.getStatus() == SessionStatus.SCHEDULED) {
                s.setStatus(SessionStatus.LIVE);
                s.setStartedAt(Instant.now());
                notifications.notifyMany(enrollments.studentIds(c.getId(), EnrollmentStatus.ACTIVE), "SESSION_LIVE",
                        Map.of("className", c.getTitle(), "title", s.getTitle()), "/live/" + s.getId(), false);
                audit.log("SESSION_STARTED", "Session", s.getId().toString(), s.getTitle());
            }
        } else {
            access.requireContent(c.getId()); // enrolled + fee paid
            boolean open = s.getStatus() == SessionStatus.LIVE
                    || (s.isExternal() && !Instant.now().isBefore(s.getScheduledStart().minus(EARLY_JOIN)));
            if (!open) {
                throw new ApiException(HttpStatus.CONFLICT, s.isExternal() ? "error.session_not_open_yet" : "error.session_not_live");
            }
        }

        if (s.isExternal()) {
            if (!teacher) recordJoinClick(s, p.id());
            return new JoinInfo(true, s.getMeetingUrl(), s.getMeetingProvider(), null, null, null, teacher,
                    dto(s, null, teacher), c.getTitle());
        }
        String name = users.findById(p.id()).map(User::getFullName).orElse(p.email());
        long ttl = Duration.ofMinutes(s.getDurationMinutes() + 180L).toSeconds();
        String token = liveKit.joinToken(p.id().toString(), name, s.getRoomName(), teacher, ttl);
        return new JoinInfo(false, null, null, liveKit.serverUrl(), token, s.getRoomName(), teacher, dto(s, null, false), c.getTitle());
    }

    /** For external meetings we can only know that the student opened the link; the teacher confirms attendance. */
    private void recordJoinClick(ClassSession s, UUID studentId) {
        Attendance a = attendance.findBySessionIdAndStudentId(s.getId(), studentId).orElseGet(() -> newAttendance(s, studentId));
        if (a.getFirstJoinedAt() == null) a.setFirstJoinedAt(Instant.now());
        a.setJoinCount(a.getJoinCount() + 1);
        attendance.save(a);
    }

    private static Attendance newAttendance(ClassSession s, UUID studentId) {
        Attendance n = new Attendance();
        n.setSessionId(s.getId());
        n.setClassId(s.getClassId());
        n.setStudentId(studentId);
        n.setTeacherId(s.getTeacherId());
        return n;
    }

    /** Teacher marks a student present/absent (used for external meetings, also allowed as a correction). */
    @Transactional
    public void markAttendance(UUID sessionId, UUID studentId, boolean present) {
        ClassSession s = sessions.findById(sessionId).orElseThrow(ApiException::notFound);
        access.requireOwningTeacher(s.getClassId());
        if (s.getStatus() == SessionStatus.CANCELLED || (s.getStatus() == SessionStatus.SCHEDULED && !s.isInPerson())) {
            throw ApiException.conflict("error.session_not_started");
        }
        if (enrollments.findByClassIdAndStudentId(s.getClassId(), studentId).isEmpty()) throw ApiException.notFound();
        Attendance a = attendance.findBySessionIdAndStudentId(sessionId, studentId).orElseGet(() -> newAttendance(s, studentId));
        a.setPresent(present);
        attendance.save(a);
    }

    @Transactional
    public SessionDto end(UUID sessionId) {
        ClassSession s = sessions.findById(sessionId).orElseThrow(ApiException::notFound);
        access.requireOwningTeacher(s.getClassId());
        finish(s);
        if (!s.isManualAttendance()) liveKit.deleteRoom(s.getRoomName());
        return dto(s, null, true);
    }

    /** Closes the session. For built-in rooms it also closes open intervals and recalculates presence. */
    void finish(ClassSession s) {
        if (s.getStatus() == SessionStatus.ENDED) return;
        Instant now = Instant.now();
        s.setStatus(SessionStatus.ENDED);
        s.setEndedAt(now);
        if (s.getStartedAt() == null) s.setStartedAt(s.isManualAttendance() ? s.getScheduledStart() : now);
        if (!s.isManualAttendance()) {
            for (Attendance a : attendance.findBySessionId(s.getId())) {
                closeInterval(a, now);
                // QR check-ins / teacher marks count too
                a.setPresent(a.isPresent() || isPresent(s, a));
            }
        }
        sessions.save(s);
    }

    private long expectedSeconds(ClassSession s) {
        if (s.getStartedAt() != null && s.getEndedAt() != null) {
            return Math.max(60, Duration.between(s.getStartedAt(), s.getEndedAt()).toSeconds());
        }
        return s.getDurationMinutes() * 60L;
    }

    private boolean isPresent(ClassSession s, Attendance a) {
        int pct = Math.min(100, Math.max(1, settings.getInt("attendance.minPercent", 50)));
        return a.getTotalSeconds() >= expectedSeconds(s) * pct / 100;
    }

    private static void closeInterval(Attendance a, Instant at) {
        if (a.getOpenJoinedAt() != null) {
            long secs = Math.max(0, Duration.between(a.getOpenJoinedAt(), at).toSeconds());
            a.setTotalSeconds((int) Math.min(Integer.MAX_VALUE, a.getTotalSeconds() + secs));
            a.setOpenJoinedAt(null);
            a.setLastLeftAt(at);
        }
    }

    // ------------------------------------------------------------- QR check-in (in-person classes)
    /** The check-in QR changes every 30 s and is accepted for one extra window, so a photo sent away stops working. */
    public static final long CHECKIN_WINDOW_SECONDS = 30;

    private String checkinCode(UUID sessionId, long window) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            byte[] key = ("checkin:" + props.getJwt().getSecret()).getBytes(java.nio.charset.StandardCharsets.UTF_8);
            mac.init(new javax.crypto.spec.SecretKeySpec(key, "HmacSHA256"));
            byte[] h = mac.doFinal((sessionId + ":" + window).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(h).substring(0, 22);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> checkinToken(UUID sessionId) {
        ClassSession s = sessions.findById(sessionId).orElseThrow(ApiException::notFound);
        access.requireOwningTeacher(s.getClassId());
        if (s.getStatus() == SessionStatus.CANCELLED || s.getStatus() == SessionStatus.ENDED) {
            throw ApiException.conflict("error.session_closed");
        }
        long nowSec = Instant.now().getEpochSecond();
        long window = nowSec / CHECKIN_WINDOW_SECONDS;
        long refreshIn = CHECKIN_WINDOW_SECONDS - (nowSec % CHECKIN_WINDOW_SECONDS);
        return Map.of("token", checkinCode(sessionId, window), "refreshInSeconds", refreshIn);
    }

    @Transactional
    public Map<String, Object> checkIn(UUID sessionId, String token) {
        UserPrincipal p = CurrentUser.get();
        if (!p.isStudent()) throw ApiException.forbidden();
        ClassSession s = sessions.findById(sessionId).orElseThrow(ApiException::notFound);
        if (s.getStatus() == SessionStatus.CANCELLED || s.getStatus() == SessionStatus.ENDED) {
            throw ApiException.conflict("error.session_closed");
        }
        long window = Instant.now().getEpochSecond() / CHECKIN_WINDOW_SECONDS;
        boolean valid = token != null && (com.nodemore.lms.common.Hashing.constantTimeEquals(token, checkinCode(sessionId, window))
                || com.nodemore.lms.common.Hashing.constantTimeEquals(token, checkinCode(sessionId, window - 1)));
        if (!valid) throw ApiException.badRequest("error.checkin_expired");
        ClassRoom c = access.requireContent(s.getClassId()); // enrolled + fee paid
        Attendance a = attendance.findBySessionIdAndStudentId(sessionId, p.id()).orElseGet(() -> newAttendance(s, p.id()));
        boolean already = a.isPresent();
        if (a.getFirstJoinedAt() == null) a.setFirstJoinedAt(Instant.now());
        a.setJoinCount(a.getJoinCount() + 1);
        a.setPresent(true);
        attendance.save(a);
        if (s.getStatus() == SessionStatus.SCHEDULED) {
            s.setStatus(SessionStatus.LIVE);
            s.setStartedAt(Instant.now());
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("alreadyCheckedIn", already);
        out.put("checkedInAt", a.getFirstJoinedAt());
        out.put("sessionTitle", s.getTitle());
        out.put("classId", c.getId());
        out.put("classTitle", c.getTitle());
        out.put("teacherName", users.findById(c.getTeacherId()).map(User::getFullName).orElse(""));
        return out;
    }

    // ------------------------------------------------------------- LiveKit webhooks (built-in rooms only)
    @Transactional
    public void handleWebhook(JsonNode event) {
        String type = event.path("event").asText("");
        String room = event.path("room").path("name").asText("");
        Optional<ClassSession> found = sessions.findByRoomName(room);
        if (found.isEmpty() || found.get().isManualAttendance()) return;
        ClassSession s = found.get();
        Instant at = Instant.now();
        long createdAt = event.path("createdAt").asLong(0);
        if (createdAt > 0) at = Instant.ofEpochSecond(createdAt);

        if ("room_finished".equals(type)) {
            if (s.getStatus() == SessionStatus.LIVE) {
                for (Attendance a : attendance.findBySessionId(s.getId())) closeInterval(a, at);
            }
            return;
        }
        String identity = event.path("participant").path("identity").asText("");
        UUID userId;
        try {
            userId = UUID.fromString(identity);
        } catch (IllegalArgumentException e) {
            return;
        }
        if (userId.equals(s.getTeacherId())) return;
        if (enrollments.findByClassIdAndStudentId(s.getClassId(), userId)
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).isEmpty()) return;

        Attendance a = attendance.findBySessionIdAndStudentId(s.getId(), userId).orElseGet(() -> newAttendance(s, userId));
        if ("participant_joined".equals(type)) {
            if (a.getFirstJoinedAt() == null) a.setFirstJoinedAt(at);
            if (a.getOpenJoinedAt() == null) a.setOpenJoinedAt(at);
            a.setJoinCount(a.getJoinCount() + 1);
        } else if ("participant_left".equals(type)) {
            closeInterval(a, at);
            a.setPresent(isPresent(s, a));
        } else {
            return;
        }
        attendance.save(a);
    }

    // ------------------------------------------------------------- reports
    @Transactional(readOnly = true)
    public Map<String, Object> sessionAttendance(UUID sessionId) {
        ClassSession s = sessions.findById(sessionId).orElseThrow(ApiException::notFound);
        ClassRoom cls = access.requireOwner(s.getClassId());
        Map<UUID, Attendance> rows = ClassMapper.index(attendance.findBySessionId(sessionId), Attendance::getStudentId);
        Set<UUID> studentIds = new LinkedHashSet<>(enrollments.studentIds(s.getClassId(), EnrollmentStatus.ACTIVE));
        studentIds.addAll(rows.keySet());
        Map<UUID, User> us = ClassMapper.index(users.findAllById(studentIds), User::getId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID sid : studentIds) {
            User u = us.get(sid);
            Attendance a = rows.get(sid);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("studentId", sid);
            m.put("name", u == null ? "" : u.getFullName());
            m.put("email", u == null ? "" : u.getEmail());
            m.put("present", a != null && a.isPresent());
            m.put("minutes", a == null ? 0 : a.getTotalSeconds() / 60);
            m.put("joinCount", a == null ? 0 : a.getJoinCount());
            m.put("firstJoinedAt", a == null ? null : a.getFirstJoinedAt());
            m.put("inRoom", a != null && a.getOpenJoinedAt() != null);
            out.add(m);
        }
        out.sort(Comparator.comparing(m -> String.valueOf(m.get("name"))));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("external", s.isManualAttendance());
        result.put("inPerson", s.isInPerson());
        result.put("title", s.getTitle());
        result.put("classId", cls.getId());
        result.put("classTitle", cls.getTitle());
        result.put("scheduledStart", s.getScheduledStart());
        result.put("status", s.getStatus());
        result.put("students", out);
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> classAttendance(UUID classId) {
        access.requireOwner(classId);
        long held = sessions.countByClassIdAndStatus(classId, SessionStatus.ENDED);
        Map<UUID, Long> present = new HashMap<>();
        for (Object[] r : attendance.presentCountsByStudent(classId)) present.put((UUID) r[0], ((Number) r[1]).longValue());
        List<UUID> ids = enrollments.studentIds(classId, EnrollmentStatus.ACTIVE);
        Map<UUID, User> us = ClassMapper.index(users.findAllById(ids), User::getId);
        List<Map<String, Object>> students = new ArrayList<>();
        for (UUID id : ids) {
            long p = present.getOrDefault(id, 0L);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("studentId", id);
            m.put("name", us.containsKey(id) ? us.get(id).getFullName() : "");
            m.put("present", p);
            m.put("percent", held == 0 ? 0 : Math.min(100, Math.round(p * 100.0 / held)));
            students.add(m);
        }
        students.sort(Comparator.comparing(m -> String.valueOf(m.get("name"))));
        return Map.of("sessionsHeld", held, "students", students);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> myAttendance(UUID classId) {
        UUID me = CurrentUser.get().id();
        access.requireMember(classId);
        long held = sessions.countByClassIdAndStatus(classId, SessionStatus.ENDED);
        long present = attendance.countByClassIdAndStudentIdAndPresentTrue(classId, me);
        return Map.of("sessionsHeld", held, "present", present,
                "percent", held == 0 ? 0 : Math.min(100, Math.round(present * 100.0 / held)));
    }

    /** Safety net: ends sessions nobody closed (3 hours past their planned end), live or external. */
    @Transactional
    public void closeStaleSessions() {
        Instant now = Instant.now();
        for (ClassSession s : sessions.findByStatusAndStartedAtBefore(SessionStatus.LIVE, now.minus(Duration.ofHours(3)))) {
            if (s.getStartedAt().plus(Duration.ofMinutes(s.getDurationMinutes() + 180L)).isBefore(now)) {
                finish(s);
                if (!s.isManualAttendance()) liveKit.deleteRoom(s.getRoomName());
            }
        }
        for (ClassSession s : sessions.findByStatusAndInPersonTrueAndScheduledStartBefore(SessionStatus.SCHEDULED, now.minus(Duration.ofHours(3)))) {
            if (s.getScheduledStart().plus(Duration.ofMinutes(s.getDurationMinutes() + 180L)).isBefore(now)) finish(s);
        }
        // External classes where the teacher went straight to Zoom/Meet and never pressed Start in the app.
        for (ClassSession s : sessions.findByStatusAndMeetingUrlIsNotNullAndScheduledStartBefore(SessionStatus.SCHEDULED, now.minus(Duration.ofHours(3)))) {
            if (s.getScheduledStart().plus(Duration.ofMinutes(s.getDurationMinutes() + 180L)).isBefore(now)) finish(s);
        }
    }
}
