
package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.dto.CategoryRequest;
import com.govbudget.management.ministrybudget.entity.MinistryBudget;
import com.govbudget.management.ministrybudget.service.MinistryBudgetService;
import com.govbudget.management.ministrybudget.service.MinistryBudgetCategoryService;

// import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class MinistryBudgetCategoryController {

    private final MinistryBudgetService budgetService;
    private final MinistryBudgetCategoryService categoryService;

    public MinistryBudgetCategoryController(
            MinistryBudgetService budgetService,
            MinistryBudgetCategoryService categoryService) {

        this.budgetService = budgetService;
        this.categoryService = categoryService;
    }

    // Get categories using Ministry Budget ID
    @GetMapping("/ministry-budgets/{budgetId}/categories")
    public ResponseEntity<?> getByBudget(
            @PathVariable Long budgetId) {

        return ResponseEntity.ok(
                categoryService.getByBudgetId(budgetId));
    }

    // Get categories using Fiscal Year ID and Organization ID
    @GetMapping("/ministry-budgets/categories/by-year")
    public ResponseEntity<?> getCategoriesByFiscalYear(
            @RequestParam Long fiscalYearId,
            @RequestParam UUID organizationId) {

        MinistryBudget budget =
                budgetService.getByFiscalYearAndOrganization(
                        fiscalYearId, organizationId);

        return ResponseEntity.ok(
                categoryService.getByBudgetId(budget.getId()));
    }

    // Update existing category
    @PutMapping("/budget-categories/{categoryId}")
    public ResponseEntity<?> update(
            @PathVariable Long categoryId,
            @RequestBody CategoryRequest request) {

        return ResponseEntity.ok(
                categoryService.update(categoryId, request));
    }
}
