package com.govbudget.management.ministrybudget.repository;

import com.govbudget.management.ministrybudget.entity.BudgetHeadAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BudgetHeadAllocationRepository extends JpaRepository<BudgetHeadAllocation, Long> {
    List<BudgetHeadAllocation> findByOfficeBudgetAllocationId(Long officeBudgetAllocationId);
    List<BudgetHeadAllocation> findByProjectId(Long projectId);
    Optional<BudgetHeadAllocation> findByOfficeBudgetAllocationIdAndExpenseHeadId(Long officeBudgetAllocationId, Long expenseHeadId);
    Optional<BudgetHeadAllocation> findByProjectIdAndExpenseHeadId(Long projectId, Long expenseHeadId);
    boolean existsByOfficeBudgetAllocationId(Long officeBudgetAllocationId);
    boolean existsByProjectId(Long projectId);
    void deleteByOfficeBudgetAllocationId(Long officeBudgetAllocationId);
    void deleteByProjectId(Long projectId);
}
