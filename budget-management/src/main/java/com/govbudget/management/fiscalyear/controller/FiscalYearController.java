
package com.govbudget.management.fiscalyear.controller;

import com.govbudget.management.fiscalyear.dto.FiscalYearRequest;
import com.govbudget.management.fiscalyear.dto.FiscalYearResponse;
import com.govbudget.management.fiscalyear.service.FiscalYearService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fiscal-years")
public class FiscalYearController {

    private final FiscalYearService fiscalYearService;

    public FiscalYearController(FiscalYearService fiscalYearService) {
        this.fiscalYearService = fiscalYearService;
    }

    // CREATE
    @PostMapping
    public FiscalYearResponse create(
            @Valid @RequestBody FiscalYearRequest request) {

        return fiscalYearService.create(request);
    }

    // GET ALL
    @GetMapping
    public List<FiscalYearResponse> findAll() {
        return fiscalYearService.findAll();
    }

    // GET BY ID
    @GetMapping("/{id}")
    public FiscalYearResponse findById(@PathVariable Long id) {
        return fiscalYearService.findById(id);
    }

    // UPDATE
    @PutMapping("/{id}")
    public FiscalYearResponse update(
            @PathVariable Long id,
            @Valid @RequestBody FiscalYearRequest request) {

        return fiscalYearService.update(id, request);
    }

    // ACTIVATE
    @PatchMapping("/{id}/activate")
    public FiscalYearResponse activate(@PathVariable Long id) {
        return fiscalYearService.activate(id);
    }
}
