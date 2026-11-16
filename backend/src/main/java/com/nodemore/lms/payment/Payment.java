package com.nodemore.lms.payment;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {
    @Column(name = "order_id", nullable = false, unique = true)
    private String orderId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentEnums.Type type;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentEnums.Method method;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentEnums.Status status;
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;
    @Column(name = "student_id")
    private UUID studentId;
    @Column(name = "class_id")
    private UUID classId;
    @Column(name = "plan_id")
    private UUID planId;
    /** yyyy-MM for monthly class fees. */
    @Column(name = "period_month")
    private String periodMonth;
    @Column(nullable = false)
    private BigDecimal amount;
    @Column(nullable = false)
    private String currency;
    @Column(name = "gateway_ref")
    private String gatewayRef;
    @Column(name = "slip_key")
    private String slipKey;
    private String note;
    @Column(name = "verified_by")
    private UUID verifiedBy;
    @Column(name = "paid_at")
    private Instant paidAt;
}
