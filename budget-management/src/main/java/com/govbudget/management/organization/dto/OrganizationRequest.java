package com.govbudget.management.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record OrganizationRequest(

        UUID parentId,

        @NotNull
        Short organizationTypeId,

        @NotBlank
        @Size(max = 40)
        String code,

        @NotBlank
        @Size(max = 255)
        String name,

        @NotBlank
        @Size(max = 255)
        String nameBn

) {}