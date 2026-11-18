
package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.service.DashboardService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(
            @RequestParam Long fiscalYearId,
            @RequestParam UUID organizationId,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate asOfDate) {

        return ResponseEntity.ok(
                dashboardService.getSummary(
                        fiscalYearId, organizationId, asOfDate));
    }
}
