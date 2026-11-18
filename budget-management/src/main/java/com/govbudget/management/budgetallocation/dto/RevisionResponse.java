
package com.govbudget.management.budgetallocation.dto;

import com.govbudget.management.budgetallocation.entity.BudgetAllocationRevision;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record RevisionResponse(
    Long id,
    Long budgetAllocationId,
    Integer revisionNo,
    BigDecimal previousAmount,
    BigDecimal revisedAmount,
    String revisionReason,
    String status,
    OffsetDateTime requestedAt,
    OffsetDateTime approvedAt,
    String remarks
) {
    public static RevisionResponse from(BudgetAllocationRevision revision) {
        return new RevisionResponse(
            revision.getId(),
            revision.getBudgetAllocationId(),
            revision.getRevisionNo(),
            revision.getPreviousAmount(),
            revision.getRevisedAmount(),
            revision.getRevisionReason(),
            revision.getStatus(),
            revision.getRequestedAt(),
            revision.getApprovedAt(),
            revision.getRemarks()
        );
    }
}
