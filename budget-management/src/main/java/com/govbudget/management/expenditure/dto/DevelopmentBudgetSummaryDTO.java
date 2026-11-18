package com.govbudget.management.expenditure.dto;

import java.math.BigDecimal;

public class DevelopmentBudgetSummaryDTO {

    private Long budgetAllocationId;
    private String budgetSource;
    private BigDecimal totalAllocation;
    private BigDecimal totalExpenditure;
    private BigDecimal remainingBalance;

    public DevelopmentBudgetSummaryDTO(
            Long budgetAllocationId,
            String budgetSource,
            BigDecimal totalAllocation,
            BigDecimal totalExpenditure) {

        this.budgetAllocationId = budgetAllocationId;
        this.budgetSource = budgetSource;
        this.totalAllocation = totalAllocation;
        this.totalExpenditure = totalExpenditure;
        this.remainingBalance =
                totalAllocation.subtract(totalExpenditure);
    }

    public Long getBudgetAllocationId() {
        return budgetAllocationId;
    }

    public String getBudgetSource() {
        return budgetSource;
    }

    public BigDecimal getTotalAllocation() {
        return totalAllocation;
    }

    public BigDecimal getTotalExpenditure() {
        return totalExpenditure;
    }

    public BigDecimal getRemainingBalance() {
        return remainingBalance;
    }
}