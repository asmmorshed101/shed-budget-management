
package com.govbudget.management.operational.expenditure.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class OperationalExpenditureRequest {

    private Long operationalBudgetHeadId;

    private LocalDate expenditureDate;

    private BigDecimal amount;

    private String description;

    private String remarks;

    public Long getOperationalBudgetHeadId() {
        return operationalBudgetHeadId;
    }

    public void setOperationalBudgetHeadId(Long operationalBudgetHeadId) {
        this.operationalBudgetHeadId = operationalBudgetHeadId;
    }

    public LocalDate getExpenditureDate() {
        return expenditureDate;
    }

    public void setExpenditureDate(LocalDate expenditureDate) {
        this.expenditureDate = expenditureDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
