
package com.govbudget.management.ministrybudget.dto;

import java.math.BigDecimal;

public record CategoryRequest(
        String categoryCode,
        String categoryName,
        BigDecimal totalAmount,
        String remarks
) {}
