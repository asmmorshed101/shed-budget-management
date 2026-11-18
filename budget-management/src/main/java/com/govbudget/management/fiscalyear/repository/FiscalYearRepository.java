
package com.govbudget.management.fiscalyear.repository;

import com.govbudget.management.fiscalyear.entity.FiscalYear;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface FiscalYearRepository
        extends JpaRepository<FiscalYear, Long> {

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    Optional<FiscalYear> findByIsActiveTrue();

    // Deactivate all fiscal years
    @Modifying(
        flushAutomatically = true,
        clearAutomatically = true
    )
    @Query("""
        UPDATE FiscalYear f
        SET f.isActive = false
        WHERE f.isActive = true
    """)
    void deactivateAllFiscalYears();

    // Activate selected fiscal year
    @Modifying(
        flushAutomatically = true,
        clearAutomatically = true
    )
    @Query("""
        UPDATE FiscalYear f
        SET f.isActive = true
        WHERE f.id = :id
    """)
    int activateFiscalYear(@Param("id") Long id);
}
