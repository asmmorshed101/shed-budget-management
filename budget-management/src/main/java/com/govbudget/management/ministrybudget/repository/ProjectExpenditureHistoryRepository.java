
package com.govbudget.management.ministrybudget.repository;

import com.govbudget.management.ministrybudget.entity.ProjectExpenditureHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ProjectExpenditureHistoryRepository
        extends JpaRepository<ProjectExpenditureHistory, Long> {

    // Existing methods - keep for Dashboard and Reports
    List<ProjectExpenditureHistory>
    findByProjectIdOrderByReportDateDescIdDesc(Long projectId);

    Optional<ProjectExpenditureHistory>
    findFirstByProjectIdAndReportDateLessThanOrderByReportDateDescIdDesc(
            Long projectId, LocalDate reportDate);

    Optional<ProjectExpenditureHistory>
    findFirstByProjectIdAndReportDateLessThanEqualOrderByReportDateDescIdDesc(
            Long projectId, LocalDate reportDate);

    boolean existsByProjectIdAndReportDate(
            Long projectId, LocalDate reportDate);

    // New methods - Budget Head wise history
    List<ProjectExpenditureHistory>
    findByProjectIdAndExpenseHeadIdOrderByReportDateDescIdDesc(
            Long projectId, Long expenseHeadId);

    Optional<ProjectExpenditureHistory>
    findFirstByProjectIdAndExpenseHeadIdAndReportDateLessThanEqualOrderByReportDateDescIdDesc(
            Long projectId,
            Long expenseHeadId,
            LocalDate reportDate);

    boolean existsByProjectIdAndExpenseHeadIdAndReportDate(
            Long projectId,
            Long expenseHeadId,
            LocalDate reportDate);
}
