package com.nodemore.lms.live;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

/**
 * Minimal LiveKit integration without extra SDK dependencies:
 * access tokens are HS256 JWTs signed with the API secret, webhooks are verified the same way.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LiveKitService {

    private final AppProperties props;
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean configured() {
        var lk = props.getLivekit();
        return lk.getApiKey() != null && !lk.getApiKey().isBlank() && lk.getApiSecret() != null && !lk.getApiSecret().isBlank();
    }

    public String serverUrl() {
        return props.getLivekit().getUrl();
    }

    public String joinToken(String identity, String name, String room, boolean teacher, long ttlSeconds) {
        if (!configured()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "error.live_unavailable");
        Map<String, Object> video = new LinkedHashMap<>();
        video.put("room", room);
        video.put("roomJoin", true);
        video.put("canSubscribe", true);
        video.put("canPublish", true);
        video.put("canPublishData", true);
        if (teacher) {
            video.put("roomAdmin", true);
        } else {
            // Students may speak and show their camera; screen sharing is reserved for the teacher.
            video.put("canPublishSources", List.of("camera", "microphone"));
        }
        long now = Instant.now().getEpochSecond();
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", props.getLivekit().getApiKey());
        claims.put("sub", identity);
        claims.put("name", name);
        claims.put("nbf", now - 10);
        claims.put("exp", now + ttlSeconds);
        claims.put("video", video);
        claims.put("metadata", teacher ? "{\"role\":\"teacher\"}" : "{\"role\":\"student\"}");
        return sign(claims);
    }

    private String serverToken(Map<String, Object> video) {
        long now = Instant.now().getEpochSecond();
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", props.getLivekit().getApiKey());
        claims.put("nbf", now - 10);
        claims.put("exp", now + 300);
        claims.put("video", video);
        return sign(claims);
    }

    private String sign(Map<String, Object> claims) {
        try {
            Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
            String header = enc.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
            String payload = enc.encodeToString(mapper.writeValueAsBytes(claims));
            String data = header + "." + payload;
            return data + "." + enc.encodeToString(hmac(data));
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign LiveKit token", e);
        }
    }

    private byte[] hmac(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(props.getLivekit().getApiSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }

    /** Verifies the Authorization JWT that LiveKit attaches to every webhook and returns the parsed event. */
    public JsonNode verifyWebhook(String authHeader, String body) {
        if (!configured() || authHeader == null || body == null) throw ApiException.forbidden();
        try {
            String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
            String[] parts = token.split("\\.");
            if (parts.length != 3) throw ApiException.forbidden();
            byte[] expectedSig = hmac(parts[0] + "." + parts[1]);
            byte[] givenSig = Base64.getUrlDecoder().decode(parts[2]);
            if (!MessageDigest.isEqual(expectedSig, givenSig)) throw ApiException.forbidden();
            JsonNode claims = mapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            if (claims.has("exp") && claims.get("exp").asLong() < Instant.now().getEpochSecond() - 60) throw ApiException.forbidden();
            if (!props.getLivekit().getApiKey().equals(claims.path("iss").asText())) throw ApiException.forbidden();
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(body.getBytes(StandardCharsets.UTF_8));
            String claimed = claims.path("sha256").asText("");
            boolean ok = claimed.equals(Base64.getEncoder().encodeToString(digest))
                    || claimed.equals(Base64.getUrlEncoder().encodeToString(digest))
                    || claimed.equals(Base64.getUrlEncoder().withoutPadding().encodeToString(digest));
            if (!ok) throw ApiException.forbidden();
            return mapper.readTree(body);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Invalid LiveKit webhook: {}", e.getMessage());
            throw ApiException.forbidden();
        }
    }

    /** Disconnects everybody when the teacher ends the class. Best effort. */
    public void deleteRoom(String room) {
        if (!configured()) return;
        try {
            String http = serverUrl().replaceFirst("^ws", "http");
            RestClient.create().post()
                    .uri(http + "/twirp/livekit.RoomService/DeleteRoom")
                    .header("Authorization", "Bearer " + serverToken(Map.of("roomCreate", true, "room", room)))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("room", room))
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.debug("LiveKit DeleteRoom failed for {}: {}", room, e.getMessage());
        }
    }
}
