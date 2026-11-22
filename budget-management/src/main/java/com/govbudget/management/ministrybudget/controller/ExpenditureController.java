
package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.dto.CumulativeExpenditureRequest;
import com.govbudget.management.ministrybudget.service.ProjectExpenditureService;
import com.govbudget.management.ministrybudget.service.OfficeExpenditureService;
import com.govbudget.management.ministrybudget.service.CategoryExpenditureService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class ExpenditureController {

    private final ProjectExpenditureService projectService;
    private final OfficeExpenditureService officeService;
    private final CategoryExpenditureService categoryService;

    public ExpenditureController(
            ProjectExpenditureService projectService,
            OfficeExpenditureService officeService,
            CategoryExpenditureService categoryService) {
        this.projectService = projectService;
        this.officeService = officeService;
        this.categoryService = categoryService;
    }

    // Project expenditure
    @PostMapping("/api/v1/projects/{projectId}/expenditures")
    public ResponseEntity<?> createProjectExpenditure(
            @PathVariable Long projectId,
            @RequestBody CumulativeExpenditureRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.create(projectId, request));
    }

    @GetMapping("/api/v1/projects/{projectId}/expenditures")
    public ResponseEntity<?> getProjectHistory(
            @PathVariable Long projectId) {

        return ResponseEntity.ok(projectService.getHistory(projectId));
    }

    @PutMapping("/api/v1/projects/{projectId}/expenditures/{historyId}")
    public ResponseEntity<?> updateProjectExpenditure(
            @PathVariable Long projectId,
            @PathVariable Long historyId,
            @RequestBody CumulativeExpenditureRequest request) {
        return ResponseEntity.ok(projectService.update(projectId, historyId, request));
    }

    // Office expenditure
    @PostMapping("/api/v1/office-allocations/{allocationId}/expenditures")
    public ResponseEntity<?> createOfficeExpenditure(
            @PathVariable Long allocationId,
            @RequestBody CumulativeExpenditureRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(officeService.create(allocationId, request));
    }

    @GetMapping("/api/v1/office-allocations/{allocationId}/expenditures")
    public ResponseEntity<?> getOfficeHistory(
            @PathVariable Long allocationId) {

        return ResponseEntity.ok(officeService.getHistory(allocationId));
    }

    @PutMapping("/api/v1/office-allocations/{allocationId}/expenditures/{historyId}")
    public ResponseEntity<?> updateOfficeExpenditure(
            @PathVariable Long allocationId,
            @PathVariable Long historyId,
            @RequestBody CumulativeExpenditureRequest request) {
        return ResponseEntity.ok(officeService.update(allocationId, historyId, request));
    }

    // SEDP expenditure is recorded against the ministry-wide category allocation.
    @PostMapping("/api/v1/budget-categories/{categoryId}/expenditures")
    public ResponseEntity<?> createCategoryExpenditure(
            @PathVariable Long categoryId,
            @RequestBody CumulativeExpenditureRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.create(categoryId, request));
    }

    @GetMapping("/api/v1/budget-categories/{categoryId}/expenditures")
    public ResponseEntity<?> getCategoryHistory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(categoryService.getHistory(categoryId));
    }

    @PutMapping("/api/v1/budget-categories/{categoryId}/expenditures/{historyId}")
    public ResponseEntity<?> updateCategoryExpenditure(
            @PathVariable Long categoryId,
            @PathVariable Long historyId,
            @RequestBody CumulativeExpenditureRequest request) {
        return ResponseEntity.ok(categoryService.update(categoryId, historyId, request));
    }
}
