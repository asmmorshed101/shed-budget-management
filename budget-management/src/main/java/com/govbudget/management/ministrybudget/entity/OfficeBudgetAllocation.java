
package com.govbudget.management.ministrybudget.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "office_budget_allocations")
@Getter
@Setter
public class OfficeBudgetAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_source_id", nullable = false)
    private Long categorySourceId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "allocated_amount", nullable = false)
    private BigDecimal allocatedAmount;

    private String remarks;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
