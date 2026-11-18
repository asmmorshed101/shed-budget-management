
package com.govbudget.management.operational.budgethead.service;

import com.govbudget.management.budgetallocation.entity.BudgetAllocation;
import com.govbudget.management.budgetallocation.repository.BudgetAllocationRepository;

import com.govbudget.management.operational.budgethead.dto.OperationalBudgetHeadRequest;
import com.govbudget.management.operational.budgethead.dto.OperationalBudgetHeadResponse;
import com.govbudget.management.operational.budgethead.entity.OperationalBudgetHead;
import com.govbudget.management.operational.budgethead.repository.OperationalBudgetHeadRepository;

import com.govbudget.management.operational.expensehead.entity.ExpenseHead;
import com.govbudget.management.operational.expensehead.repository.ExpenseHeadRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@Transactional
public class OperationalBudgetHeadService {

    private final OperationalBudgetHeadRepository budgetHeadRepository;
    private final BudgetAllocationRepository budgetAllocationRepository;
    private final ExpenseHeadRepository expenseHeadRepository;

    public OperationalBudgetHeadService(
            OperationalBudgetHeadRepository budgetHeadRepository,
            BudgetAllocationRepository budgetAllocationRepository,
            ExpenseHeadRepository expenseHeadRepository
    ) {
        this.budgetHeadRepository = budgetHeadRepository;
        this.budgetAllocationRepository = budgetAllocationRepository;
        this.expenseHeadRepository = expenseHeadRepository;
    }

    // =====================================================
    // CREATE OPERATIONAL BUDGET HEAD
    // =====================================================

    public OperationalBudgetHeadResponse createBudgetHead(
            OperationalBudgetHeadRequest request
    ) {

        validateRequest(request);

        // Check Budget Allocation
        BudgetAllocation allocation =
                budgetAllocationRepository.findById(
                        request.getBudgetAllocationId()
                ).orElseThrow(() ->
                        new RuntimeException("Budget allocation not found")
                );

        // Only approved allocation can be used
        if (!"APPROVED".equals(allocation.getStatus())) {
            throw new RuntimeException(
                    "Budget allocation must be approved first"
            );
        }

        // Check Expense Head
        ExpenseHead expenseHead =
                expenseHeadRepository.findById(
                        request.getExpenseHeadId()
                ).orElseThrow(() ->
                        new RuntimeException("Expense head not found")
                );

        if (!Boolean.TRUE.equals(expenseHead.getActive())) {
            throw new RuntimeException("Expense head is inactive");
        }

        // Check duplicate Expense Head
        if (budgetHeadRepository
                .existsByBudgetAllocationIdAndExpenseHeadId(
                        request.getBudgetAllocationId(),
                        request.getExpenseHeadId()
                )) {
            throw new RuntimeException(
                    "This expense head already exists in this allocation"
            );
        }

        // Check total budget limit
        validateTotalBudget(
                request.getBudgetAllocationId(),
                request.getBudgetedAmount(),
                null,
                allocation.getCurrentAmount()
        );

        OperationalBudgetHead budgetHead =
                new OperationalBudgetHead();

        budgetHead.setBudgetAllocationId(
                request.getBudgetAllocationId()
        );

        budgetHead.setExpenseHeadId(
                request.getExpenseHeadId()
        );

        budgetHead.setBudgetedAmount(
                request.getBudgetedAmount()
        );

        budgetHead.setRemarks(request.getRemarks());
        budgetHead.setStatus("DRAFT");

        OperationalBudgetHead saved =
                budgetHeadRepository.save(budgetHead);

        return mapToResponse(saved);
    }


    // =====================================================
    // GET ALL BUDGET HEADS
    // =====================================================

    @Transactional(readOnly = true)
    public List<OperationalBudgetHeadResponse> getAllBudgetHeads() {

        return budgetHeadRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }


    // =====================================================
    // GET BUDGET HEAD BY ID
    // =====================================================

