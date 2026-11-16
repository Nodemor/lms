package com.nodemore.lms.auth;

import com.nodemore.lms.audit.AuditService;
import com.nodemore.lms.auth.AuthDtos.*;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.Hashing;
import com.nodemore.lms.common.RequestUtils;
import com.nodemore.lms.config.AppProperties;
import com.nodemore.lms.config.LocaleConfig;
import com.nodemore.lms.notification.EmailService;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.plan.SubscriptionService;
import com.nodemore.lms.security.JwtService;
import com.nodemore.lms.settings.SettingsService;
import com.nodemore.lms.user.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_FAILED_LOGINS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    private static final Duration OTP_TTL = Duration.ofMinutes(15);
    private static final Duration RESET_TTL = Duration.ofMinutes(30);
    private static final int MAX_OTP_ATTEMPTS = 5;

    private final UserRepository users;
    private final TeacherProfileRepository teacherProfiles;
    private final StudentProfileRepository studentProfiles;
    private final OneTimeTokenRepository otts;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final EmailService email;
    private final NotificationService notifications;
    private final SubscriptionService subscriptions;
    private final SettingsService settings;
    private final AuditService audit;
    private final AppProperties props;

    private volatile String dummyHash;

    private String dummyHash() {
        if (dummyHash == null) dummyHash = encoder.encode(UUID.randomUUID().toString());
        return dummyHash;
    }

    /** Result of a successful sign-in: response body plus the raw refresh token for the cookie. */
    public record Session(AuthResponse response, String refreshToken) {}

    @Transactional
    public Map<String, Object> register(RegisterRequest req) {
        Role role = Role.valueOf(req.role());
        if (role == Role.TEACHER && !settings.getBool("registration.teachersEnabled", true)
                || role == Role.STUDENT && !settings.getBool("registration.studentsEnabled", true)) {
            throw ApiException.forbidden();
        }
        String mail = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(mail)) throw ApiException.conflict("error.email_taken");

        User u = new User();
        u.setEmail(mail);
        u.setFullName(req.fullName().trim());
        u.setPhone(req.phone());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRole(role);
        u.setStatus(UserStatus.PENDING_VERIFICATION);
        u.setPreferredLanguage(LocaleConfig.normalize(req.language()));
        users.save(u);

        if (role == Role.TEACHER) {
            TeacherProfile p = new TeacherProfile();
            p.setUserId(u.getId());
            teacherProfiles.save(p);
        } else {
            StudentProfile p = new StudentProfile();
            p.setUserId(u.getId());
            studentProfiles.save(p);
        }
        sendOtp(u);
        audit.logAs(u.getId(), u.getEmail(), "REGISTER", "User", u.getId().toString(), role.name());
        return Map.of("email", mail, "verificationRequired", true);
    }

    private void sendOtp(User u) {
        otts.invalidateAll(u.getId(), TokenPurpose.VERIFY_EMAIL, Instant.now());
        String code = Hashing.randomDigits(6);
        OneTimeToken t = new OneTimeToken();
        t.setUserId(u.getId());
        t.setPurpose(TokenPurpose.VERIFY_EMAIL);
        t.setTokenHash(Hashing.sha256Hex(u.getId() + ":" + code));
        t.setExpiresAt(Instant.now().plus(OTP_TTL));
        otts.save(t);
        email.sendTemplate(u.getEmail(), u.getPreferredLanguage(), "VERIFY_EMAIL",
                Map.of("name", u.getFullName(), "code", code, "minutes", OTP_TTL.toMinutes()));
    }

    @Transactional
    public void resendVerification(String rawEmail) {
        users.findByEmailIgnoreCase(rawEmail.trim()).ifPresent(u -> {
            if (u.isEmailVerified()) return;
            var last = otts.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(u.getId(), TokenPurpose.VERIFY_EMAIL);
            if (last.isPresent() && last.get().getCreatedAt().isAfter(Instant.now().minusSeconds(60))) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "error.wait_before_resend");
            }
            sendOtp(u);
        });
    }

    /** Verifies the e-mail OTP. The account activates automatically and the user is signed in. */
    @Transactional(noRollbackFor = ApiException.class)
    public Session verifyEmail(VerifyRequest req, String ip, String userAgent) {
        User u = users.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> ApiException.badRequest("error.invalid_code"));
        if (u.isEmailVerified()) throw ApiException.badRequest("error.already_verified");
        OneTimeToken t = otts.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(u.getId(), TokenPurpose.VERIFY_EMAIL)
                .filter(OneTimeToken::isUsable)
                .orElseThrow(() -> ApiException.badRequest("error.code_expired"));
        if (t.getAttempts() >= MAX_OTP_ATTEMPTS) throw ApiException.badRequest("error.code_expired");
        if (!Hashing.constantTimeEquals(t.getTokenHash(), Hashing.sha256Hex(u.getId() + ":" + req.code()))) {
            t.setAttempts(t.getAttempts() + 1);
            otts.save(t);
            throw ApiException.badRequest("error.invalid_code");
        }
        t.setUsedAt(Instant.now());
        u.setEmailVerified(true);
        if (u.getStatus() == UserStatus.PENDING_VERIFICATION) u.setStatus(UserStatus.ACTIVE);
        if (u.getRole() == Role.TEACHER) subscriptions.ensureForTeacher(u.getId());
        audit.logAs(u.getId(), u.getEmail(), "EMAIL_VERIFIED", "User", u.getId().toString(), null);
        notifications.notify(u.getId(), "WELCOME", Map.of("name", u.getFullName()), "/dashboard", false);
        return startSession(u, ip, userAgent);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Session login(LoginRequest req, String ip, String userAgent) {
        User u = users.findByEmailIgnoreCase(req.email().trim()).orElse(null);
        if (u == null) {
            encoder.matches(req.password(), dummyHash()); // equalise timing so e-mails cannot be enumerated
            audit.logAs(null, req.email(), "LOGIN_FAILED", "User", null, "unknown email");
            throw new ApiException(HttpStatus.UNAUTHORIZED, "error.invalid_credentials");
        }
        if (u.getLockedUntil() != null && u.getLockedUntil().isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.LOCKED, "error.account_locked");
        }
        if (!encoder.matches(req.password(), u.getPasswordHash())) {
            int attempts = u.getFailedLoginAttempts() + 1;
            u.setFailedLoginAttempts(attempts);
            if (attempts >= MAX_FAILED_LOGINS) {
                u.setLockedUntil(Instant.now().plus(LOCK_DURATION));
                u.setFailedLoginAttempts(0);
                audit.logAs(u.getId(), u.getEmail(), "ACCOUNT_LOCKED", "User", u.getId().toString(), "too many failed logins");
            } else {
                audit.logAs(u.getId(), u.getEmail(), "LOGIN_FAILED", "User", u.getId().toString(), "attempt " + attempts);
            }
            users.save(u);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "error.invalid_credentials");
        }
        if (u.getStatus() == UserStatus.SUSPENDED) throw new ApiException(HttpStatus.FORBIDDEN, "error.account_suspended");
        if (!u.isEmailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "error.email_not_verified");
        }
        u.setFailedLoginAttempts(0);
        u.setLockedUntil(null);
        audit.logAs(u.getId(), u.getEmail(), "LOGIN", "User", u.getId().toString(), null);
        return startSession(u, ip, userAgent);
    }

    private Session startSession(User u, String ip, String userAgent) {
        u.setLastLoginAt(Instant.now());
        users.save(u);
        String raw = issueRefresh(u.getId(), UUID.randomUUID(), ip, userAgent);
        return new Session(new AuthResponse(jwt.createAccessToken(u.getId(), u.getEmail(), u.getRole()),
                jwt.accessTtlSeconds(), UserDto.of(u)), raw);
    }

    private String issueRefresh(UUID userId, UUID familyId, String ip, String userAgent) {
        String raw = Hashing.randomToken(48);
        RefreshToken rt = new RefreshToken();
        rt.setUserId(userId);
        rt.setFamilyId(familyId);
        rt.setTokenHash(Hashing.sha256Hex(raw));
        rt.setExpiresAt(Instant.now().plus(Duration.ofDays(props.getJwt().getRefreshTtlDays())));
        rt.setIpAddress(ip);
        rt.setUserAgent(RequestUtils.truncate(userAgent, 300));
        refreshTokens.save(rt);
        return raw;
    }

    /** Rotates the refresh token. Reusing an already rotated token revokes the whole session family. */
    @Transactional(noRollbackFor = ApiException.class)
    public Session refresh(String raw, String ip, String userAgent) {
        ApiException unauthorized = new ApiException(HttpStatus.UNAUTHORIZED, "error.session_expired");
        if (raw == null || raw.isBlank()) throw unauthorized;
        RefreshToken rt = refreshTokens.findByTokenHash(Hashing.sha256Hex(raw)).orElseThrow(() -> unauthorized);
        if (rt.getRevokedAt() != null) {
            refreshTokens.revokeFamily(rt.getFamilyId(), Instant.now());
            audit.logAs(rt.getUserId(), null, "REFRESH_TOKEN_REUSE", "User", rt.getUserId().toString(), "family revoked");
            throw unauthorized;
        }
        if (rt.getExpiresAt().isBefore(Instant.now())) throw unauthorized;
        User u = users.findById(rt.getUserId()).orElseThrow(() -> unauthorized);
        if (u.getStatus() != UserStatus.ACTIVE) {
            refreshTokens.revokeAllForUser(u.getId(), Instant.now());
            throw unauthorized;
        }
        rt.setRevokedAt(Instant.now());
        refreshTokens.save(rt);
        String next = issueRefresh(u.getId(), rt.getFamilyId(), ip, userAgent);
        return new Session(new AuthResponse(jwt.createAccessToken(u.getId(), u.getEmail(), u.getRole()),
                jwt.accessTtlSeconds(), UserDto.of(u)), next);
    }

    @Transactional
    public void logout(String raw) {
        if (raw == null || raw.isBlank()) return;
        refreshTokens.findByTokenHash(Hashing.sha256Hex(raw)).ifPresent(rt -> {
            refreshTokens.revokeFamily(rt.getFamilyId(), Instant.now());
        });
    }

    @Transactional
    public void forgotPassword(String rawEmail) {
        users.findByEmailIgnoreCase(rawEmail.trim()).ifPresent(u -> {
            if (u.getStatus() == UserStatus.SUSPENDED) return;
            var last = otts.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(u.getId(), TokenPurpose.RESET_PASSWORD);
            if (last.isPresent() && last.get().getCreatedAt().isAfter(Instant.now().minusSeconds(60))) return;
            otts.invalidateAll(u.getId(), TokenPurpose.RESET_PASSWORD, Instant.now());
            String raw = Hashing.randomToken(32);
            OneTimeToken t = new OneTimeToken();
            t.setUserId(u.getId());
            t.setPurpose(TokenPurpose.RESET_PASSWORD);
            t.setTokenHash(Hashing.sha256Hex(raw));
            t.setExpiresAt(Instant.now().plus(RESET_TTL));
            otts.save(t);
            String link = props.getFrontendUrl() + "/reset-password?token=" + raw;
            email.sendTemplate(u.getEmail(), u.getPreferredLanguage(), "RESET_PASSWORD",
                    Map.of("name", u.getFullName(), "link", link, "minutes", RESET_TTL.toMinutes()));
            audit.logAs(u.getId(), u.getEmail(), "PASSWORD_RESET_REQUESTED", "User", u.getId().toString(), null);
        });
    }

    @Transactional
    public void resetPassword(ResetRequest req) {
        OneTimeToken t = otts.findByTokenHashAndPurpose(Hashing.sha256Hex(req.token()), TokenPurpose.RESET_PASSWORD)
                .filter(OneTimeToken::isUsable)
                .orElseThrow(() -> ApiException.badRequest("error.reset_link_invalid"));
        User u = users.findById(t.getUserId()).orElseThrow(ApiException::notFound);
        u.setPasswordHash(encoder.encode(req.password()));
        u.setFailedLoginAttempts(0);
        u.setLockedUntil(null);
        // A working reset link proves inbox ownership, so it also verifies the e-mail.
        if (!u.isEmailVerified()) {
            u.setEmailVerified(true);
            if (u.getStatus() == UserStatus.PENDING_VERIFICATION) u.setStatus(UserStatus.ACTIVE);
            if (u.getRole() == Role.TEACHER) subscriptions.ensureForTeacher(u.getId());
        }
        users.save(u);
        t.setUsedAt(Instant.now());
        refreshTokens.revokeAllForUser(u.getId(), Instant.now());
        audit.logAs(u.getId(), u.getEmail(), "PASSWORD_RESET", "User", u.getId().toString(), null);
        notifications.notify(u.getId(), "PASSWORD_CHANGED", Map.of(), "/settings", true);
    }
}
