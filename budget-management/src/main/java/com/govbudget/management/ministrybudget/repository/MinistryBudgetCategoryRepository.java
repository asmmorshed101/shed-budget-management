
package com.govbudget.management.ministrybudget.repository;

import com.govbudget.management.ministrybudget.entity.MinistryBudgetCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MinistryBudgetCategoryRepository
        extends JpaRepository<MinistryBudgetCategory, Long> {

    List<MinistryBudgetCategory> findByMinistryBudgetId(Long ministryBudgetId);

    boolean existsByMinistryBudgetIdAndCategoryCode(
            Long ministryBudgetId, String categoryCode);
}
