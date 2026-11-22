
package com.govbudget.management.ministrybudget.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardSummaryResponse(
        String ministryName,
        Long fiscalYearId,
        LocalDate asOfDate,

        BigDecimal totalBudget,
        BigDecimal totalExpenditure,
        BigDecimal remainingBudget,
        BigDecimal utilizationPercentage,

        BigDecimal operationalBudget,
        BigDecimal operationalExpenditure,

        BigDecimal sedpBudget,
        BigDecimal sedpExpenditure,

        BigDecimal developmentBudget,
        BigDecimal developmentExpenditure,

        BigDecimal developmentAdpBudget,
        BigDecimal developmentAdpExpenditure,

        BigDecimal developmentBlockBudget,
        BigDecimal developmentBlockExpenditure,

        List<CategorySummary> categories
) {
    public record CategorySummary(
            String categoryCode,
            String categoryName,
            BigDecimal budget,
            BigDecimal expenditure,
            BigDecimal remaining
    ) {}
}
