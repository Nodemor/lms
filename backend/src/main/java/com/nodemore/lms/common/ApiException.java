package com.nodemore.lms.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Business error. {@code code} is a message key (messages*.properties on the
 * backend and errors.* in the frontend locale files), so every error is translatable.
 */
@Getter
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final transient Object[] args;

    public ApiException(HttpStatus status, String code, Object... args) {
        super(code);
        this.status = status;
        this.code = code;
        this.args = args;
    }

    public static ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND, "error.not_found"); }
    public static ApiException forbidden() { return new ApiException(HttpStatus.FORBIDDEN, "error.forbidden"); }
    public static ApiException badRequest(String code, Object... args) { return new ApiException(HttpStatus.BAD_REQUEST, code, args); }
    public static ApiException conflict(String code, Object... args) { return new ApiException(HttpStatus.CONFLICT, code, args); }
}
