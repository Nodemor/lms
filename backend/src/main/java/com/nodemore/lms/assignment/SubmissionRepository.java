package com.nodemore.lms.assignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    Optional<Submission> findByAssignmentIdAndStudentId(UUID assignmentId, UUID studentId);

    List<Submission> findByAssignmentIdOrderBySubmittedAtDesc(UUID assignmentId);

    List<Submission> findByClassIdAndStudentId(UUID classId, UUID studentId);

    List<Submission> findTop5ByStudentIdAndStatusOrderByGradedAtDesc(UUID studentId, Submission.Status status);

    long countByTeacherIdAndStatus(UUID teacherId, Submission.Status status);

    List<Submission> findTop200ByStudentIdOrderBySubmittedAtDesc(UUID studentId);

    @Query("select s.assignmentId, count(s) from Submission s where s.assignmentId in :ids group by s.assignmentId")
    List<Object[]> countByAssignments(@Param("ids") Collection<UUID> ids);

    @Query("select s.studentId from Submission s where s.assignmentId = :assignmentId")
    List<UUID> submittedStudentIds(@Param("assignmentId") UUID assignmentId);

    @Query("select s.assignmentId from Submission s where s.studentId = :studentId and s.assignmentId in :ids")
    List<UUID> submittedAssignmentIds(@Param("studentId") UUID studentId, @Param("ids") Collection<UUID> ids);

    @Query("select s.studentId, count(s) from Submission s where s.classId = :classId group by s.studentId")
    List<Object[]> countByStudentInClass(@Param("classId") UUID classId);
}
