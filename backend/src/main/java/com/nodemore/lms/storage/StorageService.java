package com.nodemore.lms.storage;

import java.time.Duration;
import java.util.Map;

public interface StorageService {

    record UploadTicket(String key, String url, String method, Map<String, String> headers) {}

    /** URL the browser uploads the file to directly (no file bytes pass through business endpoints). */
    UploadTicket presignUpload(String key, String contentType, long maxBytes);

    /** Short-lived signed URL. {@code attachment} forces a download, otherwise inline (preview / video playback). */
    String signedUrl(String key, Duration ttl, String fileName, boolean attachment);

    /** @return object size in bytes, or -1 when it does not exist. */
    long size(String key);

    default boolean exists(String key) { return size(key) >= 0; }

    void delete(String key);
}
