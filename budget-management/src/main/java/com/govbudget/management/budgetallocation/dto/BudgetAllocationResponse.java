
package com.govbudget.management.budgetallocation.dto;

import com.govbudget.management.budgetallocation.entity.BudgetAllocation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record BudgetAllocationResponse(
    Long id,
    Long fiscalYearId,
    UUID organizationId,
    Short budgetTypeId,
    Short budgetSourceId,
    BigDecimal originalAmount,
    BigDecimal currentAmount,
    LocalDate allocationDate,
    String status,
    String remarks,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static BudgetAllocationResponse from(BudgetAllocation allocation) {
        return new BudgetAllocationResponse(
            allocation.getId(),
            allocation.getFiscalYearId(),
            allocation.getOrganizationId(),
            allocation.getBudgetTypeId(),
            allocation.getBudgetSourceId(),
            allocation.getOriginalAmount(),
            allocation.getCurrentAmount(),
            allocation.getAllocationDate(),
            allocation.getStatus(),
            allocation.getRemarks(),
            allocation.getCreatedAt(),
            allocation.getUpdatedAt()
        );
    }
}
