
package com.govbudget.management.ministrybudget.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProjectRequest(
        String projectCode,
        String projectName,
        String projectNameBn,
        BigDecimal allocatedAmount,
        LocalDate startDate,
        LocalDate endDate,
        String remarks
) {}
