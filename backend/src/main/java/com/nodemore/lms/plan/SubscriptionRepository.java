package com.nodemore.lms.plan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findByTeacherId(UUID teacherId);
    List<Subscription> findByStatusAndCurrentPeriodEndBefore(Subscription.Status status, Instant before);
    long countByStatusAndPlanIdNot(Subscription.Status status, UUID planId);
}
