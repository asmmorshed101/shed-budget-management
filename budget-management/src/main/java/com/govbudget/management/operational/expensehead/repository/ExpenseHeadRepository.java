
package com.govbudget.management.operational.expensehead.repository;

import com.govbudget.management.operational.expensehead.entity.ExpenseHead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExpenseHeadRepository extends JpaRepository<ExpenseHead, Long> {

    Optional<ExpenseHead> findByCode(String code);

    boolean existsByCode(String code);

    List<ExpenseHead> findAllByOrderByIdDesc();

    List<ExpenseHead> findByActiveTrueOrderByIdDesc();

}
