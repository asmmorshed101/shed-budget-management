
package com.govbudget.management.budgetallocation.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "budget_allocations")
@Getter
@Setter
public class BudgetAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fiscal_year_id", nullable = false)
    private Long fiscalYearId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "budget_type_id", nullable = false)
    private Short budgetTypeId;

    @Column(name = "budget_source_id", nullable = false)
    private Short budgetSourceId;

    @Column(name = "original_amount", nullable = false,
            precision = 18, scale = 2)
    private BigDecimal originalAmount;

    @Column(name = "current_amount", nullable = false,
            precision = 18, scale = 2)
    private BigDecimal currentAmount;

    @Column(name = "allocation_date", nullable = false)
    private LocalDate allocationDate;

    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
