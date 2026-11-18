
package com.govbudget.management.ministrybudget.repository;

import com.govbudget.management.ministrybudget.entity.CategoryBudgetSource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryBudgetSourceRepository
        extends JpaRepository<CategoryBudgetSource, Long> {

    List<CategoryBudgetSource> findByCategoryId(Long categoryId);

    Optional<CategoryBudgetSource> findByCategoryIdAndSourceCode(
            Long categoryId, String sourceCode);
}
