package com.nodemore.lms.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    List<Lesson> findByClassIdOrderByPositionAscCreatedAtAsc(UUID classId);

    long countByTeacherId(UUID teacherId);

    long countByClassIdAndPublishedTrue(UUID classId);

    @Query("select coalesce(sum(l.sizeBytes + l.notesSizeBytes), 0) from Lesson l where l.teacherId = :teacherId")
    long sumSizeByTeacher(@Param("teacherId") UUID teacherId);

    @Query("select coalesce(max(l.position), 0) from Lesson l where l.classId = :classId")
    int maxPosition(@Param("classId") UUID classId);
}
