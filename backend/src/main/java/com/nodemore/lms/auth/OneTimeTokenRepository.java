package com.nodemore.lms.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface OneTimeTokenRepository extends JpaRepository<OneTimeToken, UUID> {

    Optional<OneTimeToken> findFirstByUserIdAndPurposeOrderByCreatedAtDesc(UUID userId, TokenPurpose purpose);

    Optional<OneTimeToken> findByTokenHashAndPurpose(String tokenHash, TokenPurpose purpose);

    @Modifying
    @Query("update OneTimeToken t set t.usedAt = :now where t.userId = :userId and t.purpose = :purpose and t.usedAt is null")
    int invalidateAll(@Param("userId") UUID userId, @Param("purpose") TokenPurpose purpose, @Param("now") Instant now);

    @Modifying
    @Query("delete from OneTimeToken t where t.expiresAt < :before")
    int deleteExpired(@Param("before") Instant before);
}
