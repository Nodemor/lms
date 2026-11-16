package com.nodemore.lms.security;

import com.nodemore.lms.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {
    private CurrentUser() {}

    public static UserPrincipal get() {
        UserPrincipal p = getOrNull();
        if (p == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "error.unauthorized");
        return p;
    }

    public static UserPrincipal getOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal p) return p;
        return null;
    }
}
