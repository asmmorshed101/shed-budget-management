package com.govbudget.management.organization.controller;

import com.govbudget.management.organization.entity.OrganizationType;
import com.govbudget.management.organization.repository.OrganizationTypeRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/organization-types")
public class OrganizationTypeController {

    private final OrganizationTypeRepository repository;

    public OrganizationTypeController(
            OrganizationTypeRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<OrganizationType> getAllOrganizationTypes() {
        return repository.findAll();
    }
}