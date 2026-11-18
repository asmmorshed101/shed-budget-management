
package com.govbudget.management.operational.budgethead.controller;

import com.govbudget.management.operational.budgethead.dto.OperationalBudgetHeadRequest;
import com.govbudget.management.operational.budgethead.dto.OperationalBudgetHeadResponse;
import com.govbudget.management.operational.budgethead.service.OperationalBudgetHeadService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/operational-budget-heads")
public class OperationalBudgetHeadController {

    private final OperationalBudgetHeadService budgetHeadService;

    public OperationalBudgetHeadController(
            OperationalBudgetHeadService budgetHeadService
    ) {
        this.budgetHeadService = budgetHeadService;
    }

    // Create Operational Budget Head
    @PostMapping
    public ResponseEntity<OperationalBudgetHeadResponse> createBudgetHead(
            @RequestBody OperationalBudgetHeadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(budgetHeadService.createBudgetHead(request));
    }

    // Get All Budget Heads
    @GetMapping
    public ResponseEntity<List<OperationalBudgetHeadResponse>> getAllBudgetHeads() {

        return ResponseEntity.ok(
                budgetHeadService.getAllBudgetHeads()
        );
    }

    // Get Budget Head By ID
    @GetMapping("/{id}")
    public ResponseEntity<OperationalBudgetHeadResponse> getBudgetHeadById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                budgetHeadService.getBudgetHeadById(id)
        );
    }

    // Get Budget Heads By Budget Allocation ID
    @GetMapping("/allocation/{allocationId}")
    public ResponseEntity<List<OperationalBudgetHeadResponse>> getByAllocationId(
            @PathVariable Long allocationId
    ) {
        return ResponseEntity.ok(
                budgetHeadService.getByBudgetAllocationId(allocationId)
        );
    }

    // Update Budget Head
    @PutMapping("/{id}")
    public ResponseEntity<OperationalBudgetHeadResponse> updateBudgetHead(
            @PathVariable Long id,
            @RequestBody OperationalBudgetHeadRequest request
    ) {
        return ResponseEntity.ok(
                budgetHeadService.updateBudgetHead(id, request)
        );
    }

    // Submit Budget Head For Approval
    @PatchMapping("/{id}/submit")
    public ResponseEntity<OperationalBudgetHeadResponse> submitForApproval(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                budgetHeadService.submitForApproval(id)
        );
    }

    // Approve Budget Head
    @PatchMapping("/{id}/approve")
    public ResponseEntity<OperationalBudgetHeadResponse> approveBudgetHead(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                budgetHeadService.approveBudgetHead(id)
        );
    }

    // Reject Budget Head
    @PatchMapping("/{id}/reject")
    public ResponseEntity<OperationalBudgetHeadResponse> rejectBudgetHead(
            @PathVariable Long id,
            @RequestParam(required = false) String remarks
    ) {
        return ResponseEntity.ok(
                budgetHeadService.rejectBudgetHead(id, remarks)
        );
    }
}
