
package com.govbudget.management.ministrybudget.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OfficeAllocationRequest(
        UUID organizationId,
        BigDecimal allocatedAmount,
        String remarks
) {}
