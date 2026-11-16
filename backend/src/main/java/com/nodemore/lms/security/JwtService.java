package com.nodemore.lms.security;

import com.nodemore.lms.config.AppProperties;
import com.nodemore.lms.user.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final String ISSUER = "nodemore-lms";
    private final AppProperties props;
    private SecretKey key;

    public JwtService(AppProperties props) {
        this.props = props;
    }

    @PostConstruct
    void init() {
        String secret = props.getJwt().getSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret (JWT_SECRET) must be set to a base64 value of at least 32 bytes");
        }
        byte[] bytes = Decoders.BASE64.decode(secret);
        if (bytes.length < 32) throw new IllegalStateException("JWT_SECRET must decode to at least 32 bytes");
        this.key = Keys.hmacShaKeyFor(bytes);
    }

    public long accessTtlSeconds() {
        return props.getJwt().getAccessTtlMinutes() * 60;
    }

    public String createAccessToken(UUID userId, String email, Role role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(ISSUER)
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(props.getJwt().getAccessTtlMinutes(), ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    /** @return principal or null when invalid/expired. */
    public UserPrincipal parse(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(key).requireIssuer(ISSUER).build()
                    .parseSignedClaims(token).getPayload();
            return new UserPrincipal(UUID.fromString(c.getSubject()), c.get("email", String.class),
                    Role.valueOf(c.get("role", String.class)));
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
