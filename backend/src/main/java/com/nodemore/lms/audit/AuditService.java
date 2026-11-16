package com.nodemore.lms.audit;

import com.nodemore.lms.common.RequestUtils;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repo;

    /** Records an action by the currently signed-in user. */
    public void log(String action, String entityType, String entityId, String details) {
        UserPrincipal p = CurrentUser.getOrNull();
        logAs(p == null ? null : p.id(), p == null ? null : p.email(), action, entityType, entityId, details);
    }

    /** Separate transaction so security events (e.g. failed logins) are kept even if the caller rolls back. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAs(UUID actorId, String actorEmail, String action, String entityType, String entityId, String details) {
        try {
            AuditLog a = new AuditLog();
            a.setActorId(actorId);
            a.setActorEmail(actorEmail);
            a.setAction(action);
            a.setEntityType(entityType);
            a.setEntityId(entityId);
            a.setDetails(RequestUtils.truncate(details, 2000));
            a.setIpAddress(RequestUtils.currentIp());
            repo.save(a);
        } catch (Exception e) {
            log.error("Failed to write audit log {}", action, e);
        }
    }
}
