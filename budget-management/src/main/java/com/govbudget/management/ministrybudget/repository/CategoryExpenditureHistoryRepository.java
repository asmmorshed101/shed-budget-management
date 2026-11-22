package com.govbudget.management.ministrybudget.repository;

import com.govbudget.management.ministrybudget.entity.CategoryExpenditureHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryExpenditureHistoryRepository
        extends JpaRepository<CategoryExpenditureHistory, Long> {

    List<CategoryExpenditureHistory> findByCategoryIdOrderByReportDateDescIdDesc(Long categoryId);
}
