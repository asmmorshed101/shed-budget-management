
package com.govbudget.management.organization.repository;

import com.govbudget.management.organization.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OrganizationRepository
        extends JpaRepository<Organization, UUID> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, UUID id);

    boolean existsByParentIsNull();
}
