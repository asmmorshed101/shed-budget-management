
package com.govbudget.management.ministrybudget.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CumulativeExpenditureRequest(
        LocalDate reportDate,
        BigDecimal amount,
        String remarks,
        Long expenseHeadId
) {}
