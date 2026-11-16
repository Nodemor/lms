package com.nodemore.lms.notification;

import com.nodemore.lms.common.Json;
import com.nodemore.lms.user.User;
import com.nodemore.lms.user.UserRepository;
import com.nodemore.lms.user.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class NotificationService {

    /** E-mails that are always sent: account security, payments and requests a teacher must act on. */
    private static final Set<String> ESSENTIAL = Set.of("PASSWORD_CHANGED", "PAYMENT_CONFIRMED", "PAYMENT_REJECTED",
            "SUBSCRIPTION_ACTIVATED", "ENROLLMENT_APPROVED", "TICKET_REPLIED", "PAYMENT_PENDING_REVIEW", "ENROLLMENT_REQUEST");

    private final NotificationRepository repo;
    private final UserRepository users;
    private final EmailService email;
    private final com.nodemore.lms.config.AppProperties props;

    @Transactional
    public void notify(UUID userId, String type, Map<String, ?> params, String link, boolean sendEmail) {
        notifyMany(List.of(userId), type, params, link, sendEmail);
    }

    /** Creates one notification per user and (optionally) e-mails each in their own language. */
    @Transactional
    public void notifyMany(Collection<UUID> userIds, String type, Map<String, ?> params, String link, boolean sendEmail) {
        if (userIds == null || userIds.isEmpty()) return;
        Set<UUID> unique = new LinkedHashSet<>(userIds);
        String json = Json.write(params == null ? Map.of() : params);
        List<Notification> batch = new ArrayList<>(unique.size());
        for (UUID id : unique) {
            Notification n = new Notification();
            n.setUserId(id);
            n.setType(type);
            n.setParamsJson(json);
            n.setLink(link);
            batch.add(n);
        }
        repo.saveAll(batch);
        // With a Gmail sender (daily limit), class updates stay in the app (bell) and only essentials are e-mailed.
        if (sendEmail && !props.getMail().isClassUpdates() && !ESSENTIAL.contains(type)) sendEmail = false;
        if (sendEmail) {
            for (User u : users.findAllById(unique)) {
                if (u.getStatus() != UserStatus.ACTIVE) continue;
                if (!u.isEmailNotifications() && !ESSENTIAL.contains(type)) continue;
                Map<String, Object> p = new HashMap<>(params == null ? Map.of() : params);
                p.putIfAbsent("name", u.getFullName());
                email.sendTemplate(u.getEmail(), u.getPreferredLanguage(), type, p);
            }
        }
    }
}
