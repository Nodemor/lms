package com.nodemore.lms.storage;

import com.nodemore.lms.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

/**
 * Stores files on the local disk (development or single-server installs). URLs are signed with
 * HMAC-SHA256 and expire, so files stay private exactly like presigned R2/S3 URLs.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private final Path root;
    private final byte[] secret;

    public LocalStorageService(AppProperties props) throws IOException {
        this.root = Path.of(props.getStorage().getLocalDir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
        this.secret = props.getStorage().getSigningSecret().getBytes(StandardCharsets.UTF_8);
        log.info("Local file storage at {}", root);
    }

    public Path resolve(String key) {
        if (!FileKeys.isSafe(key)) throw new IllegalArgumentException("unsafe key");
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) throw new IllegalArgumentException("unsafe key");
        return p;
    }

    public String sign(String op, String key, long exp, String name, boolean attachment, long max) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            String data = op + "\n" + key + "\n" + exp + "\n" + (name == null ? "" : name) + "\n" + attachment + "\n" + max;
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public UploadTicket presignUpload(String key, String contentType, long maxBytes) {
        long exp = Instant.now().plus(Duration.ofMinutes(60)).getEpochSecond();
        String url = UriComponentsBuilder.fromPath("/api/files/local/upload")
                .queryParam("key", key).queryParam("exp", exp).queryParam("max", maxBytes)
                .queryParam("sig", sign("PUT", key, exp, null, false, maxBytes))
                .encode().build().toUriString();
        return new UploadTicket(key, url, "PUT", Map.of("Content-Type", contentType));
    }

    @Override
    public String signedUrl(String key, Duration ttl, String fileName, boolean attachment) {
        if (key == null) return null;
        long exp = Instant.now().plus(ttl).getEpochSecond();
        return UriComponentsBuilder.fromPath("/api/files/local/download")
                .queryParam("key", key).queryParam("exp", exp)
                .queryParam("name", fileName == null ? "" : fileName)
                .queryParam("dl", attachment)
                .queryParam("sig", sign("GET", key, exp, fileName == null ? "" : fileName, attachment, 0))
                .encode().build().toUriString();
    }

    @Override
    public long size(String key) {
        try {
            Path p = resolve(key);
            return Files.isRegularFile(p) ? Files.size(p) : -1;
        } catch (Exception e) {
            return -1;
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (Exception e) {
            log.warn("Could not delete {}: {}", key, e.getMessage());
        }
    }
}
