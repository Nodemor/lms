package com.nodemore.lms.classroom;

import com.nodemore.lms.enrollment.EnrollmentRepository;
import com.nodemore.lms.enrollment.EnrollmentStatus;
import com.nodemore.lms.storage.StorageService;
import com.nodemore.lms.user.User;
import com.nodemore.lms.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Builds ClassDto lists with teacher names and student counts in two batched queries (no N+1). */
@Component
@RequiredArgsConstructor
public class ClassMapper {

    private final UserRepository users;
    private final EnrollmentRepository enrollments;
    private final StorageService storage;

    public List<ClassDto> toDtos(Collection<ClassRoom> classes) {
        if (classes.isEmpty()) return List.of();
        Set<UUID> teacherIds = classes.stream().map(ClassRoom::getTeacherId).collect(Collectors.toSet());
        Map<UUID, String> names = users.findAllById(teacherIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
        List<UUID> ids = classes.stream().map(ClassRoom::getId).toList();
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : enrollments.countByClassIds(ids, EnrollmentStatus.ACTIVE)) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return classes.stream().map(c -> toDto(c, names.getOrDefault(c.getTeacherId(), ""),
                counts.getOrDefault(c.getId(), 0L))).toList();
    }

    public ClassDto toDto(ClassRoom c) {
        return toDtos(List.of(c)).get(0);
    }

    private ClassDto toDto(ClassRoom c, String teacherName, long count) {
        String thumb = c.getThumbnailKey() == null ? null : storage.signedUrl(c.getThumbnailKey(), Duration.ofHours(6), null, false);
        return new ClassDto(c.getId(), c.getTeacherId(), teacherName, c.getTitle(), c.getDescription(), c.getSubject(),
                c.getGradeLevel(), c.getMedium(), c.getThumbnailKey(), thumb, c.getScheduleText(), c.getEnrollmentMode(),
                c.getBillingType(), c.getFee(), c.getCurrency(), c.getMaxStudents(), c.getStatus(), count, c.getCreatedAt());
    }

    public static <T> Map<UUID, T> index(Collection<T> items, Function<T, UUID> key) {
        Map<UUID, T> m = new HashMap<>();
        for (T t : items) m.put(key.apply(t), t);
        return m;
    }
}
