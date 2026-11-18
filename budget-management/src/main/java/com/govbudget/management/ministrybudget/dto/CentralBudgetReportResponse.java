
package com.govbudget.management.ministrybudget.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CentralBudgetReportResponse(
        Long fiscalYearId,
        LocalDate fromDate,
        LocalDate toDate,

        BigDecimal totalBudget,
        BigDecimal openingExpenditure,
        BigDecimal periodExpenditure,
        BigDecimal closingExpenditure,
        BigDecimal remainingBudget,

        List<OfficeReportRow> offices
) {
    public record OfficeReportRow(
            Long allocationId,
            UUID organizationId,
            String organizationName,
            String categoryCode,
            String sourceCode,

            BigDecimal allocatedAmount,
            BigDecimal openingExpenditure,
            BigDecimal periodExpenditure,
            BigDecimal closingExpenditure,
            BigDecimal remainingAmount
    ) {}
}
