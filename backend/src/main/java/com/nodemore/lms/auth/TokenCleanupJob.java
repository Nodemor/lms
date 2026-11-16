package com.nodemore.lms.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
public class TokenCleanupJob {
    private final OneTimeTokenRepository otts;
    private final RefreshTokenRepository refreshTokens;

    @Scheduled(cron = "0 15 3 * * *")
    @Transactional
    public void cleanup() {
        Instant before = Instant.now().minus(7, ChronoUnit.DAYS);
        otts.deleteExpired(before);
        refreshTokens.deleteExpired(before);
    }
}
