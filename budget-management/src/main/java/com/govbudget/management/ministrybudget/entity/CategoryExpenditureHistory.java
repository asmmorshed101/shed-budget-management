package com.govbudget.management.ministrybudget.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "category_expenditure_history")
@Getter
@Setter
public class CategoryExpenditureHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "expense_head_id", nullable = false)
    private Long expenseHeadId;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "cumulative_amount", nullable = false)
    private BigDecimal cumulativeAmount;

    @Column(name = "incremental_amount", nullable = false)
    private BigDecimal incrementalAmount = BigDecimal.ZERO;

    private String remarks;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
