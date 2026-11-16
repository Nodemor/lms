package com.nodemore.lms.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {

    Optional<LessonProgress> findByLessonIdAndStudentId(UUID lessonId, UUID studentId);

    List<LessonProgress> findByClassIdAndStudentId(UUID classId, UUID studentId);

    long countByClassIdAndStudentIdAndCompletedTrue(UUID classId, UUID studentId);

    @Query("select p.studentId, count(p) from LessonProgress p where p.classId = :classId and p.completed = true group by p.studentId")
    List<Object[]> completedCountsByStudent(@Param("classId") UUID classId);
}
