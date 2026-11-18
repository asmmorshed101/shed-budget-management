
package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.CumulativeExpenditureRequest;
import com.govbudget.management.ministrybudget.entity.*;
import com.govbudget.management.ministrybudget.repository.*;
import com.govbudget.management.operational.expensehead.entity.ExpenseHead;
import com.govbudget.management.operational.expensehead.repository.ExpenseHeadRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OfficeExpenditureService {

    private final OfficeBudgetAllocationRepository allocationRepository;
    private final OfficeExpenditureHistoryRepository historyRepository;
    private final CategoryBudgetSourceRepository sourceRepository;
    private final MinistryBudgetCategoryRepository categoryRepository;
    private final ExpenseHeadRepository expenseHeadRepository;
    private final BudgetHeadAllocationService budgetHeadAllocationService;

    public OfficeExpenditureService(
            OfficeBudgetAllocationRepository allocationRepository,
            OfficeExpenditureHistoryRepository historyRepository,
            CategoryBudgetSourceRepository sourceRepository,
            MinistryBudgetCategoryRepository categoryRepository,
            ExpenseHeadRepository expenseHeadRepository,
            BudgetHeadAllocationService budgetHeadAllocationService) {

        this.allocationRepository = allocationRepository;
        this.historyRepository = historyRepository;
        this.sourceRepository = sourceRepository;
        this.categoryRepository = categoryRepository;
        this.expenseHeadRepository = expenseHeadRepository;
        this.budgetHeadAllocationService = budgetHeadAllocationService;
    }

    @Transactional
    public OfficeExpenditureHistory create(
            Long allocationId,
            CumulativeExpenditureRequest request) {

        OfficeBudgetAllocation allocation = allocationRepository
                .findById(allocationId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Office allocation not found"));

        CategoryBudgetSource source = sourceRepository
                .findById(allocation.getCategorySourceId())
                .orElseThrow();

        MinistryBudgetCategory category = categoryRepository
                .findById(source.getCategoryId())
                .orElseThrow();

        boolean operational =
                "OPERATIONAL".equals(category.getCategoryCode());

        boolean developmentBlock =
                "DEVELOPMENT".equals(category.getCategoryCode())
                && "BLOCK".equals(source.getSourceCode());

        if (!operational && !developmentBlock) {
            throw new IllegalArgumentException(
                    "Direct office expenditure is allowed only for Operational or Development Block");
        }

        if (request.reportDate() == null
                || request.amount() == null
                || request.amount().compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Invalid expenditure report");
        }

        validateExpenseHead(request.expenseHeadId());

        // Get history of the selected Budget Head only
        List<OfficeExpenditureHistory> headHistory =
                historyRepository
                        .findByOfficeBudgetAllocationIdAndExpenseHeadIdOrderByReportDateDescIdDesc(
                                allocationId,
                                request.expenseHeadId());

        BigDecimal previousAmount = BigDecimal.ZERO;

        if (!headHistory.isEmpty()) {

            OfficeExpenditureHistory latestHeadRecord =
                    headHistory.get(0);

            previousAmount =
                    latestHeadRecord.getCumulativeAmount();
        }

        if (budgetHeadAllocationService.hasOfficeHeadAllocations(allocationId)) {
            BigDecimal headBudget = budgetHeadAllocationService.getOfficeHeadLimit(allocationId, request.expenseHeadId())
                    .orElseThrow(() -> new IllegalArgumentException("No budget has been assigned to this Budget Head"));
            if (previousAmount.add(request.amount()).compareTo(headBudget) > 0) {
                throw new IllegalArgumentException("Expenditure exceeds the amount assigned to this Budget Head");
            }
        }

        // Get all history for this office allocation
        List<OfficeExpenditureHistory> allHistory =
                historyRepository
                        .findByOfficeBudgetAllocationIdOrderByReportDateDescIdDesc(
                                allocationId);

        // Keep only the latest cumulative record of each Budget Head.
        // Null expenseHeadId represents legacy history created before
        // Budget Head-wise expenditure was introduced.
        Map<Long, OfficeExpenditureHistory> latestByHead =
                new HashMap<>();

        for (OfficeExpenditureHistory record : allHistory) {
            latestByHead.putIfAbsent(
                    record.getExpenseHeadId(),
                    record);
        }

        // Calculate current total expenditure across all heads
        BigDecimal currentTotal = BigDecimal.ZERO;

        for (OfficeExpenditureHistory record : latestByHead.values()) {
            currentTotal = currentTotal.add(
                    record.getCumulativeAmount());
        }

        // Replace selected head's previous cumulative amount
        // with the newly submitted cumulative amount
        BigDecimal newTotal = currentTotal
                .subtract(previousAmount)
                .add(previousAmount.add(request.amount()));

        if (newTotal.compareTo(allocation.getAllocatedAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Total expenditure across all Budget Heads exceeds office allocation");
        }

        // Save history
        OfficeExpenditureHistory record =
                new OfficeExpenditureHistory();

        record.setOfficeBudgetAllocationId(allocationId);
        record.setExpenseHeadId(request.expenseHeadId());
        record.setReportDate(request.reportDate());
        record.setCumulativeAmount(previousAmount.add(request.amount()));

        record.setIncrementalAmount(
                request.amount());

        record.setRemarks(request.remarks());

        return historyRepository.save(record);
    }

    @Transactional(readOnly = true)
    public List<OfficeExpenditureHistory> getHistory(
            Long allocationId) {

        if (!allocationRepository.existsById(allocationId)) {
            throw new IllegalArgumentException(
                    "Office allocation not found");
        }

        return historyRepository
                .findByOfficeBudgetAllocationIdOrderByReportDateDescIdDesc(
                        allocationId);
    }

    private void validateExpenseHead(Long expenseHeadId) {

        if (expenseHeadId == null) {
            throw new IllegalArgumentException(
                    "Budget Head is required");
        }

        ExpenseHead head = expenseHeadRepository
                .findById(expenseHeadId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Budget Head not found"));

        if (!Boolean.TRUE.equals(head.getActive())) {
            throw new IllegalArgumentException(
                    "Budget Head is not active");
        }
    }
}
