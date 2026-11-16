package com.nodemore.lms.security;

import com.nodemore.lms.user.Role;

import java.util.UUID;

public record UserPrincipal(UUID id, String email, Role role) {
    public boolean isAdmin() { return role == Role.SUPER_ADMIN; }
    public boolean isTeacher() { return role == Role.TEACHER; }
    public boolean isStudent() { return role == Role.STUDENT; }
}
