
package com.govbudget.management.operational.expenditure.repository;

import com.govbudget.management.operational.expenditure.entity.OperationalExpenditure;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OperationalExpenditureRepository
        extends JpaRepository<OperationalExpenditure, Long> {

    // Get all expenditures
    List<OperationalExpenditure> findAllByOrderByIdDesc();

    // Get expenditures by budget head
    List<OperationalExpenditure>
    findByOperationalBudgetHeadIdOrderByIdDesc(Long operationalBudgetHeadId);

    // Get expenditures by status
    List<OperationalExpenditure> findByStatusOrderByIdDesc(String status);

    // Get expenditures by budget head and status
    List<OperationalExpenditure>
    findByOperationalBudgetHeadIdAndStatusOrderByIdDesc(
            Long operationalBudgetHeadId,
            String status
    );

    // Calculate total expenditure by status
    List<OperationalExpenditure>
    findByOperationalBudgetHeadIdAndStatus(
            Long operationalBudgetHeadId,
            String status
    );
}
