package com.govbudget.management.fiscalyear.dto;

import com.govbudget.management.fiscalyear.entity.FiscalYear;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record FiscalYearResponse(

        Long id,
        String name,
        LocalDate startDate,
        LocalDate endDate,
        Boolean isActive,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt

) {

    public static FiscalYearResponse from(FiscalYear fiscalYear) {

        return new FiscalYearResponse(
                fiscalYear.getId(),
                fiscalYear.getName(),
                fiscalYear.getStartDate(),
                fiscalYear.getEndDate(),
                fiscalYear.getIsActive(),
                fiscalYear.getCreatedAt(),
                fiscalYear.getUpdatedAt()
        );
    }
}