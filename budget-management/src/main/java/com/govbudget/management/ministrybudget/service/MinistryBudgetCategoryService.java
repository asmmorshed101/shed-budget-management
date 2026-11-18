
package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.CategoryRequest;
import com.govbudget.management.ministrybudget.entity.MinistryBudget;
import com.govbudget.management.ministrybudget.entity.MinistryBudgetCategory;
import com.govbudget.management.ministrybudget.repository.MinistryBudgetRepository;
import com.govbudget.management.ministrybudget.repository.MinistryBudgetCategoryRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Service
public class MinistryBudgetCategoryService {

    private final MinistryBudgetRepository budgetRepository;
    private final MinistryBudgetCategoryRepository categoryRepository;

    private static final Set<String> FIXED_CATEGORIES =
            Set.of("OPERATIONAL", "SEDP", "DEVELOPMENT");

    public MinistryBudgetCategoryService(
            MinistryBudgetRepository budgetRepository,
            MinistryBudgetCategoryRepository categoryRepository) {

        this.budgetRepository = budgetRepository;
        this.categoryRepository = categoryRepository;
    }

    // Get All Categories
    @Transactional(readOnly = true)
    public List<MinistryBudgetCategory> getByBudgetId(Long budgetId) {

        if (!budgetRepository.existsById(budgetId)) {
            throw new IllegalArgumentException(
                    "Ministry budget not found");
        }

        return categoryRepository.findByMinistryBudgetId(budgetId);
    }

    // Update Category Amount
    @Transactional
    public MinistryBudgetCategory update(
            Long categoryId,
            CategoryRequest request) {

        MinistryBudgetCategory category =
                categoryRepository.findById(categoryId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Category not found"));

        validateAmount(request.totalAmount());

        String code = normalizeCode(request.categoryCode());

        if (!FIXED_CATEGORIES.contains(code)) {
            throw new IllegalArgumentException(
                    "Invalid budget category");
        }

        if (!category.getCategoryCode().equals(code)) {
            throw new IllegalArgumentException(
                    "Category code cannot be changed");
        }

        MinistryBudget budget = budgetRepository
                .findById(category.getMinistryBudgetId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Ministry budget not found"));

        // Calculate other categories' total
        BigDecimal otherCategoriesTotal = categoryRepository
                .findByMinistryBudgetId(budget.getId())
                .stream()
                .filter(c -> !c.getId().equals(categoryId))
                .map(MinistryBudgetCategory::getTotalAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal newCategoryTotal =
                otherCategoriesTotal.add(request.totalAmount());

        if (newCategoryTotal.compareTo(
                budget.getTotalAmount()) > 0) {

            throw new IllegalArgumentException(
                    "Category total exceeds ministry budget. " +
                    "Available amount: " +
                    budget.getTotalAmount()
                            .subtract(otherCategoriesTotal));
        }

        category.setTotalAmount(request.totalAmount());
        category.setRemarks(request.remarks());

        return categoryRepository.save(category);
    }

    // Calculate Total of All Categories
    @Transactional(readOnly = true)
    public BigDecimal getCategoryTotal(Long budgetId) {

        if (!budgetRepository.existsById(budgetId)) {
            throw new IllegalArgumentException(
                    "Ministry budget not found");
        }

        return categoryRepository
                .findByMinistryBudgetId(budgetId)
                .stream()
                .map(MinistryBudgetCategory::getTotalAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Calculate Unallocated Amount
    @Transactional(readOnly = true)
    public BigDecimal getUnallocatedAmount(Long budgetId) {

        MinistryBudget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Ministry budget not found"));

        return budget.getTotalAmount()
                .subtract(getCategoryTotal(budgetId));
    }

    private String normalizeCode(String code) {

        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException(
                    "Category code is required");
        }

        return code.trim().toUpperCase();
    }

    private void validateAmount(BigDecimal amount) {

        if (amount == null ||
                amount.compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalArgumentException(
                    "Category amount must be zero or greater");
        }
    }

@Transactional
public MinistryBudgetCategory create(
        Long budgetId, CategoryRequest request) {

    MinistryBudget budget = budgetRepository.findById(budgetId)
            .orElseThrow(() ->
                    new IllegalArgumentException(
                            "Ministry budget not found"));

    String code = normalizeCode(request.categoryCode());

    if (!FIXED_CATEGORIES.contains(code)) {
        throw new IllegalArgumentException(
                "Invalid budget category");
    }

    if (categoryRepository.existsByMinistryBudgetIdAndCategoryCode(
            budgetId, code)) {
        throw new IllegalArgumentException(
                "Category already exists");
    }

    validateAmount(request.totalAmount());

    BigDecimal existingTotal = getCategoryTotal(budgetId);

    if (existingTotal.add(request.totalAmount())
            .compareTo(budget.getTotalAmount()) > 0) {
        throw new IllegalArgumentException(
                "Category total exceeds ministry budget");
    }

    MinistryBudgetCategory category =
            new MinistryBudgetCategory();

    category.setMinistryBudgetId(budgetId);
    category.setCategoryCode(code);
    category.setCategoryName(getCategoryName(code));
    category.setTotalAmount(request.totalAmount());
    category.setRemarks(request.remarks());

    return categoryRepository.save(category);
}

private String getCategoryName(String code) {
    return switch (code) {
        case "OPERATIONAL" -> "পরিচালন বাজেট";
        case "SEDP" -> "এসইডিপি";
        case "DEVELOPMENT" -> "উন্নয়ন বাজেট";
        default -> throw new IllegalArgumentException(
                "Invalid budget category");
    };
}

}
