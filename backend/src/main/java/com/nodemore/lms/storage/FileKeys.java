package com.nodemore.lms.storage;

import com.nodemore.lms.common.ApiException;
import org.springframework.http.MediaType;

import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Object keys are tenant scoped: t/{teacherId}/{classId}/{folder}/... for teacher files and
 * s/{studentId}/{classId}/{folder}/... for student files. Services only accept keys that start
 * with the caller's own prefix, so one tenant can never attach another tenant's file.
 */
public final class FileKeys {
    private FileKeys() {}

    private static final Pattern SAFE = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9/_.-]{0,400}$");

    public static final Set<String> IMAGE = Set.of("jpg", "jpeg", "png", "webp");
    public static final Set<String> VIDEO = Set.of("mp4", "webm", "mov", "m4v");
    public static final Set<String> DOCUMENT = Set.of("pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt",
            "jpg", "jpeg", "png", "webp", "zip");
    public static final Set<String> SLIP = Set.of("pdf", "jpg", "jpeg", "png", "webp");

    private static final Map<String, String> TYPES = Map.ofEntries(
            Map.entry("jpg", "image/jpeg"), Map.entry("jpeg", "image/jpeg"), Map.entry("png", "image/png"),
            Map.entry("webp", "image/webp"), Map.entry("mp4", "video/mp4"), Map.entry("m4v", "video/mp4"),
            Map.entry("webm", "video/webm"), Map.entry("mov", "video/quicktime"), Map.entry("pdf", "application/pdf"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("ppt", "application/vnd.ms-powerpoint"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("xls", "application/vnd.ms-excel"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("txt", "text/plain"), Map.entry("zip", "application/zip"));

    public static boolean isSafe(String key) {
        return key != null && SAFE.matcher(key).matches() && !key.contains("..") && !key.contains("//");
    }

    public static String extension(String fileName) {
        if (fileName == null) return "";
        int i = fileName.lastIndexOf('.');
        return i < 0 ? "" : fileName.substring(i + 1).toLowerCase(Locale.ROOT);
    }

    public static String contentTypeFor(String fileName) {
        return TYPES.getOrDefault(extension(fileName), "application/octet-stream");
    }

    public static MediaType mediaTypeFor(String fileName) {
        return MediaType.parseMediaType(contentTypeFor(fileName));
    }

    /** scope is a class id, or "general" for files that are not tied to one class (e.g. thumbnails). */
    public static String teacherKey(UUID teacherId, Object scope, String folder, String ext) {
        return "t/" + teacherId + "/" + scope + "/" + folder + "/" + UUID.randomUUID() + "." + ext;
    }

    public static String studentKey(UUID studentId, Object scope, String folder, String ext) {
        return "s/" + studentId + "/" + scope + "/" + folder + "/" + UUID.randomUUID() + "." + ext;
    }

    public static void requireTeacherKey(String key, UUID teacherId, Object scope, String folder) {
        if (!isSafe(key) || !key.startsWith("t/" + teacherId + "/" + scope + "/" + folder + "/")) {
            throw ApiException.badRequest("error.invalid_file");
        }
    }

    public static void requireStudentKey(String key, UUID studentId, Object scope, String folder) {
        if (!isSafe(key) || !key.startsWith("s/" + studentId + "/" + scope + "/" + folder + "/")) {
            throw ApiException.badRequest("error.invalid_file");
        }
    }

    /** File names are only used for display/download names; keep them free of characters that break URLs. */
    public static String cleanName(String name) {
        if (name == null || name.isBlank()) return "file";
        String n = name.replaceAll("[^\\p{L}\\p{N}\\p{M} ._()\\-]", "_").trim();
        return n.length() > 200 ? n.substring(n.length() - 200) : n;
    }
}
