
package com.govbudget.management.budgetallocation.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record RevisionRequest(

    @NotNull
    @DecimalMin("0.01")
    @Digits(integer = 16, fraction = 2)
    BigDecimal revisedAmount,

    @NotBlank
    String revisionReason,

    String remarks

) {}
