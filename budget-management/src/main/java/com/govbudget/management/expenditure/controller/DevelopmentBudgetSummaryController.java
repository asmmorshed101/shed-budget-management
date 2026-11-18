package com.govbudget.management.expenditure.controller;

import com.govbudget.management.expenditure.dto.DevelopmentBudgetSummaryDTO;
import com.govbudget.management.expenditure.service.DevelopmentBudgetSummaryService;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/development-budget-summary")
@CrossOrigin(origins = "*")
public class DevelopmentBudgetSummaryController {

    private final DevelopmentBudgetSummaryService summaryService;

    public DevelopmentBudgetSummaryController(
            DevelopmentBudgetSummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @GetMapping
    public List<DevelopmentBudgetSummaryDTO> getDevelopmentBudgetSummary(
            @RequestParam Long fiscalYearId,
            @RequestParam UUID organizationId) {

        return summaryService.getDevelopmentBudgetSummary(
                fiscalYearId,
                organizationId
        );
    }
}