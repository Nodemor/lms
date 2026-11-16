package com.nodemore.lms.payment;

import com.nodemore.lms.classroom.BillingType;
import com.nodemore.lms.classroom.ClassRoom;
import com.nodemore.lms.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Decides whether a student has paid for a class:
 * FREE classes are always open, ONE_TIME needs any paid payment, MONTHLY needs a payment for the
 * current calendar month (Sri Lanka time by default), which matches how tuition classes are billed.
 */
@Service
@RequiredArgsConstructor
public class PaymentAccessService {

    private final PaymentRepository payments;
    private final AppProperties props;

    public String currentPeriod() {
        return YearMonth.now(ZoneId.of(props.getTimezone())).toString();
    }

    public boolean hasPaidAccess(ClassRoom c, UUID studentId) {
        if (!c.isPaid()) return true;
        if (c.getBillingType() == BillingType.ONE_TIME) {
            return payments.existsByStudentIdAndClassIdAndStatus(studentId, c.getId(), PaymentEnums.Status.PAID);
        }
        return payments.existsByStudentIdAndClassIdAndPeriodMonthAndStatus(studentId, c.getId(), currentPeriod(),
                PaymentEnums.Status.PAID);
    }

    public Set<UUID> paidStudentIds(ClassRoom c) {
        if (c.getBillingType() == BillingType.ONE_TIME) {
            return new HashSet<>(payments.paidStudents(c.getId(), PaymentEnums.Status.PAID));
        }
        return new HashSet<>(payments.paidStudentsForPeriod(c.getId(), PaymentEnums.Status.PAID, currentPeriod()));
    }
}