    @Transactional(readOnly = true)
    public OperationalBudgetHeadResponse getBudgetHeadById(Long id) {

        OperationalBudgetHead budgetHead =
                budgetHeadRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Operational budget head not found"
                                )
                        );

        return mapToResponse(budgetHead);
    }


    // =====================================================
    // GET BUDGET HEADS BY ALLOCATION ID
    // =====================================================

    @Transactional(readOnly = true)
    public List<OperationalBudgetHeadResponse> getByBudgetAllocationId(
            Long allocationId
    ) {

        return budgetHeadRepository
                .findByBudgetAllocationIdOrderByIdDesc(allocationId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }


    // =====================================================
    // UPDATE DRAFT BUDGET HEAD
    // =====================================================

    public OperationalBudgetHeadResponse updateBudgetHead(
            Long id,
            OperationalBudgetHeadRequest request
    ) {

        validateRequest(request);

        OperationalBudgetHead budgetHead =
                budgetHeadRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Operational budget head not found"
                                )
                        );

        if (!"DRAFT".equals(budgetHead.getStatus())
                && !"REJECTED".equals(budgetHead.getStatus())) {

            throw new RuntimeException(
                    "Only DRAFT or REJECTED budget heads can be updated"
            );
        }

        if (!budgetHead.getBudgetAllocationId()
                .equals(request.getBudgetAllocationId())) {

            throw new RuntimeException(
                    "Budget allocation cannot be changed"
            );
        }

        BudgetAllocation allocation =
                budgetAllocationRepository.findById(
                        budgetHead.getBudgetAllocationId()
                ).orElseThrow(() ->
                        new RuntimeException("Budget allocation not found")
                );

        if (!"APPROVED".equals(allocation.getStatus())) {
            throw new RuntimeException(
                    "Budget allocation must be approved"
            );
        }

        ExpenseHead expenseHead =
                expenseHeadRepository.findById(
                        request.getExpenseHeadId()
                ).orElseThrow(() ->
                        new RuntimeException("Expense head not found")
                );

        if (!Boolean.TRUE.equals(expenseHead.getActive())) {
            throw new RuntimeException("Expense head is inactive");
        }

        // Prevent duplicate expense head
        budgetHeadRepository
                .findByBudgetAllocationIdAndExpenseHeadId(
                        budgetHead.getBudgetAllocationId(),
                        request.getExpenseHeadId()
                )
                .filter(existing ->
                        !existing.getId().equals(id)
                )
                .ifPresent(existing -> {
                    throw new RuntimeException(
                            "This expense head already exists in this allocation"
                    );
                });

        // Recalculate total, excluding current record
        validateTotalBudget(
                budgetHead.getBudgetAllocationId(),
                request.getBudgetedAmount(),
                id,
                allocation.getCurrentAmount()
        );

        budgetHead.setExpenseHeadId(request.getExpenseHeadId());
        budgetHead.setBudgetedAmount(request.getBudgetedAmount());
        budgetHead.setRemarks(request.getRemarks());
        budgetHead.setStatus("DRAFT");
        budgetHead.setSubmittedAt(null);
        budgetHead.setApprovedAt(null);

        OperationalBudgetHead updated =
                budgetHeadRepository.save(budgetHead);

        return mapToResponse(updated);
    }


    // =====================================================
    // SUBMIT FOR APPROVAL
    // =====================================================

    public OperationalBudgetHeadResponse submitForApproval(Long id) {

        OperationalBudgetHead budgetHead =
                budgetHeadRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Operational budget head not found"
                                )
                        );

        if (!"DRAFT".equals(budgetHead.getStatus())) {
            throw new RuntimeException(
                    "Only DRAFT budget heads can be submitted"
            );
        }

        budgetHead.setStatus("SUBMITTED");
        budgetHead.setSubmittedAt(OffsetDateTime.now());

        OperationalBudgetHead updated =
                budgetHeadRepository.save(budgetHead);

        return mapToResponse(updated);
    }


    // =====================================================
    // APPROVE BUDGET HEAD
    // =====================================================

    public OperationalBudgetHeadResponse approveBudgetHead(Long id) {

        OperationalBudgetHead budgetHead =
                budgetHeadRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Operational budget head not found"
                                )
                        );

        if (!"SUBMITTED".equals(budgetHead.getStatus())) {
            throw new RuntimeException(
                    "Only SUBMITTED budget heads can be approved"
            );
        }

        BudgetAllocation allocation =
                budgetAllocationRepository.findById(
                        budgetHead.getBudgetAllocationId()
                ).orElseThrow(() ->
                        new RuntimeException("Budget allocation not found")
                );

        if (!"APPROVED".equals(allocation.getStatus())) {
            throw new RuntimeException(
                    "Parent budget allocation is not approved"
            );
        }

        // Recheck budget limit at approval time
        validateTotalBudget(
                budgetHead.getBudgetAllocationId(),
                BigDecimal.ZERO,
                null,
                allocation.getCurrentAmount()
        );

        budgetHead.setStatus("APPROVED");
        budgetHead.setApprovedAt(OffsetDateTime.now());

        OperationalBudgetHead updated =
                budgetHeadRepository.save(budgetHead);

        return mapToResponse(updated);
    }


    // =====================================================
    // REJECT BUDGET HEAD
    // =====================================================

    public OperationalBudgetHeadResponse rejectBudgetHead(
            Long id,
            String remarks
    ) {

        OperationalBudgetHead budgetHead =
                budgetHeadRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Operational budget head not found"
                                )
                        );

        if (!"SUBMITTED".equals(budgetHead.getStatus())) {
            throw new RuntimeException(
                    "Only SUBMITTED budget heads can be rejected"
            );
        }

        budgetHead.setStatus("REJECTED");
        budgetHead.setRemarks(remarks);

        OperationalBudgetHead updated =
                budgetHeadRepository.save(budgetHead);

        return mapToResponse(updated);
    }


    // =====================================================
    // TOTAL BUDGET VALIDATION
    // =====================================================

    private void validateTotalBudget(
            Long allocationId,
            BigDecimal newAmount,
            Long excludeId,
            BigDecimal allocationAmount
    ) {

        List<OperationalBudgetHead> existingHeads =
                budgetHeadRepository
                        .findByBudgetAllocationIdOrderByIdDesc(allocationId);

        BigDecimal total = BigDecimal.ZERO;

        for (OperationalBudgetHead head : existingHeads) {

            if (excludeId != null && head.getId().equals(excludeId)) {
                continue;
            }

            if (!"REJECTED".equals(head.getStatus())) {
                total = total.add(head.getBudgetedAmount());
            }
        }

        total = total.add(newAmount);

        if (total.compareTo(allocationAmount) > 0) {
            throw new RuntimeException(
                    "Total operational budget heads cannot exceed "
                    + "the approved budget allocation amount"
            );
        }
    }


    // =====================================================
    // REQUEST VALIDATION
    // =====================================================

    private void validateRequest(OperationalBudgetHeadRequest request) {

        if (request == null) {
            throw new RuntimeException("Request body is required");
        }

        if (request.getBudgetAllocationId() == null) {
            throw new RuntimeException("Budget allocation ID is required");
        }

        if (request.getExpenseHeadId() == null) {
            throw new RuntimeException("Expense head ID is required");
        }

        if (request.getBudgetedAmount() == null
                || request.getBudgetedAmount().compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Budget amount must be greater than zero"
            );
        }
    }


    // =====================================================
    // ENTITY TO RESPONSE DTO
    // =====================================================

    private OperationalBudgetHeadResponse mapToResponse(
            OperationalBudgetHead budgetHead
    ) {

        return new OperationalBudgetHeadResponse(
                budgetHead.getId(),
                budgetHead.getBudgetAllocationId(),
                budgetHead.getExpenseHeadId(),
                budgetHead.getBudgetedAmount(),
                budgetHead.getStatus(),
                budgetHead.getSubmittedAt(),
                budgetHead.getApprovedAt(),
                budgetHead.getRemarks(),
                budgetHead.getCreatedAt(),
                budgetHead.getUpdatedAt()
        );
    }
}
