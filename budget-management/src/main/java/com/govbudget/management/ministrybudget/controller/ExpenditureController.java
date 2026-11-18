
package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.dto.CumulativeExpenditureRequest;
import com.govbudget.management.ministrybudget.service.ProjectExpenditureService;
import com.govbudget.management.ministrybudget.service.OfficeExpenditureService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class ExpenditureController {

    private final ProjectExpenditureService projectService;
    private final OfficeExpenditureService officeService;

    public ExpenditureController(
            ProjectExpenditureService projectService,
            OfficeExpenditureService officeService) {
        this.projectService = projectService;
        this.officeService = officeService;
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
}
