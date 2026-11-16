package com.nodemore.lms.common;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(int status, String code, String message, Map<String, String> fieldErrors, Instant timestamp) {
}
