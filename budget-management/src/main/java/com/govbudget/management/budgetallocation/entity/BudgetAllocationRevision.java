
package com.govbudget.management.budgetallocation.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "budget_allocation_revisions")
@Getter
@Setter
public class BudgetAllocationRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "budget_allocation_id", nullable = false)
    private Long budgetAllocationId;

    @Column(name = "revision_no", nullable = false)
    private Integer revisionNo;

    @Column(name = "previous_amount", nullable = false,
            precision = 18, scale = 2)
    private BigDecimal previousAmount;

    @Column(name = "revised_amount", nullable = false,
            precision = 18, scale = 2)
    private BigDecimal revisedAmount;

    @Column(name = "revision_reason",
            nullable = false, columnDefinition = "TEXT")
    private String revisionReason;

    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "requested_at")
    private OffsetDateTime requestedAt;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        requestedAt = OffsetDateTime.now();
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
