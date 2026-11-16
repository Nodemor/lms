package com.nodemore.lms.support;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "support_tickets")
public class SupportTicket extends BaseEntity {
    public enum Status { OPEN, IN_PROGRESS, RESOLVED, CLOSED }

    @Column(name = "user_id", nullable = false)
    private UUID userId;
    @Column(nullable = false)
    private String category;
    @Column(nullable = false)
    private String subject;
    @Column(nullable = false, columnDefinition = "text")
    private String message;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    @Column(name = "admin_reply", columnDefinition = "text")
    private String adminReply;
    @Column(name = "replied_at")
    private Instant repliedAt;
}
