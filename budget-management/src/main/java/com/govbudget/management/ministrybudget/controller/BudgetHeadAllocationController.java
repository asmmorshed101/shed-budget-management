package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.dto.BudgetHeadAllocationRequest;
import com.govbudget.management.ministrybudget.service.BudgetHeadAllocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class BudgetHeadAllocationController {
    private final BudgetHeadAllocationService service;
    public BudgetHeadAllocationController(BudgetHeadAllocationService service) { this.service = service; }

    @GetMapping("/office-allocations/{id}/head-budgets")
    public ResponseEntity<?> getOffice(@PathVariable Long id) { return ResponseEntity.ok(service.getOfficeAllocations(id)); }
    @PutMapping("/office-allocations/{id}/head-budgets")
    public ResponseEntity<?> saveOffice(@PathVariable Long id, @RequestBody BudgetHeadAllocationRequest request) { return ResponseEntity.ok(service.saveOfficeAllocations(id, request)); }
    @GetMapping("/projects/{id}/head-budgets")
    public ResponseEntity<?> getProject(@PathVariable Long id) { return ResponseEntity.ok(service.getProjectAllocations(id)); }
    @PutMapping("/projects/{id}/head-budgets")
    public ResponseEntity<?> saveProject(@PathVariable Long id, @RequestBody BudgetHeadAllocationRequest request) { return ResponseEntity.ok(service.saveProjectAllocations(id, request)); }
}
