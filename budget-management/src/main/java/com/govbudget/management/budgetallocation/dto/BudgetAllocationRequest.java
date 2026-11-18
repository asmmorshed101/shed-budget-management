
package com.govbudget.management.budgetallocation.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BudgetAllocationRequest(

    @NotNull
    Long fiscalYearId,

    @NotNull
    UUID organizationId,

    @NotNull
    Short budgetTypeId,

    @NotNull
    Short budgetSourceId,

    @NotNull
    @DecimalMin("0.01")
    @Digits(integer = 16, fraction = 2)
    BigDecimal originalAmount,

    @NotNull
    LocalDate allocationDate,

    String remarks

) {}
