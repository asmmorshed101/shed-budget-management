package com.govbudget.management.expenditure.controller;

import com.govbudget.management.expenditure.entity.DevelopmentExpenditure;
import com.govbudget.management.expenditure.service.DevelopmentExpenditureService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/development-expenditures")
@CrossOrigin(origins = "*")
public class DevelopmentExpenditureController {

    private final DevelopmentExpenditureService service;

    public DevelopmentExpenditureController(
            DevelopmentExpenditureService service) {
        this.service = service;
    }

    // Get all development expenditures
    @GetMapping
    public List<DevelopmentExpenditure> getAllExpenditures() {
        return service.getAllExpenditures();
    }

    // Get expenditure by ID
    @GetMapping("/{id}")
    public DevelopmentExpenditure getExpenditureById(@PathVariable Long id) {
        return service.getExpenditureById(id);
    }

    // Create new development expenditure
    @PostMapping
    public DevelopmentExpenditure createExpenditure(
            @RequestBody DevelopmentExpenditure expenditure) {
        return service.saveExpenditure(expenditure);
    }

    // Delete expenditure
    @DeleteMapping("/{id}")
    public void deleteExpenditure(@PathVariable Long id) {
        service.deleteExpenditure(id);
    }
    // Submit expenditure
    @PatchMapping("/{id}/submit")
    public DevelopmentExpenditure submitExpenditure(
            @PathVariable Long id) {
        return service.submitExpenditure(id);
    }

    // Approve expenditure
    @PatchMapping("/{id}/approve")
    public DevelopmentExpenditure approveExpenditure(
            @PathVariable Long id) {
        return service.approveExpenditure(id);
    }

    // Reject expenditure
    @PatchMapping("/{id}/reject")
    public DevelopmentExpenditure rejectExpenditure(
            @PathVariable Long id) {
        return service.rejectExpenditure(id);
    }
}