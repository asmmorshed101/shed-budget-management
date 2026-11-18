
package com.govbudget.management.reference.controller;

import com.govbudget.management.reference.dto.BudgetReferenceResponse;
import com.govbudget.management.reference.service.BudgetReferenceService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class BudgetReferenceController {

    private final BudgetReferenceService referenceService;

    public BudgetReferenceController(
            BudgetReferenceService referenceService) {
        this.referenceService = referenceService;
    }

    @GetMapping("/budget-types")
    public List<BudgetReferenceResponse> getBudgetTypes() {
        return referenceService.getBudgetTypes();
    }

    @GetMapping("/budget-sources")
    public List<BudgetReferenceResponse> getBudgetSources() {
        return referenceService.getBudgetSources();
    }
}
