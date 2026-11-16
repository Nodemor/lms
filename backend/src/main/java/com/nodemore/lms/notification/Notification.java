package com.nodemore.lms.notification;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * In-app notification. Only the {@code type} and its parameters are stored; the text is
 * produced by the frontend from notifications.&lt;TYPE&gt; in the active language, so every
 * notification (old and new) is shown in whichever language the user picks.
 */
@Getter
@Setter
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    @Column(nullable = false)
    private String type;
    @Column(name = "params_json", columnDefinition = "text")
    private String paramsJson;
    private String link;
    @Column(name = "read_at")
    private Instant readAt;
}
