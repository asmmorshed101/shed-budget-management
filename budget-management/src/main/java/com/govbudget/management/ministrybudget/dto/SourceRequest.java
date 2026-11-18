
package com.govbudget.management.ministrybudget.dto;

import java.math.BigDecimal;

public record SourceRequest(
        String sourceCode,
        BigDecimal amount,
        String remarks
) {}
