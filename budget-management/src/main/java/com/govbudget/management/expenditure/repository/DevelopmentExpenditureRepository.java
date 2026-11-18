package com.govbudget.management.expenditure.repository;

import com.govbudget.management.expenditure.entity.DevelopmentExpenditure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface DevelopmentExpenditureRepository
        extends JpaRepository<DevelopmentExpenditure, Long> {

    List<DevelopmentExpenditure> findByBudgetAllocationId(Long budgetAllocationId);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0)
        FROM DevelopmentExpenditure e
        WHERE e.budgetAllocationId = :allocationId
        AND e.status = 'APPROVED'
    """)
    BigDecimal getTotalApprovedExpenditure(
            @Param("allocationId") Long allocationId
    );
}