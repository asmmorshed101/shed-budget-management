package com.govbudget.management.expenditure.service;

import com.govbudget.management.budgetallocation.entity.BudgetAllocation;
import com.govbudget.management.budgetallocation.repository.BudgetAllocationRepository;
import com.govbudget.management.expenditure.dto.DevelopmentBudgetSummaryDTO;
import com.govbudget.management.expenditure.repository.DevelopmentExpenditureRepository;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class DevelopmentBudgetSummaryService {

    private final BudgetAllocationRepository budgetAllocationRepository;
    private final DevelopmentExpenditureRepository expenditureRepository;

    public DevelopmentBudgetSummaryService(
            BudgetAllocationRepository budgetAllocationRepository,
            DevelopmentExpenditureRepository expenditureRepository) {

        this.budgetAllocationRepository = budgetAllocationRepository;
        this.expenditureRepository = expenditureRepository;
    }

    public List<DevelopmentBudgetSummaryDTO> getDevelopmentBudgetSummary(
            Long fiscalYearId,
            UUID organizationId) {

        List<BudgetAllocation> allocations =
                budgetAllocationRepository
                        .findByFiscalYearIdAndOrganizationIdAndBudgetTypeId(
                                fiscalYearId,
                                organizationId,
                                (short) 2
                        );

        return allocations.stream()
                .filter(allocation ->
                        "APPROVED".equals(allocation.getStatus()))
                .map(allocation -> {

                    BigDecimal totalAllocation =
                            allocation.getCurrentAmount();

                    BigDecimal totalExpenditure =
                            expenditureRepository.getTotalApprovedExpenditure(
                                    allocation.getId()
                            );

                    String budgetSource =
                            allocation.getBudgetSourceId() == 2
                                    ? "ADP"
                                    : allocation.getBudgetSourceId() == 5
                                            ? "BLOCK"
                                            : "OTHER";

                    return new DevelopmentBudgetSummaryDTO(
                            allocation.getId(),
                            budgetSource,
                            totalAllocation,
                            totalExpenditure
                    );
                })
                .toList();
    }
}