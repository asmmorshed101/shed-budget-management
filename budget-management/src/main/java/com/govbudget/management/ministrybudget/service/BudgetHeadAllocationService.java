package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.BudgetHeadAllocationRequest;
import com.govbudget.management.ministrybudget.entity.*;
import com.govbudget.management.ministrybudget.repository.*;
import com.govbudget.management.operational.expensehead.repository.ExpenseHeadRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service
public class BudgetHeadAllocationService {
    private final BudgetHeadAllocationRepository headAllocationRepository;
    private final OfficeBudgetAllocationRepository officeAllocationRepository;
    private final ProjectRepository projectRepository;
    private final ExpenseHeadRepository expenseHeadRepository;
    private final OfficeExpenditureHistoryRepository officeHistoryRepository;
    private final ProjectExpenditureHistoryRepository projectHistoryRepository;

    public BudgetHeadAllocationService(BudgetHeadAllocationRepository headAllocationRepository,
            OfficeBudgetAllocationRepository officeAllocationRepository, ProjectRepository projectRepository,
            ExpenseHeadRepository expenseHeadRepository, OfficeExpenditureHistoryRepository officeHistoryRepository,
            ProjectExpenditureHistoryRepository projectHistoryRepository) {
        this.headAllocationRepository = headAllocationRepository;
        this.officeAllocationRepository = officeAllocationRepository;
        this.projectRepository = projectRepository;
        this.expenseHeadRepository = expenseHeadRepository;
        this.officeHistoryRepository = officeHistoryRepository;
        this.projectHistoryRepository = projectHistoryRepository;
    }

    @Transactional(readOnly = true)
    public List<BudgetHeadAllocation> getOfficeAllocations(Long id) {
        requireOffice(id);
        return headAllocationRepository.findByOfficeBudgetAllocationId(id);
    }

    @Transactional(readOnly = true)
    public List<BudgetHeadAllocation> getProjectAllocations(Long id) {
        requireProject(id);
        return headAllocationRepository.findByProjectId(id);
    }

    @Transactional
    public List<BudgetHeadAllocation> saveOfficeAllocations(Long id, BudgetHeadAllocationRequest request) {
        BigDecimal budget = requireOffice(id).getAllocatedAmount();
        validateAndReplace(request, budget, id, null);
        return headAllocationRepository.findByOfficeBudgetAllocationId(id);
    }

    @Transactional
    public List<BudgetHeadAllocation> saveProjectAllocations(Long id, BudgetHeadAllocationRequest request) {
        BigDecimal budget = requireProject(id).getAllocatedAmount();
        validateAndReplace(request, budget, null, id);
        return headAllocationRepository.findByProjectId(id);
    }

    @Transactional(readOnly = true)
    public Optional<BigDecimal> getOfficeHeadLimit(Long allocationId, Long headId) {
        if (!headAllocationRepository.existsByOfficeBudgetAllocationId(allocationId)) return Optional.empty();
        return headAllocationRepository.findByOfficeBudgetAllocationIdAndExpenseHeadId(allocationId, headId)
                .map(BudgetHeadAllocation::getAllocatedAmount);
    }

    @Transactional(readOnly = true)
    public Optional<BigDecimal> getProjectHeadLimit(Long projectId, Long headId) {
        if (!headAllocationRepository.existsByProjectId(projectId)) return Optional.empty();
        return headAllocationRepository.findByProjectIdAndExpenseHeadId(projectId, headId)
                .map(BudgetHeadAllocation::getAllocatedAmount);
    }

    @Transactional(readOnly = true)
    public boolean hasOfficeHeadAllocations(Long allocationId) {
        return headAllocationRepository.existsByOfficeBudgetAllocationId(allocationId);
    }

    @Transactional(readOnly = true)
    public boolean hasProjectHeadAllocations(Long projectId) {
        return headAllocationRepository.existsByProjectId(projectId);
    }

