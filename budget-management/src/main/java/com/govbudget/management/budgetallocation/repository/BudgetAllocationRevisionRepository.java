
package com.govbudget.management.budgetallocation.repository;

import com.govbudget.management.budgetallocation.entity.BudgetAllocationRevision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetAllocationRevisionRepository
        extends JpaRepository<BudgetAllocationRevision, Long> {

    List<BudgetAllocationRevision>
        findByBudgetAllocationIdOrderByRevisionNoDesc(Long budgetAllocationId);

    Optional<BudgetAllocationRevision>
        findTopByBudgetAllocationIdOrderByRevisionNoDesc(Long budgetAllocationId);

    boolean existsByBudgetAllocationIdAndStatus(
        Long budgetAllocationId,
        String status
    );
}
