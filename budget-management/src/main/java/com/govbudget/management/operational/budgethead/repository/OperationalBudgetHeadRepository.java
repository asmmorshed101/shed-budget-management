
package com.govbudget.management.operational.budgethead.repository;

import com.govbudget.management.operational.budgethead.entity.OperationalBudgetHead;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OperationalBudgetHeadRepository
        extends JpaRepository<OperationalBudgetHead, Long> {

    List<OperationalBudgetHead> findAllByOrderByIdDesc();

    List<OperationalBudgetHead> findByBudgetAllocationIdOrderByIdDesc(
            Long budgetAllocationId
    );

    Optional<OperationalBudgetHead> findByBudgetAllocationIdAndExpenseHeadId(
            Long budgetAllocationId,
            Long expenseHeadId
    );

    boolean existsByBudgetAllocationIdAndExpenseHeadId(
            Long budgetAllocationId,
            Long expenseHeadId
    );

    List<OperationalBudgetHead> findByStatusOrderByIdDesc(String status);
}
