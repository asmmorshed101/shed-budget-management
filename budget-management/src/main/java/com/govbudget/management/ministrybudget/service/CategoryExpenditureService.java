package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.CumulativeExpenditureRequest;
import com.govbudget.management.ministrybudget.entity.CategoryExpenditureHistory;
import com.govbudget.management.ministrybudget.entity.MinistryBudgetCategory;
import com.govbudget.management.ministrybudget.repository.CategoryExpenditureHistoryRepository;
import com.govbudget.management.ministrybudget.repository.MinistryBudgetCategoryRepository;
import com.govbudget.management.operational.expensehead.entity.ExpenseHead;
import com.govbudget.management.operational.expensehead.repository.ExpenseHeadRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CategoryExpenditureService {

    private final MinistryBudgetCategoryRepository categoryRepository;
    private final CategoryExpenditureHistoryRepository historyRepository;
    private final ExpenseHeadRepository expenseHeadRepository;

    public CategoryExpenditureService(
            MinistryBudgetCategoryRepository categoryRepository,
            CategoryExpenditureHistoryRepository historyRepository,
            ExpenseHeadRepository expenseHeadRepository) {
        this.categoryRepository = categoryRepository;
        this.historyRepository = historyRepository;
        this.expenseHeadRepository = expenseHeadRepository;
    }

    @Transactional
    public CategoryExpenditureHistory create(Long categoryId, CumulativeExpenditureRequest request) {
        MinistryBudgetCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Budget category not found"));
        if (!"SEDP".equals(category.getCategoryCode())) {
            throw new IllegalArgumentException("Category-level expenditure is available only for SEDP");
        }
        if (request.reportDate() == null || request.amount() == null
                || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Report date and a positive expenditure amount are required");
        }
        if (request.expenseHeadId() == null) {
            throw new IllegalArgumentException("Budget head is required");
        }
        ExpenseHead head = expenseHeadRepository.findById(request.expenseHeadId())
                .orElseThrow(() -> new IllegalArgumentException("Budget head not found"));
        if (!Boolean.TRUE.equals(head.getActive())) {
            throw new IllegalArgumentException("Budget head is not active");
        }

        List<CategoryExpenditureHistory> history = historyRepository
                .findByCategoryIdOrderByReportDateDescIdDesc(categoryId);
        Map<Long, CategoryExpenditureHistory> latestByHead = new HashMap<>();
        for (CategoryExpenditureHistory record : history) {
            latestByHead.putIfAbsent(record.getExpenseHeadId(), record);
        }

        BigDecimal headTotal = latestByHead.containsKey(request.expenseHeadId())
                ? latestByHead.get(request.expenseHeadId()).getCumulativeAmount()
                : BigDecimal.ZERO;
        BigDecimal totalSpent = latestByHead.values().stream()
                .map(CategoryExpenditureHistory::getCumulativeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalSpent.add(request.amount()).compareTo(category.getTotalAmount()) > 0) {
            throw new IllegalArgumentException("Expenditure cannot exceed the SEDP allocation");
        }

        CategoryExpenditureHistory record = new CategoryExpenditureHistory();
        record.setCategoryId(categoryId);
        record.setExpenseHeadId(request.expenseHeadId());
        record.setReportDate(request.reportDate());
        record.setIncrementalAmount(request.amount());
        record.setCumulativeAmount(headTotal.add(request.amount()));
        record.setRemarks(request.remarks());
        return historyRepository.save(record);
    }

    @Transactional(readOnly = true)
    public List<CategoryExpenditureHistory> getHistory(Long categoryId) {
        MinistryBudgetCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Budget category not found"));
        if (!"SEDP".equals(category.getCategoryCode())) {
            throw new IllegalArgumentException("Category-level expenditure is available only for SEDP");
        }
        return historyRepository.findByCategoryIdOrderByReportDateDescIdDesc(categoryId);
    }

    @Transactional
    public CategoryExpenditureHistory update(Long categoryId, Long historyId,
            CumulativeExpenditureRequest request) {
        MinistryBudgetCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Budget category not found"));
        if (!"SEDP".equals(category.getCategoryCode())) {
            throw new IllegalArgumentException("Category-level expenditure is available only for SEDP");
        }
        CategoryExpenditureHistory record = historyRepository.findById(historyId)
                .filter(item -> item.getCategoryId().equals(categoryId))
                .orElseThrow(() -> new IllegalArgumentException("SEDP expenditure entry not found"));
        if (request.reportDate() == null || request.amount() == null
                || request.amount().compareTo(BigDecimal.ZERO) <= 0 || request.expenseHeadId() == null) {
            throw new IllegalArgumentException("Report date, budget head, and a positive amount are required");
        }
        ExpenseHead head = expenseHeadRepository.findById(request.expenseHeadId())
                .orElseThrow(() -> new IllegalArgumentException("Budget head not found"));
        if (!Boolean.TRUE.equals(head.getActive())
                && !request.expenseHeadId().equals(record.getExpenseHeadId())) {
            throw new IllegalArgumentException("Budget head is not active");
        }

        record.setReportDate(request.reportDate());
        record.setIncrementalAmount(request.amount());
        record.setRemarks(request.remarks());
        record.setExpenseHeadId(request.expenseHeadId());
        List<CategoryExpenditureHistory> history = historyRepository
                .findByCategoryIdOrderByReportDateDescIdDesc(categoryId);
        Map<Long, BigDecimal> cumulativeByHead = new HashMap<>();
        history.sort(Comparator.comparing(CategoryExpenditureHistory::getReportDate)
                .thenComparing(CategoryExpenditureHistory::getId));
        for (CategoryExpenditureHistory item : history) {
            Long headId = item.getExpenseHeadId();
            BigDecimal next = cumulativeByHead.getOrDefault(headId, BigDecimal.ZERO)
                    .add(item.getIncrementalAmount() == null ? BigDecimal.ZERO : item.getIncrementalAmount());
            cumulativeByHead.put(headId, next);
            item.setCumulativeAmount(next);
        }
        BigDecimal total = cumulativeByHead.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(category.getTotalAmount()) > 0) {
            throw new IllegalArgumentException("Expenditure cannot exceed the SEDP allocation");
        }
        historyRepository.saveAll(history);
        return record;
    }
}
