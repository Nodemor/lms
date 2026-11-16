package com.nodemore.lms.live;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

    Optional<Attendance> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);

    List<Attendance> findBySessionId(UUID sessionId);

    List<Attendance> findByClassIdAndStudentId(UUID classId, UUID studentId);

    long countByClassIdAndStudentIdAndPresentTrue(UUID classId, UUID studentId);

    @Query("select a.studentId, count(a) from Attendance a where a.classId = :classId and a.present = true group by a.studentId")
    List<Object[]> presentCountsByStudent(@Param("classId") UUID classId);

    @Query("select count(a) from Attendance a where a.classId = :classId and a.present = true")
    long countPresentInClass(@Param("classId") UUID classId);
}
