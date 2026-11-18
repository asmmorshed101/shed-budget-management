
package com.govbudget.management.organization.service;

import com.govbudget.management.organization.dto.OrganizationRequest;
import com.govbudget.management.organization.dto.OrganizationResponse;
import com.govbudget.management.organization.entity.Organization;
import com.govbudget.management.organization.entity.OrganizationType;
import com.govbudget.management.organization.repository.OrganizationRepository;
import com.govbudget.management.organization.repository.OrganizationTypeRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationTypeRepository typeRepository;

    public OrganizationService(
            OrganizationRepository organizationRepository,
            OrganizationTypeRepository typeRepository) {

        this.organizationRepository = organizationRepository;
        this.typeRepository = typeRepository;
    }

    // CREATE ORGANIZATION
    @Transactional
    public Organization create(OrganizationRequest request) {

        if (organizationRepository.existsByCode(request.code())) {
            throw new IllegalArgumentException(
                    "Organization code already exists");
        }

        OrganizationType type = typeRepository.findById(
                request.organizationTypeId()
        ).orElseThrow(() ->
                new IllegalArgumentException("Invalid organization type"));

        Organization organization = new Organization();

        organization.setCode(request.code());
        organization.setName(request.name());
        organization.setNameBn(request.nameBn());
        organization.setOrganizationType(type);

        if (request.parentId() != null) {

            Organization parent = organizationRepository
                    .findById(request.parentId())
                    .orElseThrow(() ->
                            new IllegalArgumentException("Parent not found"));

            if (parent.getParent() != null) {
                throw new IllegalArgumentException(
                        "Offices must be created under the parent office");
            }

            organization.setParent(parent);
        } else if (organizationRepository.existsByParentIsNull()) {
            throw new IllegalArgumentException(
                    "A parent office already exists. Select it as the parent office.");
        }

        return organizationRepository.save(organization);
    }

    // GET ALL ORGANIZATIONS
    @Transactional(readOnly = true)
    public List<Organization> findAll() {
        return organizationRepository.findAll();
    }

    // GET ORGANIZATION BY ID
    @Transactional(readOnly = true)
    public Organization findById(UUID id) {
        return organizationRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Organization not found"));
    }

    // UPDATE ORGANIZATION
    @Transactional
    public Organization updateOrganization(
            UUID id,
            OrganizationRequest request) {

        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Organization not found"));

        if (organizationRepository.existsByCodeAndIdNot(
                request.code(), id)) {

            throw new IllegalArgumentException(
                    "Organization code already exists");
        }

        // Use typeRepository, not organizationTypeRepository
        OrganizationType organizationType = typeRepository.findById(
                request.organizationTypeId()
        ).orElseThrow(() ->
                new IllegalArgumentException("Organization type not found"));

        Organization parent = null;

        if (request.parentId() != null) {

            parent = organizationRepository.findById(request.parentId())
                    .orElseThrow(() ->
                            new IllegalArgumentException("Parent not found"));

            if (parent.getParent() != null) {
                throw new IllegalArgumentException(
                        "Offices must be assigned directly under the parent office");
            }
        } else if (organization.getParent() != null) {
            throw new IllegalArgumentException(
                    "An office must remain under the parent office");
        }

        // Prevent circular hierarchy
        validateParentHierarchy(id, parent);

        organization.setCode(request.code());
        organization.setName(request.name());
        organization.setNameBn(request.nameBn());
        organization.setOrganizationType(organizationType);
        organization.setParent(parent);

        return organizationRepository.save(organization);
    }

    // DEACTIVATE ORGANIZATION
@Transactional
public Organization deactivateOrganization(UUID id) {

    Organization organization = organizationRepository.findById(id)
            .orElseThrow(() ->
                    new IllegalArgumentException(
                            "Organization not found"));

    organization.setIsActive(false);

    return organizationRepository.save(organization);
}

    // VALIDATE PARENT HIERARCHY
    private void validateParentHierarchy(
            UUID organizationId,
            Organization parent) {

        Set<UUID> visited = new HashSet<>();

        Organization current = parent;

        while (current != null) {

            if (!visited.add(current.getId())) {
                throw new IllegalArgumentException(
                        "Circular organization hierarchy detected");
            }

            if (current.getId().equals(organizationId)) {
                throw new IllegalArgumentException(
                        "Cannot assign a descendant as parent");
            }

            current = current.getParent();
        }
    }
        // GET ORGANIZATION HIERARCHY
        @Transactional(readOnly = true)
        public List<OrganizationResponse> getHierarchy() {

            return organizationRepository.findAll()
                    .stream()
                    .map(OrganizationResponse::from)
                    .toList();
        }
}
