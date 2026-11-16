package com.nodemore.lms.classroom;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ClassDto(UUID id, UUID teacherId, String teacherName, String title, String description, String subject,
                       String gradeLevel, String medium, String thumbnailKey, String thumbnailUrl, String scheduleText,
                       EnrollmentMode enrollmentMode, BillingType billingType, BigDecimal fee, String currency,
                       Integer maxStudents, ClassStatus status, long studentCount, Instant createdAt) {
}
