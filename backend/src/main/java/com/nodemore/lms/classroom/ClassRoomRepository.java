package com.nodemore.lms.classroom;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ClassRoomRepository extends JpaRepository<ClassRoom, UUID> {

    long countByTeacherIdAndStatusNot(UUID teacherId, ClassStatus status);

    long countByTeacherIdAndStatus(UUID teacherId, ClassStatus status);

    long countByStatus(ClassStatus status);

    List<ClassRoom> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);

    List<ClassRoom> findByTeacherIdAndStatusNot(UUID teacherId, ClassStatus status);

    /** Public catalogue. All text filters must be non-null ("" = any). */
    @Query("""
        select c from ClassRoom c
        where c.status = :status
          and (lower(c.title) like lower(concat('%', :q, '%')) or lower(c.subject) like lower(concat('%', :q, '%'))
               or lower(coalesce(c.description, '')) like lower(concat('%', :q, '%')))
          and (:subject = '' or lower(c.subject) = lower(:subject))
          and (:grade = '' or lower(coalesce(c.gradeLevel, '')) = lower(:grade))
          and (:medium = '' or c.medium = :medium)
        """)
    Page<ClassRoom> searchPublic(@Param("status") ClassStatus status, @Param("q") String q,
                                 @Param("subject") String subject, @Param("grade") String grade,
                                 @Param("medium") String medium, Pageable pageable);

    @Query("""
        select c from ClassRoom c
        where (:status is null or c.status = :status)
          and (lower(c.title) like lower(concat('%', :q, '%')) or lower(c.subject) like lower(concat('%', :q, '%')))
        """)
    Page<ClassRoom> searchAdmin(@Param("status") ClassStatus status, @Param("q") String q, Pageable pageable);

    @Query("select distinct c.subject from ClassRoom c where c.status = :status order by c.subject")
    List<String> distinctSubjects(@Param("status") ClassStatus status);
}
