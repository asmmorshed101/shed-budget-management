
package com.govbudget.management.operational.budgethead.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "operational_budget_heads",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_operational_budget_expense_head",
            columnNames = {"budget_allocation_id", "expense_head_id"}
        )
    }
)
public class OperationalBudgetHead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "budget_allocation_id", nullable = false)
    private Long budgetAllocationId;

    @Column(name = "expense_head_id", nullable = false)
    private Long expenseHeadId;

    @Column(name = "budgeted_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal budgetedAmount;

    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(OffsetDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public OffsetDateTime getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(OffsetDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
