package com.nodemore.lms.auth;

import com.nodemore.lms.user.UserDto;
import jakarta.validation.constraints.*;

public final class AuthDtos {
    private AuthDtos() {}

    public static final String PASSWORD_REGEX = "^(?=.*[A-Za-z])(?=.*\\d).+$";

    public record RegisterRequest(
            @NotBlank @Size(max = 150) String fullName,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 128) @Pattern(regexp = PASSWORD_REGEX, message = "must contain letters and numbers") String password,
            @Size(max = 30) String phone,
            @NotBlank @Pattern(regexp = "TEACHER|STUDENT") String role,
            String language) {}

    public record VerifyRequest(@NotBlank @Email String email, @NotBlank @Pattern(regexp = "\\d{6}") String code) {}

    public record EmailRequest(@NotBlank @Email String email) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record ResetRequest(@NotBlank String token,
                               @NotBlank @Size(min = 8, max = 128) @Pattern(regexp = PASSWORD_REGEX, message = "must contain letters and numbers") String password) {}

    public record AuthResponse(String accessToken, long expiresIn, UserDto user) {}
}
