
package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.CumulativeExpenditureRequest;
import com.govbudget.management.ministrybudget.entity.*;
import com.govbudget.management.ministrybudget.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.govbudget.management.operational.expensehead.entity.ExpenseHead;
import com.govbudget.management.operational.expensehead.repository.ExpenseHeadRepository;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProjectExpenditureService {

    private final ProjectRepository projectRepository;
    private final ProjectExpenditureHistoryRepository historyRepository;
private final ExpenseHeadRepository expenseHeadRepository; 
    private final BudgetHeadAllocationService budgetHeadAllocationService;

    public ProjectExpenditureService(
            ProjectRepository projectRepository,
            ProjectExpenditureHistoryRepository historyRepository,
ExpenseHeadRepository expenseHeadRepository,
BudgetHeadAllocationService budgetHeadAllocationService) {
        this.projectRepository = projectRepository;
        this.historyRepository = historyRepository;
this.expenseHeadRepository = expenseHeadRepository; 
this.budgetHeadAllocationService = budgetHeadAllocationService;
    }

    @Transactional
    public ProjectExpenditureHistory create(
            Long projectId, CumulativeExpenditureRequest request) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Project not found"));

        validateRequest(request);
        validateExpenseHead(request.expenseHeadId());

        List<ProjectExpenditureHistory> history =
                historyRepository.findByProjectIdAndExpenseHeadIdOrderByReportDateDescIdDesc(
                        projectId, request.expenseHeadId());
        BigDecimal previousAmount = history.isEmpty()
                ? BigDecimal.ZERO : history.get(0).getCumulativeAmount();
        BigDecimal newCumulativeAmount = previousAmount.add(request.amount());

        if (budgetHeadAllocationService.hasProjectHeadAllocations(projectId)) {
            BigDecimal headBudget = budgetHeadAllocationService.getProjectHeadLimit(projectId, request.expenseHeadId())
                    .orElseThrow(() -> new IllegalArgumentException("No budget has been assigned to this Budget Head"));
            if (newCumulativeAmount.compareTo(headBudget) > 0) {
                throw new IllegalArgumentException("Expenditure exceeds the amount assigned to this Budget Head");
            }
        }

        BigDecimal currentTotal = historyRepository
                .findByProjectIdOrderByReportDateDescIdDesc(projectId).stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> row.getExpenseHeadId() == null ? -1L : row.getExpenseHeadId(),
                        row -> row,
                        (first, ignored) -> first))
                .values().stream()
                .map(ProjectExpenditureHistory::getCumulativeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (currentTotal.add(request.amount()).compareTo(project.getAllocatedAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Expenditure cannot exceed project allocation");
        }

        ProjectExpenditureHistory record =
                new ProjectExpenditureHistory();

        record.setProjectId(projectId);
        record.setReportDate(request.reportDate());
        record.setCumulativeAmount(newCumulativeAmount);
        record.setIncrementalAmount(request.amount());
        record.setRemarks(request.remarks());
        record.setExpenseHeadId(request.expenseHeadId());

        return historyRepository.save(record);
    }

    @Transactional(readOnly = true)
    public List<ProjectExpenditureHistory> getHistory(Long projectId) {

        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project not found");
        }

        return historyRepository
                .findByProjectIdOrderByReportDateDescIdDesc(projectId);
    }

    @Transactional
    public ProjectExpenditureHistory update(Long projectId, Long historyId,
            CumulativeExpenditureRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        ProjectExpenditureHistory record = historyRepository.findById(historyId)
                .filter(item -> item.getProjectId().equals(projectId))
                .orElseThrow(() -> new IllegalArgumentException("Project expenditure entry not found"));
        validateRequest(request);
        if (request.expenseHeadId() == null) {
            throw new IllegalArgumentException("Budget head is required");
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
        List<ProjectExpenditureHistory> history = historyRepository
                .findByProjectIdOrderByReportDateDescIdDesc(projectId);
        BigDecimal legacyTotal = history.stream()
                .filter(item -> item.getExpenseHeadId() == null)
                .max(Comparator.comparing(ProjectExpenditureHistory::getReportDate)
                        .thenComparing(ProjectExpenditureHistory::getId))
                .map(ProjectExpenditureHistory::getCumulativeAmount)
                .orElse(BigDecimal.ZERO);
        Map<Long, BigDecimal> cumulativeByHead = new HashMap<>();
        history.sort(Comparator.comparing(ProjectExpenditureHistory::getReportDate)
                .thenComparing(ProjectExpenditureHistory::getId));
        for (ProjectExpenditureHistory item : history) {
            Long headId = item.getExpenseHeadId();
            if (headId == null) continue;
            BigDecimal next = cumulativeByHead.getOrDefault(headId, BigDecimal.ZERO)
                    .add(item.getIncrementalAmount() == null ? BigDecimal.ZERO : item.getIncrementalAmount());
            cumulativeByHead.put(headId, next);
            item.setCumulativeAmount(next);
        }
        BigDecimal total = cumulativeByHead.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add).add(legacyTotal);
        if (total.compareTo(project.getAllocatedAmount()) > 0) {
            throw new IllegalArgumentException("Expenditure cannot exceed project allocation");
        }
        if (budgetHeadAllocationService.hasProjectHeadAllocations(projectId)) {
            var headLimit = budgetHeadAllocationService.getProjectHeadLimit(projectId, request.expenseHeadId());
            if (headLimit.isPresent()) {
                if (cumulativeByHead.getOrDefault(request.expenseHeadId(), BigDecimal.ZERO).compareTo(headLimit.get()) > 0) {
                    throw new IllegalArgumentException("Expenditure exceeds the amount assigned to this Budget Head");
                }
            }
        }
        historyRepository.saveAll(history);
        return record;
    }
    private void validateExpenseHead(Long expenseHeadId) {
        if (expenseHeadId == null) {
            throw new IllegalArgumentException("Budget head is required");
        }

        ExpenseHead head = expenseHeadRepository.findById(expenseHeadId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Budget head not found"));

        if (!Boolean.TRUE.equals(head.getActive())) {
            throw new IllegalArgumentException("Budget head is not active");
        }
    }

    private void validateRequest(CumulativeExpenditureRequest request) {
        if (request.reportDate() == null) {
            throw new IllegalArgumentException("Report date is required");
        }

        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Expenditure amount must be greater than zero");
        }
    }
}
