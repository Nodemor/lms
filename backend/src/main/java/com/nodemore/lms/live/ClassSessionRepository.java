package com.nodemore.lms.live;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassSessionRepository extends JpaRepository<ClassSession, UUID> {

    List<ClassSession> findByClassIdOrderByScheduledStartDesc(UUID classId);

    Optional<ClassSession> findByRoomName(String roomName);

    List<ClassSession> findByStatusAndReminderSentFalseAndScheduledStartBetween(SessionStatus status, Instant from, Instant to);

    List<ClassSession> findByStatusAndStartedAtBefore(SessionStatus status, Instant before);

    long countByClassIdAndStatus(UUID classId, SessionStatus status);

    List<ClassSession> findByStatusAndMeetingUrlIsNotNullAndScheduledStartBefore(SessionStatus status, Instant before);

    List<ClassSession> findByStatusAndInPersonTrueAndScheduledStartBefore(SessionStatus status, Instant before);

    Optional<ClassSession> findFirstByTeacherIdAndMeetingUrlIsNotNullOrderByCreatedAtDesc(UUID teacherId);

    long countByStatus(SessionStatus status);

    @Query("""
        select s from ClassSession s
        where s.classId in :classIds and s.status in :statuses and s.scheduledStart >= :from
        order by s.scheduledStart asc
        """)
    List<ClassSession> upcoming(@Param("classIds") Collection<UUID> classIds,
                                @Param("statuses") Collection<SessionStatus> statuses,
                                @Param("from") Instant from, Pageable pageable);

    @Query("select s from ClassSession s where s.classId in :classIds and s.status = :status")
    List<ClassSession> byClassesAndStatus(@Param("classIds") Collection<UUID> classIds, @Param("status") SessionStatus status);

    @Query("select count(s) from ClassSession s where s.teacherId = :teacherId and s.status = :status and s.scheduledStart >= :from")
    long countUpcomingForTeacher(@Param("teacherId") UUID teacherId, @Param("status") SessionStatus status, @Param("from") Instant from);
}
