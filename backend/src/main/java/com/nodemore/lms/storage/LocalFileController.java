package com.nodemore.lms.storage;

import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.Hashing;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/** Upload/download endpoints for local storage. Every call must carry a valid, unexpired HMAC signature. */
@RestController
@RequestMapping("/api/files/local")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalFileController {

    private final LocalStorageService storage;

    @PutMapping("/upload")
    public Map<String, Object> upload(@RequestParam String key, @RequestParam long exp, @RequestParam long max,
                                      @RequestParam String sig, HttpServletRequest request) throws IOException {
        verify(sig, storage.sign("PUT", key, exp, null, false, max), exp);
        Path target = storage.resolve(key);
        Files.createDirectories(target.getParent());
        Path tmp = Files.createTempFile(target.getParent(), "up-", ".part");
        long written = 0;
        try (InputStream in = request.getInputStream(); OutputStream out = Files.newOutputStream(tmp)) {
            byte[] buf = new byte[64 * 1024];
            int r;
            while ((r = in.read(buf)) != -1) {
                written += r;
                if (written > max) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "error.file_too_large");
                out.write(buf, 0, r);
            }
        } catch (RuntimeException | IOException e) {
            Files.deleteIfExists(tmp);
            throw e;
        }
        Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        return Map.of("ok", true, "size", written);
    }

    @GetMapping("/download")
    public ResponseEntity<Resource> download(@RequestParam String key, @RequestParam long exp,
                                             @RequestParam(defaultValue = "") String name,
                                             @RequestParam(defaultValue = "false") boolean dl,
                                             @RequestParam String sig) throws IOException {
        verify(sig, storage.sign("GET", key, exp, name, dl, 0), exp);
        Path p = storage.resolve(key);
        if (!Files.isRegularFile(p)) throw ApiException.notFound();
        String fileName = name.isBlank() ? p.getFileName().toString() : name;
        ContentDisposition cd = (dl ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(fileName, StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(FileKeys.mediaTypeFor(p.getFileName().toString()))
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePrivate())
                .body(new FileSystemResource(p));
    }

    private static void verify(String given, String expected, long exp) {
        if (Instant.now().getEpochSecond() > exp || !Hashing.constantTimeEquals(given, expected)) {
            throw ApiException.forbidden();
        }
    }
}
