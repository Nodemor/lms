package com.nodemore.lms.audit;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "audit_logs")
public class AuditLog extends BaseEntity {
    @Column(name = "actor_id")
    private UUID actorId;
    @Column(name = "actor_email")
    private String actorEmail;
    @Column(nullable = false)
    private String action;
    @Column(name = "entity_type")
    private String entityType;
    @Column(name = "entity_id")
    private String entityId;
    @Column(columnDefinition = "text")
    private String details;
    @Column(name = "ip_address")
    private String ipAddress;
}
