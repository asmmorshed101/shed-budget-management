package com.govbudget.management.ministrybudget.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Entity
@Table(name = "budget_head_allocations")
@Getter
@Setter
public class BudgetHeadAllocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "office_budget_allocation_id")
    private Long officeBudgetAllocationId;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "expense_head_id", nullable = false)
    private Long expenseHeadId;

    @Column(name = "allocated_amount", nullable = false)
    private BigDecimal allocatedAmount;
}
