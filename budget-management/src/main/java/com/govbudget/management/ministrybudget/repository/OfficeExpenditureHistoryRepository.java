
package com.govbudget.management.ministrybudget.repository;

import com.govbudget.management.ministrybudget.entity.OfficeExpenditureHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OfficeExpenditureHistoryRepository
        extends JpaRepository<OfficeExpenditureHistory, Long> {

    // Existing methods - keep for Dashboard and Reports
    List<OfficeExpenditureHistory>
    findByOfficeBudgetAllocationIdOrderByReportDateDescIdDesc(
            Long officeBudgetAllocationId);

    Optional<OfficeExpenditureHistory>
    findFirstByOfficeBudgetAllocationIdAndReportDateLessThanEqualOrderByReportDateDescIdDesc(
            Long officeBudgetAllocationId, LocalDate reportDate);

    boolean existsByOfficeBudgetAllocationIdAndReportDate(
            Long officeBudgetAllocationId, LocalDate reportDate);

    // New methods - Budget Head wise history
    List<OfficeExpenditureHistory>
    findByOfficeBudgetAllocationIdAndExpenseHeadIdOrderByReportDateDescIdDesc(
            Long officeBudgetAllocationId, Long expenseHeadId);

    Optional<OfficeExpenditureHistory>
    findFirstByOfficeBudgetAllocationIdAndExpenseHeadIdAndReportDateLessThanEqualOrderByReportDateDescIdDesc(
            Long officeBudgetAllocationId,
            Long expenseHeadId,
            LocalDate reportDate);

    boolean existsByOfficeBudgetAllocationIdAndExpenseHeadIdAndReportDate(
            Long officeBudgetAllocationId,
            Long expenseHeadId,
            LocalDate reportDate);
}
