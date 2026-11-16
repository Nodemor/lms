package com.nodemore.lms.assignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
    List<Assignment> findByClassIdOrderByDueAtDesc(UUID classId);

    List<Assignment> findByPublishedTrueAndReminderSentFalseAndDueAtBetween(Instant from, Instant to);

    long countByClassIdAndPublishedTrue(UUID classId);

    @Query("select a from Assignment a where a.classId in :classIds and a.published = true and a.dueAt >= :from order by a.dueAt asc")
    List<Assignment> openForClasses(@Param("classIds") Collection<UUID> classIds, @Param("from") Instant from);
}
