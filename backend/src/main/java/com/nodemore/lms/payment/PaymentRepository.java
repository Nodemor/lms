package com.nodemore.lms.payment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByOrderId(String orderId);

    boolean existsByStudentIdAndClassIdAndStatus(UUID studentId, UUID classId, PaymentEnums.Status status);

    boolean existsByStudentIdAndClassIdAndPeriodMonthAndStatus(UUID studentId, UUID classId, String periodMonth,
                                                               PaymentEnums.Status status);

    @Query("select distinct p.studentId from Payment p where p.classId = :classId and p.status = :status")
    List<UUID> paidStudents(@Param("classId") UUID classId, @Param("status") PaymentEnums.Status status);

    @Query("select distinct p.studentId from Payment p where p.classId = :classId and p.status = :status and p.periodMonth = :period")
    List<UUID> paidStudentsForPeriod(@Param("classId") UUID classId, @Param("status") PaymentEnums.Status status,
                                     @Param("period") String period);

    Page<Payment> findByStudentId(UUID studentId, Pageable pageable);

    Page<Payment> findByTeacherIdAndType(UUID teacherId, PaymentEnums.Type type, Pageable pageable);

    Page<Payment> findByTeacherIdAndTypeAndStatus(UUID teacherId, PaymentEnums.Type type, PaymentEnums.Status status, Pageable pageable);

    Page<Payment> findByClassId(UUID classId, Pageable pageable);

    Page<Payment> findByClassIdAndStatus(UUID classId, PaymentEnums.Status status, Pageable pageable);

    @Query("select p from Payment p where (:status is null or p.status = :status) and (:type is null or p.type = :type)")
    Page<Payment> searchAdmin(@Param("status") PaymentEnums.Status status, @Param("type") PaymentEnums.Type type, Pageable pageable);

    long countByTeacherIdAndStatusAndMethod(UUID teacherId, PaymentEnums.Status status, PaymentEnums.Method method);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.status = :status and p.type = :type and p.paidAt >= :from")
    BigDecimal sumSince(@Param("status") PaymentEnums.Status status, @Param("type") PaymentEnums.Type type, @Param("from") Instant from);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.teacherId = :teacherId and p.status = :status and p.type = :type and p.paidAt >= :from")
    BigDecimal sumForTeacherSince(@Param("teacherId") UUID teacherId, @Param("status") PaymentEnums.Status status,
                                  @Param("type") PaymentEnums.Type type, @Param("from") Instant from);

    List<Payment> findByStatusAndMethodAndCreatedAtBefore(PaymentEnums.Status status, PaymentEnums.Method method, Instant before);
}
