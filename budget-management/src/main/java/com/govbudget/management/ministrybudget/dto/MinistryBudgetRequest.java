
package com.govbudget.management.ministrybudget.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record MinistryBudgetRequest(
        Long fiscalYearId,
        UUID organizationId,
        BigDecimal totalAmount,
        String remarks
) {}
