
package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.dto.SourceRequest;
import com.govbudget.management.ministrybudget.service.CategoryBudgetSourceService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/budget-categories/{categoryId}/sources")
public class CategoryBudgetSourceController {

    private final CategoryBudgetSourceService service;

    public CategoryBudgetSourceController(
            CategoryBudgetSourceService service) {
        this.service = service;
    }

    // CREATE SOURCE
    @PostMapping
    public ResponseEntity<?> create(
            @PathVariable Long categoryId,
            @RequestBody SourceRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(categoryId, request));
    }

    // GET ALL SOURCES BY CATEGORY
    @GetMapping
    public ResponseEntity<?> getByCategory(
            @PathVariable Long categoryId) {

        return ResponseEntity.ok(
                service.getByCategoryId(categoryId)
        );
    }

    // UPDATE SOURCE
    @PutMapping("/{sourceId}")
    public ResponseEntity<?> update(
            @PathVariable Long categoryId,
            @PathVariable Long sourceId,
            @RequestBody SourceRequest request) {

        return ResponseEntity.ok(
                service.update(categoryId, sourceId, request)
        );
    }
}
