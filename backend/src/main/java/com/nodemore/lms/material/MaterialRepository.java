package com.nodemore.lms.material;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MaterialRepository extends JpaRepository<Material, UUID> {

    List<Material> findByClassIdOrderByCreatedAtDesc(UUID classId);

    long countByTeacherId(UUID teacherId);

    @Query("select coalesce(sum(m.sizeBytes), 0) from Material m where m.teacherId = :teacherId")
    long sumSizeByTeacher(@Param("teacherId") UUID teacherId);
}
