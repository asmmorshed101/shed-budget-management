
package com.govbudget.management.organization.controller;

import com.govbudget.management.organization.dto.OrganizationRequest;
import com.govbudget.management.organization.dto.OrganizationResponse;
import com.govbudget.management.organization.entity.Organization;
import com.govbudget.management.organization.service.OrganizationService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(
            OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    // CREATE ORGANIZATION
    @PostMapping
    public Organization create(
            @Valid @RequestBody OrganizationRequest request) {

        return organizationService.create(request);
    }

    // GET ALL ORGANIZATIONS
    @GetMapping
    public List<Organization> findAll() {
        return organizationService.findAll();
    }

    // GET ORGANIZATION BY ID
    @GetMapping("/{id}")
    public Organization findById(@PathVariable UUID id) {
        return organizationService.findById(id);
    }

    // UPDATE ORGANIZATION
    @PutMapping("/{id}")
    public Organization updateOrganization(
            @PathVariable UUID id,
            @Valid @RequestBody OrganizationRequest request) {

        return organizationService.updateOrganization(id, request);
    }

    // DEACTIVATE ORGANIZATION
    @PatchMapping("/{id}/deactivate")
    public Organization deactivateOrganization(
            @PathVariable UUID id) {

        return organizationService.deactivateOrganization(id);
    }
    // GET ORGANIZATION HIERARCHY
        @GetMapping("/hierarchy")
        public List<OrganizationResponse> getHierarchy() {

            return organizationService.getHierarchy();
        }
}
