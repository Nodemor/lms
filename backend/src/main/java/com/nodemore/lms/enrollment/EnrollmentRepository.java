package com.nodemore.lms.enrollment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    Optional<Enrollment> findByClassIdAndStudentId(UUID classId, UUID studentId);

    List<Enrollment> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    List<Enrollment> findByStudentIdAndStatus(UUID studentId, EnrollmentStatus status);

    List<Enrollment> findTop8ByTeacherIdOrderByCreatedAtDesc(UUID teacherId);

    long countByClassId(UUID classId);

    long countByClassIdAndStatus(UUID classId, EnrollmentStatus status);

    long countByTeacherIdAndStatus(UUID teacherId, EnrollmentStatus status);

    long countByStatus(EnrollmentStatus status);

    @Query("select count(distinct e.studentId) from Enrollment e where e.teacherId = :teacherId and e.status = :status")
    long countDistinctStudents(@Param("teacherId") UUID teacherId, @Param("status") EnrollmentStatus status);

    @Query("select e.classId, count(e) from Enrollment e where e.classId in :ids and e.status = :status group by e.classId")
    List<Object[]> countByClassIds(@Param("ids") Collection<UUID> ids, @Param("status") EnrollmentStatus status);

    @Query("select e.studentId from Enrollment e where e.classId = :classId and e.status = :status")
    List<UUID> studentIds(@Param("classId") UUID classId, @Param("status") EnrollmentStatus status);

    @Query("select e.classId from Enrollment e where e.studentId = :studentId and e.status = :status")
    List<UUID> classIdsForStudent(@Param("studentId") UUID studentId, @Param("status") EnrollmentStatus status);

    /** Text filter must be non-null ("" = any). */
    @Query("""
        select e from Enrollment e, User u
        where u.id = e.studentId and e.classId = :classId
          and (:status is null or e.status = :status)
          and (lower(u.fullName) like lower(concat('%', :q, '%')) or lower(u.email) like lower(concat('%', :q, '%')))
        """)
    Page<Enrollment> searchInClass(@Param("classId") UUID classId, @Param("status") EnrollmentStatus status,
                                   @Param("q") String q, Pageable pageable);
}
