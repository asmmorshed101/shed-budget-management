
package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.DashboardSummaryResponse;
import com.govbudget.management.ministrybudget.entity.*;
import com.govbudget.management.ministrybudget.repository.*;
import com.govbudget.management.organization.entity.Organization;
import com.govbudget.management.organization.repository.OrganizationRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
public class DashboardService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final MinistryBudgetRepository budgetRepository;
    private final MinistryBudgetCategoryRepository categoryRepository;
    private final CategoryBudgetSourceRepository sourceRepository;
    private final OfficeBudgetAllocationRepository officeRepository;
    private final ProjectRepository projectRepository;
    private final ProjectExpenditureHistoryRepository projectHistoryRepository;
    private final OfficeExpenditureHistoryRepository officeHistoryRepository;
    private final CategoryExpenditureHistoryRepository categoryHistoryRepository;
    private final OrganizationRepository organizationRepository;

    public DashboardService(
            MinistryBudgetRepository budgetRepository,
            MinistryBudgetCategoryRepository categoryRepository,
            CategoryBudgetSourceRepository sourceRepository,
            OfficeBudgetAllocationRepository officeRepository,
            ProjectRepository projectRepository,
            ProjectExpenditureHistoryRepository projectHistoryRepository,
            OfficeExpenditureHistoryRepository officeHistoryRepository,
            CategoryExpenditureHistoryRepository categoryHistoryRepository,
            OrganizationRepository organizationRepository) {

        this.budgetRepository = budgetRepository;
        this.categoryRepository = categoryRepository;
        this.sourceRepository = sourceRepository;
        this.officeRepository = officeRepository;
        this.projectRepository = projectRepository;
        this.projectHistoryRepository = projectHistoryRepository;
        this.officeHistoryRepository = officeHistoryRepository;
        this.categoryHistoryRepository = categoryHistoryRepository;
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(
            Long fiscalYearId,
            UUID organizationId,
            LocalDate asOfDate) {

        if (asOfDate == null) {
            throw new IllegalArgumentException("As-of date is required");
        }

        Organization ministry = organizationRepository.findById(organizationId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Ministry not found"));

        MinistryBudget budget = budgetRepository
                .findByFiscalYearIdAndOrganizationId(
                        fiscalYearId, organizationId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Ministry budget not found"));

        BigDecimal operationalBudget = ZERO;
        BigDecimal operationalExpenditure = ZERO;

        BigDecimal sedpBudget = ZERO;
        BigDecimal sedpExpenditure = ZERO;

        BigDecimal developmentBudget = ZERO;
        BigDecimal developmentExpenditure = ZERO;

        BigDecimal developmentAdpBudget = ZERO;
        BigDecimal developmentAdpExpenditure = ZERO;

        BigDecimal developmentBlockBudget = ZERO;
        BigDecimal developmentBlockExpenditure = ZERO;

        List<DashboardSummaryResponse.CategorySummary> summaries =
                new ArrayList<>();

        for (MinistryBudgetCategory category :
                categoryRepository.findByMinistryBudgetId(budget.getId())) {

            BigDecimal categoryBudget = category.getTotalAmount();
            BigDecimal categoryExpenditure = ZERO;

            if ("SEDP".equals(category.getCategoryCode())) {
                sedpBudget = categoryBudget;
                sedpExpenditure = categoryExpenditureAsOf(category.getId(), asOfDate);
                categoryExpenditure = sedpExpenditure;
            }

            for (CategoryBudgetSource source :
                    sourceRepository.findByCategoryId(category.getId())) {

                for (OfficeBudgetAllocation office :
                        officeRepository.findByCategorySourceId(source.getId())) {

                    if ("OPERATIONAL".equals(category.getCategoryCode())) {
                        operationalExpenditure = operationalExpenditure.add(
                                officeExpenditureAsOf(office.getId(), asOfDate));
                    }

                    if ("DEVELOPMENT".equals(category.getCategoryCode())) {

                        if ("ADP".equals(source.getSourceCode())) {
                            for (Project project :
                                    projectRepository
                                            .findByOfficeBudgetAllocationId(
                                                    office.getId())) {

                                developmentAdpExpenditure =
                                        developmentAdpExpenditure.add(
                                                projectExpenditureAsOf(
                                                        project.getId(), asOfDate));
                            }
                        }

                        if ("BLOCK".equals(source.getSourceCode())) {
                            developmentBlockExpenditure =
                                    developmentBlockExpenditure.add(
                                            officeExpenditureAsOf(
                                                    office.getId(), asOfDate));
                        }
                    }
                }

                if ("DEVELOPMENT".equals(category.getCategoryCode())) {
                    if ("ADP".equals(source.getSourceCode())) {
                        developmentAdpBudget =
                                developmentAdpBudget.add(source.getAmount());
                    } else if ("BLOCK".equals(source.getSourceCode())) {
                        developmentBlockBudget =
                                developmentBlockBudget.add(source.getAmount());
                    }
                }
            }

            if ("OPERATIONAL".equals(category.getCategoryCode())) {
                operationalBudget = categoryBudget;
                categoryExpenditure = operationalExpenditure;
            } else if ("DEVELOPMENT".equals(category.getCategoryCode())) {
                developmentBudget = categoryBudget;
                developmentExpenditure =
                        developmentAdpExpenditure.add(
                                developmentBlockExpenditure);
                categoryExpenditure = developmentExpenditure;
            }

            summaries.add(new DashboardSummaryResponse.CategorySummary(
                    category.getCategoryCode(),
                    category.getCategoryName(),
                    categoryBudget,
                    categoryExpenditure,
                    categoryBudget.subtract(categoryExpenditure)
            ));
        }

        BigDecimal totalExpenditure =
                operationalExpenditure.add(sedpExpenditure).add(developmentExpenditure);

        BigDecimal remaining =
                budget.getTotalAmount().subtract(totalExpenditure);

        BigDecimal utilization = ZERO;

        if (budget.getTotalAmount().compareTo(ZERO) > 0) {
            utilization = totalExpenditure
                    .multiply(BigDecimal.valueOf(100))
                    .divide(budget.getTotalAmount(), 2, RoundingMode.HALF_UP);
        }

        return new DashboardSummaryResponse(
                ministry.getName(),
                fiscalYearId,
                asOfDate,
                budget.getTotalAmount(),
                totalExpenditure,
                remaining,
                utilization,
                operationalBudget,
                operationalExpenditure,
                sedpBudget,
                sedpExpenditure,
                developmentBudget,
                developmentExpenditure,
                developmentAdpBudget,
                developmentAdpExpenditure,
                developmentBlockBudget,
                developmentBlockExpenditure,
                summaries
        );
    }

    private BigDecimal categoryExpenditureAsOf(Long categoryId, LocalDate date) {
        Map<Long, CategoryExpenditureHistory> latestByHead = new HashMap<>();
        for (CategoryExpenditureHistory record : categoryHistoryRepository
                .findByCategoryIdOrderByReportDateDescIdDesc(categoryId)) {
            if (!record.getReportDate().isAfter(date)) {
                latestByHead.putIfAbsent(record.getExpenseHeadId(), record);
            }
        }
        return latestByHead.values().stream()
                .map(CategoryExpenditureHistory::getCumulativeAmount)
                .reduce(ZERO, BigDecimal::add);
    }

    private BigDecimal projectExpenditureAsOf(
            Long projectId, LocalDate date) {

        return projectHistoryRepository
                .findFirstByProjectIdAndReportDateLessThanEqualOrderByReportDateDescIdDesc(
                        projectId, date)
                .map(ProjectExpenditureHistory::getCumulativeAmount)
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
