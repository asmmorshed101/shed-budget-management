
package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.SourceRequest;
import com.govbudget.management.ministrybudget.entity.CategoryBudgetSource;
import com.govbudget.management.ministrybudget.entity.MinistryBudgetCategory;
import com.govbudget.management.ministrybudget.repository.CategoryBudgetSourceRepository;
import com.govbudget.management.ministrybudget.repository.MinistryBudgetCategoryRepository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryBudgetSourceService {

    private final CategoryBudgetSourceRepository sourceRepository;
    private final MinistryBudgetCategoryRepository categoryRepository;

    public CategoryBudgetSourceService(
            CategoryBudgetSourceRepository sourceRepository,
            MinistryBudgetCategoryRepository categoryRepository) {

        this.sourceRepository = sourceRepository;
        this.categoryRepository = categoryRepository;
    }

    // CREATE SOURCE
    @Transactional
    public CategoryBudgetSource create(
            Long categoryId,
            SourceRequest request) {

        MinistryBudgetCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Category not found"));

        String code = validateSourceCode(request.sourceCode());

        validateAmount(request.amount());

        if (sourceRepository.findByCategoryIdAndSourceCode(categoryId, code)
                .isPresent()) {
            throw new IllegalArgumentException("Source already exists");
        }

        BigDecimal existingTotal = sourceRepository.findByCategoryId(categoryId)
                .stream()
                .map(CategoryBudgetSource::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (existingTotal.add(request.amount())
                .compareTo(category.getTotalAmount()) > 0) {

            throw new IllegalArgumentException(
                    "ADP and Block total exceeds category budget");
        }

        CategoryBudgetSource source = new CategoryBudgetSource();

        source.setCategoryId(categoryId);
        source.setSourceCode(code);
        source.setAmount(request.amount());
        source.setRemarks(request.remarks());

        return sourceRepository.save(source);
    }

    // GET SOURCES BY CATEGORY
    @Transactional(readOnly = true)
    public List<CategoryBudgetSource> getByCategory(Long categoryId) {

        if (!categoryRepository.existsById(categoryId)) {
            throw new IllegalArgumentException("Category not found");
        }

        return sourceRepository.findByCategoryId(categoryId);
    }

    // GET SOURCES BY CATEGORY ID
    @Transactional(readOnly = true)
    public List<CategoryBudgetSource> getByCategoryId(Long categoryId) {

        MinistryBudgetCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Budget category not found"));

        if ("SEDP".equals(category.getCategoryCode())) {
            return List.of();
        }

        return sourceRepository.findByCategoryId(categoryId);
    }

    // GET SOURCE BY ID
    @Transactional(readOnly = true)
    public CategoryBudgetSource getById(Long sourceId) {

        return sourceRepository.findById(sourceId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Budget source not found"));
    }

    // UPDATE SOURCE
    @Transactional
    public CategoryBudgetSource update(
            Long categoryId,
            Long sourceId,
            SourceRequest request) {

        // Find source
        CategoryBudgetSource source = sourceRepository.findById(sourceId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Budget source not found"));

        // Verify source belongs to requested category
        if (!source.getCategoryId().equals(categoryId)) {
            throw new IllegalArgumentException(
                    "Source does not belong to this category");
        }

        // Find category
        MinistryBudgetCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Category not found"));

        validateAmount(request.amount());

        // Update source code if provided
        if (request.sourceCode() != null
                && !request.sourceCode().isBlank()) {

            String newCode = validateSourceCode(request.sourceCode());

            boolean duplicate = sourceRepository
                    .findByCategoryIdAndSourceCode(categoryId, newCode)
                    .filter(existing -> !existing.getId().equals(sourceId))
                    .isPresent();

            if (duplicate) {
                throw new IllegalArgumentException("Source already exists");
            }

            source.setSourceCode(newCode);
        }

        // Calculate other sources total
        BigDecimal otherSourcesTotal = sourceRepository
                .findByCategoryId(categoryId)
                .stream()
                .filter(item -> !item.getId().equals(sourceId))
                .map(CategoryBudgetSource::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal newTotal = otherSourcesTotal.add(request.amount());

        // Check category budget limit
        if (newTotal.compareTo(category.getTotalAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Total source amount cannot exceed category budget");
        }

        source.setAmount(request.amount());

        if (request.remarks() != null) {
            source.setRemarks(request.remarks());
        }

        return sourceRepository.save(source);
    }

    // VALIDATE SOURCE CODE
    private String validateSourceCode(String sourceCode) {

        if (sourceCode == null || sourceCode.isBlank()) {
            throw new IllegalArgumentException("Source code is required");
        }

        String code = sourceCode.trim().toUpperCase();

        if (!List.of("ADP", "BLOCK").contains(code)) {
            throw new IllegalArgumentException(
                    "Source must be ADP or BLOCK");
        }

        return code;
    }

    // VALIDATE AMOUNT
    private void validateAmount(BigDecimal amount) {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Invalid amount");
        }
    }
}
