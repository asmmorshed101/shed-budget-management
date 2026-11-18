
package com.govbudget.management.reference.repository;

import com.govbudget.management.reference.entity.BudgetSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BudgetSourceRepository
        extends JpaRepository<BudgetSource, Short> {

    List<BudgetSource> findByActiveTrue();
}
