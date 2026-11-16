package com.nodemore.lms.auth;

import com.nodemore.lms.auth.AuthDtos.*;
import com.nodemore.lms.common.RequestUtils;
import com.nodemore.lms.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    public static final String REFRESH_COOKIE = "nm_refresh";

    private final AuthService auth;
    private final AppProperties props;

    @PostMapping("/register")
    public Map<String, Object> register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verify(@Valid @RequestBody VerifyRequest req, HttpServletRequest http) {
        return withCookie(auth.verifyEmail(req, RequestUtils.clientIp(http), http.getHeader("User-Agent")));
    }

    @PostMapping("/resend-verification")
    public Map<String, Object> resend(@Valid @RequestBody EmailRequest req) {
        auth.resendVerification(req.email());
        return Map.of("ok", true);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        return withCookie(auth.login(req, RequestUtils.clientIp(http), http.getHeader("User-Agent")));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String token,
                                                HttpServletRequest http) {
        return withCookie(auth.refresh(token, RequestUtils.clientIp(http), http.getHeader("User-Agent")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String token) {
        auth.logout(token);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .body(Map.of("ok", true));
    }

    @PostMapping("/forgot-password")
    public Map<String, Object> forgot(@Valid @RequestBody EmailRequest req) {
        auth.forgotPassword(req.email());
        return Map.of("ok", true); // same answer whether or not the e-mail exists
    }

    @PostMapping("/reset-password")
    public Map<String, Object> reset(@Valid @RequestBody ResetRequest req) {
        auth.resetPassword(req);
        return Map.of("ok", true);
    }

    private ResponseEntity<AuthResponse> withCookie(AuthService.Session s) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(s.refreshToken(), Duration.ofDays(props.getJwt().getRefreshTtlDays())).toString())
                .body(s.response());
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(props.getJwt().isCookieSecure())
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(maxAge)
                .build();
    }
}
