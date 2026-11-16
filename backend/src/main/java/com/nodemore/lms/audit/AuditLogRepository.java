package com.nodemore.lms.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query("""
        select a from AuditLog a
        where (:action = '' or a.action = :action)
          and (:q = '' or lower(coalesce(a.actorEmail, '')) like lower(concat('%', :q, '%')))
        """)
    Page<AuditLog> search(@Param("action") String action, @Param("q") String q, Pageable pageable);

    Page<AuditLog> findByActionIn(Collection<String> actions, Pageable pageable);
}
