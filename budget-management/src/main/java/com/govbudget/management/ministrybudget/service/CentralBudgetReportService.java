
package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.CentralBudgetReportResponse;
import com.govbudget.management.ministrybudget.entity.*;
import com.govbudget.management.ministrybudget.repository.*;
import com.govbudget.management.organization.entity.Organization;
import com.govbudget.management.organization.repository.OrganizationRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class CentralBudgetReportService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final MinistryBudgetRepository budgetRepository;
    private final MinistryBudgetCategoryRepository categoryRepository;
    private final CategoryBudgetSourceRepository sourceRepository;
    private final OfficeBudgetAllocationRepository officeRepository;
    private final ProjectRepository projectRepository;
    private final ProjectExpenditureHistoryRepository projectHistoryRepository;
    private final OfficeExpenditureHistoryRepository officeHistoryRepository;
    private final OrganizationRepository organizationRepository;

    public CentralBudgetReportService(
            MinistryBudgetRepository budgetRepository,
            MinistryBudgetCategoryRepository categoryRepository,
            CategoryBudgetSourceRepository sourceRepository,
            OfficeBudgetAllocationRepository officeRepository,
            ProjectRepository projectRepository,
            ProjectExpenditureHistoryRepository projectHistoryRepository,
            OfficeExpenditureHistoryRepository officeHistoryRepository,
            OrganizationRepository organizationRepository) {

        this.budgetRepository = budgetRepository;
        this.categoryRepository = categoryRepository;
        this.sourceRepository = sourceRepository;
        this.officeRepository = officeRepository;
        this.projectRepository = projectRepository;
        this.projectHistoryRepository = projectHistoryRepository;
        this.officeHistoryRepository = officeHistoryRepository;
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public CentralBudgetReportResponse getReport(
            Long fiscalYearId,
            UUID organizationId,
            LocalDate fromDate,
            LocalDate toDate) {

        if (fromDate == null || toDate == null || fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("Invalid date range");
        }

        MinistryBudget budget = budgetRepository
                .findByFiscalYearIdAndOrganizationId(
                        fiscalYearId, organizationId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Ministry budget not found"));

        List<CentralBudgetReportResponse.OfficeReportRow> rows =
                new ArrayList<>();

        BigDecimal totalBudget = ZERO;
        BigDecimal totalOpening = ZERO;
        BigDecimal totalPeriod = ZERO;
        BigDecimal totalClosing = ZERO;

        for (MinistryBudgetCategory category :
                categoryRepository.findByMinistryBudgetId(budget.getId())) {

            // SEDP has no office-wise expenditure workflow.
            if ("SEDP".equals(category.getCategoryCode())) {
                continue;
            }

            for (CategoryBudgetSource source :
                    sourceRepository.findByCategoryId(category.getId())) {

                for (OfficeBudgetAllocation allocation :
                        officeRepository.findByCategorySourceId(source.getId())) {

                    Organization office = organizationRepository
                            .findById(allocation.getOrganizationId())
                            .orElseThrow(() ->
                                    new IllegalArgumentException("Office not found"));

                    BigDecimal opening = ZERO;
                    BigDecimal closing = ZERO;

                    if ("DEVELOPMENT".equals(category.getCategoryCode())
                            && "ADP".equals(source.getSourceCode())) {

                        for (Project project :
                                projectRepository.findByOfficeBudgetAllocationId(
                                        allocation.getId())) {

                            opening = opening.add(
                                    projectExpenditureBefore(
                                            project.getId(), fromDate));

                            closing = closing.add(
                                    projectExpenditureAsOf(
                                            project.getId(), toDate));
                        }

                    } else {
                        opening = officeExpenditureBefore(
                                allocation.getId(), fromDate);

                        closing = officeExpenditureAsOf(
                                allocation.getId(), toDate);
                    }

                    BigDecimal period = closing.subtract(opening);
                    BigDecimal remaining =
                            allocation.getAllocatedAmount().subtract(closing);

                    rows.add(new CentralBudgetReportResponse.OfficeReportRow(
                            allocation.getId(),
                            office.getId(),
                            office.getName(),
                            category.getCategoryCode(),
                            source.getSourceCode(),
                            allocation.getAllocatedAmount(),
                            opening,
                            period,
                            closing,
                            remaining
                    ));

                    totalBudget = totalBudget.add(
                            allocation.getAllocatedAmount());
                    totalOpening = totalOpening.add(opening);
                    totalPeriod = totalPeriod.add(period);
                    totalClosing = totalClosing.add(closing);
                }
            }
        }

        BigDecimal remaining = totalBudget.subtract(totalClosing);

        return new CentralBudgetReportResponse(
                fiscalYearId,
                fromDate,
                toDate,
                totalBudget,
                totalOpening,
                totalPeriod,
                totalClosing,
                remaining,
                rows
        );
    }

    private BigDecimal projectExpenditureBefore(
            Long projectId, LocalDate date) {

        return projectHistoryRepository
                .findFirstByProjectIdAndReportDateLessThanOrderByReportDateDescIdDesc(
                        projectId, date)
                .map(ProjectExpenditureHistory::getCumulativeAmount)
                .orElse(ZERO);
    }

    private BigDecimal projectExpenditureAsOf(
            Long projectId, LocalDate date) {

        return projectHistoryRepository
                .findFirstByProjectIdAndReportDateLessThanEqualOrderByReportDateDescIdDesc(
                        projectId, date)
                .map(ProjectExpenditureHistory::getCumulativeAmount)
                .orElse(ZERO);
    }

    private BigDecimal officeExpenditureBefore(
            Long allocationId, LocalDate date) {

        return officeHistoryRepository
                .findFirstByOfficeBudgetAllocationIdAndReportDateLessThanEqualOrderByReportDateDescIdDesc(
                        allocationId, date.minusDays(1))
                .map(OfficeExpenditureHistory::getCumulativeAmount)
                .orElse(ZERO);
    }

    private BigDecimal officeExpenditureAsOf(
            Long allocationId, LocalDate date) {

        return officeHistoryRepository
                .findFirstByOfficeBudgetAllocationIdAndReportDateLessThanEqualOrderByReportDateDescIdDesc(
                        allocationId, date)
                .map(OfficeExpenditureHistory::getCumulativeAmount)
                .orElse(ZERO);
    }
}
