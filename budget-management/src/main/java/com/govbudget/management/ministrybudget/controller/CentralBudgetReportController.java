
package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.service.CentralBudgetReportService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
public class CentralBudgetReportController {

    private final CentralBudgetReportService reportService;

    public CentralBudgetReportController(
            CentralBudgetReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/central-budget")
    public ResponseEntity<?> getCentralBudgetReport(
            @RequestParam Long fiscalYearId,
            @RequestParam UUID organizationId,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate) {

        return ResponseEntity.ok(
                reportService.getReport(
                        fiscalYearId,
                        organizationId,
                        fromDate,
                        toDate
                )
        );
    }
}
