package com.nodemore.lms.support;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByStatus(SupportTicket.Status status);

    @Query("select t from SupportTicket t where (:status is null or t.status = :status)")
    Page<SupportTicket> search(@Param("status") SupportTicket.Status status, Pageable pageable);
}
