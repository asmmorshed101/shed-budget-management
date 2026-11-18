package com.govbudget.management.ministrybudget.dto;

import java.math.BigDecimal;
import java.util.List;

public record BudgetHeadAllocationRequest(List<Item> allocations) {
    public record Item(Long expenseHeadId, BigDecimal allocatedAmount) {}
}
