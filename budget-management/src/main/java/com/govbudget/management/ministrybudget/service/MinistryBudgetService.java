
package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.MinistryBudgetRequest;
import com.govbudget.management.ministrybudget.entity.MinistryBudget;
import com.govbudget.management.ministrybudget.entity.MinistryBudgetCategory;
import com.govbudget.management.ministrybudget.repository.MinistryBudgetRepository;
import com.govbudget.management.ministrybudget.repository.MinistryBudgetCategoryRepository;
import com.govbudget.management.organization.repository.OrganizationRepository;
import com.govbudget.management.fiscalyear.repository.FiscalYearRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class MinistryBudgetService {

    private final MinistryBudgetRepository budgetRepository;
    private final OrganizationRepository organizationRepository;
    private final FiscalYearRepository fiscalYearRepository;
    private final MinistryBudgetCategoryRepository categoryRepository;

    public MinistryBudgetService(
            MinistryBudgetRepository budgetRepository,
            OrganizationRepository organizationRepository,
            FiscalYearRepository fiscalYearRepository,
            MinistryBudgetCategoryRepository categoryRepository) {

        this.budgetRepository = budgetRepository;
        this.organizationRepository = organizationRepository;
        this.fiscalYearRepository = fiscalYearRepository;
        this.categoryRepository = categoryRepository;
    }

    // Create Ministry Budget
    @Transactional
    public MinistryBudget create(MinistryBudgetRequest request) {

        validateAmount(request.totalAmount());

        if (request.totalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Ministry budget must be greater than zero");
        }

        if (request.fiscalYearId() == null ||
                !fiscalYearRepository.existsById(request.fiscalYearId())) {
            throw new IllegalArgumentException("Fiscal year not found");
        }

        if (request.organizationId() == null ||
                !organizationRepository.existsById(request.organizationId())) {
            throw new IllegalArgumentException("Organization not found");
        }

        if (budgetRepository.findByFiscalYearIdAndOrganizationId(
                request.fiscalYearId(),
                request.organizationId()).isPresent()) {

            throw new IllegalArgumentException(
                    "Ministry budget already exists for this fiscal year");
        }

        MinistryBudget budget = new MinistryBudget();
        budget.setFiscalYearId(request.fiscalYearId());
        budget.setOrganizationId(request.organizationId());
        budget.setTotalAmount(request.totalAmount());
        budget.setRemarks(request.remarks());

        MinistryBudget savedBudget = budgetRepository.save(budget);

        // Automatically create three fixed categories
        createDefaultCategories(savedBudget.getId());

        return savedBudget;
    }

    // Create Default Categories
    private void createDefaultCategories(Long budgetId) {

        createCategory(budgetId, "OPERATIONAL", "পরিচালন বাজেট");
        createCategory(budgetId, "SEDP", "এসইডিপি");
        createCategory(budgetId, "DEVELOPMENT", "উন্নয়ন বাজেট");
    }

    private void createCategory(
            Long budgetId,
            String code,
            String name) {

        MinistryBudgetCategory category =
                new MinistryBudgetCategory();

        category.setMinistryBudgetId(budgetId);
        category.setCategoryCode(code);
        category.setCategoryName(name);
        category.setTotalAmount(BigDecimal.ZERO);

        categoryRepository.save(category);
    }

    // Get All Ministry Budgets
    @Transactional(readOnly = true)
    public List<MinistryBudget> getAll() {
        return budgetRepository.findAll();
    }

    // Get Ministry Budget By ID
    @Transactional(readOnly = true)
    public MinistryBudget getById(Long id) {

        return budgetRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Ministry budget not found"));
    }

    // Get Ministry Budget By Fiscal Year and Organization
    @Transactional(readOnly = true)
    public MinistryBudget getByFiscalYearAndOrganization(
            Long fiscalYearId,
            UUID organizationId) {

        return budgetRepository
                .findByFiscalYearIdAndOrganizationId(
                        fiscalYearId, organizationId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Ministry budget not found"));
    }

    // Update Ministry Budget
    @Transactional
    public MinistryBudget update(
            Long id,
            MinistryBudgetRequest request) {

        MinistryBudget budget = getById(id);

        validateAmount(request.totalAmount());

        if (request.totalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Ministry budget must be greater than zero");
        }

        BigDecimal categoryTotal = getCategoryTotal(id);

        if (request.totalAmount().compareTo(categoryTotal) < 0) {
            throw new IllegalArgumentException(
                    "Ministry budget cannot be less than category total");
        }

        budget.setTotalAmount(request.totalAmount());
        budget.setRemarks(request.remarks());

        return budgetRepository.save(budget);
    }

    // Calculate Category Total
    @Transactional(readOnly = true)
    public BigDecimal getCategoryTotal(Long budgetId) {

        return categoryRepository
                .findByMinistryBudgetId(budgetId)
                .stream()
                .map(MinistryBudgetCategory::getTotalAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Calculate Unallocated Budget
    @Transactional(readOnly = true)
    public BigDecimal getUnallocatedAmount(Long budgetId) {

        MinistryBudget budget = getById(budgetId);

        return budget.getTotalAmount()
                .subtract(getCategoryTotal(budgetId));
    }

    private void validateAmount(BigDecimal amount) {

        if (amount == null ||
                amount.compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalArgumentException(
                    "Amount must be zero or greater");
        }
    }
}
