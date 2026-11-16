package com.nodemore.lms.security;

import com.nodemore.lms.common.RequestUtils;
import com.nodemore.lms.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * Fixed-window rate limiting backed by Redis so it works across several API instances.
 * Fails open (allows the request) if Redis is unavailable, so an outage never locks users out.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final StringRedisTemplate redis;
    private final AppProperties props;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String p = request.getRequestURI();
        return !props.getRateLimit().isEnabled() || !p.startsWith("/api/")
                || p.startsWith("/api/live/webhook");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean auth = path.startsWith("/api/auth/") && !path.equals("/api/auth/refresh");
        int limit = auth ? props.getRateLimit().getAuthPerMinute() : props.getRateLimit().getApiPerMinute();
        long window = System.currentTimeMillis() / 60000;
        String key = "rl:" + (auth ? "auth:" : "api:") + RequestUtils.clientIp(request) + ":" + window;
        try {
            Long count = redis.opsForValue().increment(key);
            if (count != null && count == 1L) redis.expire(key, Duration.ofSeconds(70));
            if (count != null && count > limit) {
                response.setStatus(429);
                response.setHeader("Retry-After", "60");
                response.setContentType("application/json");
                response.getWriter().write("{\"status\":429,\"code\":\"error.rate_limited\",\"message\":\"Too many requests. Please wait a minute and try again.\"}");
                return;
            }
        } catch (Exception e) {
            log.debug("Rate limiter unavailable: {}", e.getMessage());
        }
        chain.doFilter(request, response);
    }
}
