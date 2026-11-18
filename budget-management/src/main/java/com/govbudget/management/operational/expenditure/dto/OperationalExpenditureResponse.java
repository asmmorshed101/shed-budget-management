
package com.govbudget.management.operational.expenditure.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public class OperationalExpenditureResponse {

    private Long id;

    private Long operationalBudgetHeadId;

    private LocalDate expenditureDate;

    private BigDecimal amount;

    private String description;

    private String attachmentPath;

    private String status;

    private OffsetDateTime submittedAt;

    private OffsetDateTime approvedAt;

    private String remarks;

    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;

    public OperationalExpenditureResponse(
            Long id,
            Long operationalBudgetHeadId,
            LocalDate expenditureDate,
            BigDecimal amount,
            String description,
            String attachmentPath,
            String status,
            OffsetDateTime submittedAt,
            OffsetDateTime approvedAt,
            String remarks,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.operationalBudgetHeadId = operationalBudgetHeadId;
        this.expenditureDate = expenditureDate;
        this.amount = amount;
        this.description = description;
        this.attachmentPath = attachmentPath;
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

    public Long getOperationalBudgetHeadId() {
        return operationalBudgetHeadId;
    }

    public LocalDate getExpenditureDate() {
        return expenditureDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getDescription() {
        return description;
    }

    public String getAttachmentPath() {
        return attachmentPath;
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
