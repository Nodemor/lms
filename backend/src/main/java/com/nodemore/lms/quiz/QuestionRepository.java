package com.nodemore.lms.quiz;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByQuizIdOrderByPositionAsc(UUID quizId);

    @Modifying
    @Query("delete from Question q where q.quizId = :quizId")
    int deleteByQuiz(@Param("quizId") UUID quizId);

    @Query("select q.quizId, count(q) from Question q where q.quizId in :ids group by q.quizId")
    List<Object[]> countByQuizzes(@Param("ids") Collection<UUID> ids);
}
