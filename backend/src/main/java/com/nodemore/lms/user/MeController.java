package com.nodemore.lms.user;

import com.nodemore.lms.audit.AuditService;
import com.nodemore.lms.auth.RefreshTokenRepository;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.config.LocaleConfig;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository users;
    private final TeacherProfileRepository teacherProfiles;
    private final StudentProfileRepository studentProfiles;
    private final PasswordEncoder encoder;
    private final RefreshTokenRepository refreshTokens;
    private final NotificationService notifications;
    private final AuditService audit;

    public record ProfileUpdate(
            @NotBlank @Size(max = 150) String fullName,
            @Size(max = 30) String phone,
            @Size(max = 200) String headline,
            @Size(max = 5000) String bio,
            @Size(max = 300) String subjects,
            @Size(max = 5000) String qualifications,
            @Size(max = 2000) String bankDetails,
            @Size(max = 200) String school,
            @Size(max = 50) String grade,
            @Size(max = 150) String guardianName,
            @Size(max = 30) String guardianPhone,
            LocalDate dateOfBirth) {}

    public record LanguageUpdate(@NotBlank String language) {}

    public record PreferencesUpdate(boolean emailNotifications) {}

    public record PasswordChange(@NotBlank String currentPassword,
                                 @NotBlank @Size(min = 8, max = 128)
                                 @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "must contain letters and numbers")
                                 String newPassword) {}

    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Object> me() {
        User u = load();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", UserDto.of(u));
        if (u.getRole() == Role.TEACHER) teacherProfiles.findByUserId(u.getId()).ifPresent(p -> out.put("profile", Map.of(
                "headline", nz(p.getHeadline()), "bio", nz(p.getBio()), "subjects", nz(p.getSubjects()),
                "qualifications", nz(p.getQualifications()), "bankDetails", nz(p.getBankDetails()))));
        if (u.getRole() == Role.STUDENT) studentProfiles.findByUserId(u.getId()).ifPresent(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("school", nz(p.getSchool()));
            m.put("grade", nz(p.getGrade()));
            m.put("guardianName", nz(p.getGuardianName()));
            m.put("guardianPhone", nz(p.getGuardianPhone()));
            m.put("dateOfBirth", p.getDateOfBirth());
            out.put("profile", m);
        });
        return out;
    }

    @PutMapping
    @Transactional
    public Map<String, Object> update(@Valid @RequestBody ProfileUpdate req) {
        User u = load();
        u.setFullName(req.fullName().trim());
        u.setPhone(req.phone());
        if (u.getRole() == Role.TEACHER) {
            TeacherProfile p = teacherProfiles.findByUserId(u.getId()).orElseGet(() -> {
                TeacherProfile n = new TeacherProfile();
                n.setUserId(u.getId());
                return n;
            });
            p.setHeadline(req.headline());
            p.setBio(req.bio());
            p.setSubjects(req.subjects());
            p.setQualifications(req.qualifications());
            p.setBankDetails(req.bankDetails());
            teacherProfiles.save(p);
        } else if (u.getRole() == Role.STUDENT) {
            StudentProfile p = studentProfiles.findByUserId(u.getId()).orElseGet(() -> {
                StudentProfile n = new StudentProfile();
                n.setUserId(u.getId());
                return n;
            });
            p.setSchool(req.school());
            p.setGrade(req.grade());
            p.setGuardianName(req.guardianName());
            p.setGuardianPhone(req.guardianPhone());
            p.setDateOfBirth(req.dateOfBirth());
            studentProfiles.save(p);
        }
        return me();
    }

    @PutMapping("/language")
    @Transactional
    public UserDto language(@Valid @RequestBody LanguageUpdate req) {
        User u = load();
        u.setPreferredLanguage(LocaleConfig.normalize(req.language()));
        return UserDto.of(u);
    }

    @PutMapping("/preferences")
    @Transactional
    public UserDto preferences(@RequestBody PreferencesUpdate req) {
        User u = load();
        u.setEmailNotifications(req.emailNotifications());
        return UserDto.of(u);
    }

    @PutMapping("/password")
    @Transactional
    public Map<String, Object> changePassword(@Valid @RequestBody PasswordChange req) {
        User u = load();
        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "error.wrong_password");
        }
        u.setPasswordHash(encoder.encode(req.newPassword()));
        refreshTokens.revokeAllForUser(u.getId(), Instant.now());
        audit.log("PASSWORD_CHANGED", "User", u.getId().toString(), null);
        notifications.notify(u.getId(), "PASSWORD_CHANGED", Map.of(), "/settings", true);
        return Map.of("ok", true);
    }

    private User load() {
        UUID id = CurrentUser.get().id();
        return users.findById(id).orElseThrow(ApiException::notFound);
    }

    private static String nz(String s) { return s == null ? "" : s; }
}
