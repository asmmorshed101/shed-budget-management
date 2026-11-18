package com.govbudget.management.organization.repository;

import com.govbudget.management.organization.entity.OrganizationType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationTypeRepository
        extends JpaRepository<OrganizationType, Short> {

}