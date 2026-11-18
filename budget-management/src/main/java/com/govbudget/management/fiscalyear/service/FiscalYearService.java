
package com.govbudget.management.fiscalyear.service;

import com.govbudget.management.fiscalyear.dto.FiscalYearRequest;
import com.govbudget.management.fiscalyear.dto.FiscalYearResponse;
import com.govbudget.management.fiscalyear.entity.FiscalYear;
import com.govbudget.management.fiscalyear.repository.FiscalYearRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FiscalYearService {

    private final FiscalYearRepository repository;

    public FiscalYearService(FiscalYearRepository repository) {
        this.repository = repository;
    }

    // VALIDATE DATES
    private void validateDates(FiscalYearRequest request) {

        if (!request.startDate().isBefore(request.endDate())) {
            throw new IllegalArgumentException(
                    "Start date must be before end date");
        }
    }

    // CREATE FISCAL YEAR
    @Transactional
    public FiscalYearResponse create(FiscalYearRequest request) {

        validateDates(request);

        if (repository.existsByName(request.name())) {
            throw new IllegalArgumentException(
                    "Fiscal year already exists");
        }

        FiscalYear fiscalYear = new FiscalYear();

        fiscalYear.setName(request.name());
        fiscalYear.setStartDate(request.startDate());
        fiscalYear.setEndDate(request.endDate());
        fiscalYear.setIsActive(false);

        return FiscalYearResponse.from(
                repository.save(fiscalYear)
        );
    }

    // GET ALL FISCAL YEARS
    @Transactional(readOnly = true)
    public List<FiscalYearResponse> findAll() {

        return repository.findAll()
                .stream()
                .map(FiscalYearResponse::from)
                .toList();
    }

    // GET FISCAL YEAR BY ID
    @Transactional(readOnly = true)
    public FiscalYearResponse findById(Long id) {

        FiscalYear fiscalYear = repository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Fiscal year not found"));

        return FiscalYearResponse.from(fiscalYear);
    }

    // UPDATE FISCAL YEAR
    @Transactional
    public FiscalYearResponse update(
            Long id,
            FiscalYearRequest request) {

        validateDates(request);

        FiscalYear fiscalYear = repository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Fiscal year not found"));

        if (repository.existsByNameAndIdNot(request.name(), id)) {
            throw new IllegalArgumentException(
                    "Fiscal year name already exists");
        }

        fiscalYear.setName(request.name());
        fiscalYear.setStartDate(request.startDate());
        fiscalYear.setEndDate(request.endDate());

        return FiscalYearResponse.from(
                repository.save(fiscalYear)
        );
    }

    
// ACTIVATE FISCAL YEAR
@Transactional
public FiscalYearResponse activate(Long id) {

    // Check whether fiscal year exists
    if (!repository.existsById(id)) {
        throw new IllegalArgumentException(
                "Fiscal year not found");
    }

    // Step 1: Deactivate all currently active fiscal years
    repository.deactivateAllFiscalYears();

    // Step 2: Activate selected fiscal year
    int updated = repository.activateFiscalYear(id);

    if (updated == 0) {
        throw new IllegalStateException(
                "Failed to activate fiscal year");
    }

    // Step 3: Fetch updated fiscal year
    FiscalYear fiscalYear = repository.findById(id)
            .orElseThrow(() ->
                    new IllegalArgumentException(
                            "Fiscal year not found"));

    return FiscalYearResponse.from(fiscalYear);
}

}
