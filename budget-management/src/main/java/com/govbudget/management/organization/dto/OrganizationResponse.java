package com.govbudget.management.organization.dto;

import com.govbudget.management.organization.entity.Organization;

import java.util.UUID;

public record OrganizationResponse(

        UUID id,
        String code,
        String name,
        String nameBn,

        Short organizationTypeId,
        String organizationTypeName,

        UUID parentId,
        Boolean isActive

) {

    public static OrganizationResponse from(
            Organization organization) {

        return new OrganizationResponse(

                organization.getId(),

                organization.getCode(),

                organization.getName(),

                organization.getNameBn(),

                organization.getOrganizationType() != null
                        ? organization.getOrganizationType().getId()
                        : null,

                organization.getOrganizationType() != null
                        ? organization.getOrganizationType().getName()
                        : null,

                organization.getParent() != null
                        ? organization.getParent().getId()
                        : null,

                organization.getIsActive()
        );
    }
}