    private void validateAndReplace(BudgetHeadAllocationRequest request, BigDecimal budget,
            Long officeId, Long projectId) {
        if (request == null || request.allocations() == null) throw new IllegalArgumentException("Budget head allocations are required");
        BigDecimal total = BigDecimal.ZERO;
        Set<Long> headIds = new HashSet<>();
        for (var item : request.allocations()) {
            if (item.expenseHeadId() == null || item.allocatedAmount() == null || item.allocatedAmount().compareTo(BigDecimal.ZERO) < 0)
                throw new IllegalArgumentException("Each budget head allocation must have a valid amount");
            if (!headIds.add(item.expenseHeadId())) throw new IllegalArgumentException("A budget head can only be allocated once");
            var head = expenseHeadRepository.findById(item.expenseHeadId()).orElseThrow(() -> new IllegalArgumentException("Budget head not found"));
            if (!Boolean.TRUE.equals(head.getActive())) throw new IllegalArgumentException("Only active budget heads can be allocated");
            total = total.add(item.allocatedAmount());
            BigDecimal alreadySpent = officeId != null
                    ? latestOfficeHeadTotal(officeId, item.expenseHeadId())
                    : latestProjectHeadTotal(projectId, item.expenseHeadId());
            if (item.allocatedAmount().compareTo(alreadySpent) < 0)
                throw new IllegalArgumentException("A head allocation cannot be less than the amount already spent");
        }
        Map<Long, BigDecimal> requestedAmounts = new HashMap<>();
        request.allocations().forEach(item -> requestedAmounts.put(item.expenseHeadId(), item.allocatedAmount()));
        List<BudgetHeadAllocation> existing = officeId != null
                ? headAllocationRepository.findByOfficeBudgetAllocationId(officeId)
                : headAllocationRepository.findByProjectId(projectId);
        for (BudgetHeadAllocation old : existing) {
            BigDecimal newAmount = requestedAmounts.getOrDefault(old.getExpenseHeadId(), BigDecimal.ZERO);
            BigDecimal spent = officeId != null
                    ? latestOfficeHeadTotal(officeId, old.getExpenseHeadId())
                    : latestProjectHeadTotal(projectId, old.getExpenseHeadId());
            if (newAmount.compareTo(spent) < 0)
                throw new IllegalArgumentException("A head allocation cannot be removed or reduced below the amount already spent");
        }
        if (total.compareTo(budget) > 0) throw new IllegalArgumentException("Total budget head allocations cannot exceed the assigned budget");
        if (officeId != null) headAllocationRepository.deleteByOfficeBudgetAllocationId(officeId);
        else headAllocationRepository.deleteByProjectId(projectId);
        // Ensure old rows are removed before replacement rows hit the unique indexes.
        headAllocationRepository.flush();
        for (var item : request.allocations()) {
            if (item.allocatedAmount().compareTo(BigDecimal.ZERO) == 0) continue;
            BudgetHeadAllocation allocation = new BudgetHeadAllocation();
            allocation.setOfficeBudgetAllocationId(officeId);
            allocation.setProjectId(projectId);
            allocation.setExpenseHeadId(item.expenseHeadId());
            allocation.setAllocatedAmount(item.allocatedAmount());
            headAllocationRepository.save(allocation);
        }
    }

    private BigDecimal latestOfficeHeadTotal(Long id, Long headId) {
        return officeHistoryRepository.findByOfficeBudgetAllocationIdAndExpenseHeadIdOrderByReportDateDescIdDesc(id, headId)
                .stream().findFirst().map(OfficeExpenditureHistory::getCumulativeAmount).orElse(BigDecimal.ZERO);
    }

    private BigDecimal latestProjectHeadTotal(Long id, Long headId) {
        return projectHistoryRepository.findByProjectIdAndExpenseHeadIdOrderByReportDateDescIdDesc(id, headId)
                .stream().findFirst().map(ProjectExpenditureHistory::getCumulativeAmount).orElse(BigDecimal.ZERO);
    }

    private OfficeBudgetAllocation requireOffice(Long id) {
        return officeAllocationRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Office allocation not found"));
    }

    private Project requireProject(Long id) {
        return projectRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Project not found"));
    }
}
