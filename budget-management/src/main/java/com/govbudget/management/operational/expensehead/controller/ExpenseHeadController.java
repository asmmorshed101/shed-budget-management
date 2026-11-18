
package com.govbudget.management.operational.expensehead.controller;

import com.govbudget.management.operational.expensehead.entity.ExpenseHead;
import com.govbudget.management.operational.expensehead.service.ExpenseHeadService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/expense-heads")
public class ExpenseHeadController {

    private final ExpenseHeadService service;

    public ExpenseHeadController(ExpenseHeadService service) {
        this.service = service;
    }

    // Get all: Active + Inactive
    @GetMapping
    public ResponseEntity<List<ExpenseHead>> getAllHeads() {
        return ResponseEntity.ok(service.getAllHeads());
    }

    // Get only active heads
    @GetMapping("/active")
    public ResponseEntity<List<ExpenseHead>> getActiveHeads() {
        return ResponseEntity.ok(service.getActiveHeads());
    }

    // Create
    @PostMapping
    public ResponseEntity<ExpenseHead> create(
            @RequestBody ExpenseHead head) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(head));
    }

    // Update
    @PutMapping("/{id}")
    public ResponseEntity<ExpenseHead> update(
            @PathVariable Long id,
            @RequestBody ExpenseHead request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    // Deactivate
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ExpenseHead> deactivate(
            @PathVariable Long id) {
        return ResponseEntity.ok(service.deactivate(id));
    }
@PatchMapping("/{id}/activate")
public ResponseEntity<ExpenseHead> activate(
        @PathVariable Long id) {

    return ResponseEntity.ok(service.activate(id));
}
}
