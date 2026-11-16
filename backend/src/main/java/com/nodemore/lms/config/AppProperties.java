package com.nodemore.lms.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String frontendUrl = "http://localhost:5173";
    private String backendUrl = "http://localhost:8080";
    private String timezone = "Asia/Colombo";
    private List<String> corsAllowedOrigins = new ArrayList<>(List.of("http://localhost:5173"));

    private Jwt jwt = new Jwt();
    private Storage storage = new Storage();
    private LiveKit livekit = new LiveKit();
    private Mail mail = new Mail();
    private Admin admin = new Admin();
    private RateLimit rateLimit = new RateLimit();

    @Getter @Setter
    public static class Jwt {
        /** Base64 encoded secret, at least 32 bytes after decoding. */
        private String secret;
        private long accessTtlMinutes = 15;
        private long refreshTtlDays = 14;
        private boolean cookieSecure = false;
    }

    @Getter @Setter
    public static class Storage {
        /** local | s3 (Cloudflare R2 or any S3 compatible storage) */
        private String provider = "local";
        private String localDir = "./data/uploads";
        /** HMAC secret used to sign local file URLs. */
        private String signingSecret = "change-me-local-signing-secret";
        private String s3Endpoint;
        private String s3Region = "auto";
        private String s3Bucket;
        private String s3AccessKey;
        private String s3SecretKey;
        private long maxVideoMb = 2048;
        private long maxDocumentMb = 50;
        private long maxImageMb = 5;
    }

    @Getter @Setter
    public static class LiveKit {
        private String url = "ws://localhost:7880";
        private String apiKey;
        private String apiSecret;
    }

    @Getter @Setter
    public static class Mail {
        private String from = "NodeMor Academy <no-reply@nodemor.io>";
        /** Replies from students/teachers go here (e.g. the academy's Gmail). */
        private String replyTo;
        /**
         * Also e-mail class updates (new lessons, notes, reminders, announcements...).
         * Turn OFF when sending through a Gmail account (about 500 e-mails/day): users still get them
         * in the app, and only essential e-mails (codes, payments, join requests) are sent.
         */
        private boolean classUpdates = true;
        private boolean enabled = true;
    }

    @Getter @Setter
    public static class Admin {
        private String email;
        private String password;
        private String name = "Super Admin";
    }

    @Getter @Setter
    public static class RateLimit {
        private boolean enabled = true;
        private int authPerMinute = 20;
        private int apiPerMinute = 600;
    }
}
