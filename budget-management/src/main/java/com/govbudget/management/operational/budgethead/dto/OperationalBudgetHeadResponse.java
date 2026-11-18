
package com.govbudget.management.operational.budgethead.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class OperationalBudgetHeadResponse {

    private Long id;

    private Long budgetAllocationId;

    private Long expenseHeadId;

    private BigDecimal budgetedAmount;

    private String status;

    private OffsetDateTime submittedAt;

    private OffsetDateTime approvedAt;

    private String remarks;

    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;

    public OperationalBudgetHeadResponse(
            Long id,
            Long budgetAllocationId,
            Long expenseHeadId,
            BigDecimal budgetedAmount,
            String status,
            OffsetDateTime submittedAt,
            OffsetDateTime approvedAt,
            String remarks,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.budgetAllocationId = budgetAllocationId;
        this.expenseHeadId = expenseHeadId;
        this.budgetedAmount = budgetedAmount;
        this.status = status;
        this.submittedAt = submittedAt;
        this.approvedAt = approvedAt;
        this.remarks = remarks;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getBudgetAllocationId() {
        return budgetAllocationId;
    }

    public Long getExpenseHeadId() {
        return expenseHeadId;
    }

    public BigDecimal getBudgetedAmount() {
        return budgetedAmount;
    }

    public String getStatus() {
        return status;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }

    public OffsetDateTime getApprovedAt() {
        return approvedAt;
    }

    public String getRemarks() {
        return remarks;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
