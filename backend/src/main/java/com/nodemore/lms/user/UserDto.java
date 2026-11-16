package com.nodemore.lms.user;

import java.time.Instant;
import java.util.UUID;

public record UserDto(UUID id, String email, String fullName, String phone, Role role, UserStatus status,
                      boolean emailVerified, String preferredLanguage, boolean emailNotifications, Instant lastLoginAt, Instant createdAt) {

    public static UserDto of(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(), u.getRole(), u.getStatus(),
                u.isEmailVerified(), u.getPreferredLanguage(), u.isEmailNotifications(), u.getLastLoginAt(), u.getCreatedAt());
    }
}
