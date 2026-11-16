package com.nodemore.lms.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class Json {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Json() {}

    public static String write(Object o) {
        try {
            return o == null ? null : MAPPER.writeValueAsString(o);
        } catch (Exception e) {
            throw new IllegalStateException("JSON write failed", e);
        }
    }

    public static <T> T read(String json, TypeReference<T> type) {
        try {
            return json == null || json.isBlank() ? null : MAPPER.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("JSON read failed", e);
        }
    }
}
