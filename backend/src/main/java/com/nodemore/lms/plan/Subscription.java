package com.nodemore.lms.plan;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "subscriptions")
public class Subscription extends BaseEntity {
    public enum Status { ACTIVE, PAST_DUE, CANCELLED }

    @Column(name = "teacher_id", nullable = false, unique = true)
    private UUID teacherId;
    @Column(name = "plan_id", nullable = false)
    private UUID planId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    @Column(name = "current_period_start", nullable = false)
    private Instant currentPeriodStart;
    @Column(name = "current_period_end")
    private Instant currentPeriodEnd;
}
