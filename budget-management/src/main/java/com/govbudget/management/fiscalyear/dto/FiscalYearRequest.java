package com.govbudget.management.fiscalyear.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record FiscalYearRequest(

        @NotBlank
        String name,

        @NotNull
        LocalDate startDate,

        @NotNull
        LocalDate endDate

) {}