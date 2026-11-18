
package com.govbudget.management.ministrybudget.repository;

import com.govbudget.management.ministrybudget.entity.MinistryBudget;
import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface MinistryBudgetRepository
        extends JpaRepository<MinistryBudget, Long> {

    Optional<MinistryBudget> findByFiscalYearIdAndOrganizationId(
            Long fiscalYearId, UUID organizationId);

//     @Query ("select m from MinistryBudget m where m.fiscalYearId=?1 and m.organizationId=?2")
//     MinistryBudget find(Long fiscalYearId, UUID organizationId);   
}
