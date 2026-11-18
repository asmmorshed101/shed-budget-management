
package com.govbudget.management.operational.budgethead.dto;

import java.math.BigDecimal;

public class OperationalBudgetHeadRequest {

    private Long budgetAllocationId;

    private Long expenseHeadId;

    private BigDecimal budgetedAmount;

    private String remarks;

    public Long getBudgetAllocationId() {
        return budgetAllocationId;
    }

    public void setBudgetAllocationId(Long budgetAllocationId) {
        this.budgetAllocationId = budgetAllocationId;
    }

    public Long getExpenseHeadId() {
        return expenseHeadId;
    }

    public void setExpenseHeadId(Long expenseHeadId) {
        this.expenseHeadId = expenseHeadId;
    }

    public BigDecimal getBudgetedAmount() {
        return budgetedAmount;
    }

    public void setBudgetedAmount(BigDecimal budgetedAmount) {
        this.budgetedAmount = budgetedAmount;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
