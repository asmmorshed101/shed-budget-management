
package com.govbudget.management.reference.repository;

import com.govbudget.management.reference.entity.BudgetType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetTypeRepository
        extends JpaRepository<BudgetType, Short> {
}
