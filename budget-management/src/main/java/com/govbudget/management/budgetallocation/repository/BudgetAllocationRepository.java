package com.govbudget.management.budgetallocation.repository;

import com.govbudget.management.budgetallocation.entity.BudgetAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BudgetAllocationRepository
        extends JpaRepository<BudgetAllocation, Long> {

    List<BudgetAllocation> findByFiscalYearId(Long fiscalYearId);

    List<BudgetAllocation> findByOrganizationId(UUID organizationId);

    List<BudgetAllocation> findByStatus(String status);

    List<BudgetAllocation> findByFiscalYearIdAndOrganizationIdAndBudgetTypeId(
            Long fiscalYearId,
            UUID organizationId,
            Short budgetTypeId
    );

    boolean existsByFiscalYearIdAndOrganizationIdAndBudgetTypeIdAndBudgetSourceId(
            Long fiscalYearId,
            UUID organizationId,
            Short budgetTypeId,
            Short budgetSourceId
    );
}