package com.nodemore.lms.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRole(Role role);

    long countByRole(Role role);

    long countByRoleAndStatus(Role role, UserStatus status);

    @Query("""
        select u from User u
        where (:role is null or u.role = :role)
          and (:status is null or u.status = :status)
          and (lower(u.fullName) like lower(concat('%', :q, '%'))
               or lower(u.email) like lower(concat('%', :q, '%')))
        """)
    /** q must never be null: pass "" to match everything. */
    Page<User> search(@Param("role") Role role, @Param("status") UserStatus status,
                      @Param("q") String q, Pageable pageable);
}
