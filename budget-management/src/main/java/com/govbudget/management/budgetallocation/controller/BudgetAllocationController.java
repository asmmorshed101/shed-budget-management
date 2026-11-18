
package com.govbudget.management.budgetallocation.controller;

import com.govbudget.management.budgetallocation.dto.BudgetAllocationRequest;
import com.govbudget.management.budgetallocation.dto.BudgetAllocationResponse;
import com.govbudget.management.budgetallocation.dto.RevisionRequest;
import com.govbudget.management.budgetallocation.dto.RevisionResponse;
import com.govbudget.management.budgetallocation.service.BudgetAllocationService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class BudgetAllocationController {

    private final BudgetAllocationService budgetAllocationService;

    public BudgetAllocationController(
            BudgetAllocationService budgetAllocationService) {
        this.budgetAllocationService = budgetAllocationService;
    }

    // ==========================================
    // 1. Create Budget Allocation
    // POST /api/v1/budget-allocations
    // ==========================================

    @PostMapping("/budget-allocations")
    public BudgetAllocationResponse create(
            @Valid @RequestBody BudgetAllocationRequest request) {

        return budgetAllocationService.create(request);
    }


    // ==========================================
    // 2. Get All Budget Allocations
    // GET /api/v1/budget-allocations
    // ==========================================

    @GetMapping("/budget-allocations")
    public List<BudgetAllocationResponse> findAll() {

        return budgetAllocationService.findAll();
    }


    // ==========================================
    // 3. Get Budget Allocation By ID
    // GET /api/v1/budget-allocations/{id}
    // ==========================================

    @GetMapping("/budget-allocations/{id}")
    public BudgetAllocationResponse findById(
            @PathVariable Long id) {

        return budgetAllocationService.findById(id);
    }


    // ==========================================
    // 4. Approve Original Allocation
    // PATCH /api/v1/budget-allocations/{id}/approve
    // ==========================================

    @PatchMapping("/budget-allocations/{id}/approve")
    public BudgetAllocationResponse approve(
            @PathVariable Long id) {

        return budgetAllocationService.approve(id);
    }


    // ==========================================
    // 5. Submit Allocation Revision
    // POST /api/v1/budget-allocations/{id}/revisions
    // ==========================================

    @PostMapping("/budget-allocations/{id}/revisions")
    public RevisionResponse submitRevision(
            @PathVariable Long id,
            @Valid @RequestBody RevisionRequest request) {

        return budgetAllocationService.submitRevision(id, request);
    }


    // ==========================================
    // 6. Get Allocation Revision History
    // GET /api/v1/budget-allocations/{id}/revisions
    // ==========================================

    @GetMapping("/budget-allocations/{id}/revisions")
    public List<RevisionResponse> getRevisionHistory(
            @PathVariable Long id) {

        return budgetAllocationService.getRevisionHistory(id);
    }


    // ==========================================
    // 7. Approve Allocation Revision
    // PATCH /api/v1/budget-allocation-revisions/{id}/approve
    // ==========================================

    @PatchMapping("/budget-allocation-revisions/{id}/approve")
    public RevisionResponse approveRevision(
            @PathVariable Long id) {

        return budgetAllocationService.approveRevision(id);
    }


    // ==========================================
    // 8. Reject Allocation Revision
    // PATCH /api/v1/budget-allocation-revisions/{id}/reject
    // ==========================================

    @PatchMapping("/budget-allocation-revisions/{id}/reject")
    public RevisionResponse rejectRevision(
            @PathVariable Long id) {

        return budgetAllocationService.rejectRevision(id);
    }
}
