
package com.govbudget.management.ministrybudget.repository;

import com.govbudget.management.ministrybudget.entity.OfficeBudgetAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OfficeBudgetAllocationRepository
        extends JpaRepository<OfficeBudgetAllocation, Long> {

    List<OfficeBudgetAllocation> findByCategorySourceId(Long categorySourceId);

    List<OfficeBudgetAllocation> findByOrganizationId(UUID organizationId);

    Optional<OfficeBudgetAllocation> findByCategorySourceIdAndOrganizationId(
            Long categorySourceId, UUID organizationId);
}
