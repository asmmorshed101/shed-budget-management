
package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.OfficeAllocationRequest;
import com.govbudget.management.ministrybudget.entity.*;
import com.govbudget.management.ministrybudget.repository.*;
import com.govbudget.management.organization.repository.OrganizationRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OfficeBudgetAllocationService {

    private final OfficeBudgetAllocationRepository allocationRepository;
    private final CategoryBudgetSourceRepository sourceRepository;
    private final OrganizationRepository organizationRepository;
    private final ProjectRepository projectRepository;
    private final OfficeExpenditureHistoryRepository historyRepository;

    public OfficeBudgetAllocationService(
            OfficeBudgetAllocationRepository allocationRepository,
            CategoryBudgetSourceRepository sourceRepository,
            OrganizationRepository organizationRepository,
            ProjectRepository projectRepository,
            OfficeExpenditureHistoryRepository historyRepository) {
        this.allocationRepository = allocationRepository;
        this.sourceRepository = sourceRepository;
        this.organizationRepository = organizationRepository;
        this.projectRepository = projectRepository;
        this.historyRepository = historyRepository;
    }

    @Transactional
    public OfficeBudgetAllocation create(
            Long sourceId, OfficeAllocationRequest request) {

        CategoryBudgetSource source = sourceRepository.findById(sourceId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Budget source not found"));

        var organization = organizationRepository
                .findById(request.organizationId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Office not found"));

        if (organization.getParent() == null) {
            throw new IllegalArgumentException(
                    "Select an office under the parent ministry");
        }

        if (allocationRepository
                .findByCategorySourceIdAndOrganizationId(
                        sourceId, request.organizationId()).isPresent()) {
            throw new IllegalArgumentException(
                    "Allocation already exists for this office and source");
        }

        validateAmount(request.allocatedAmount());

        BigDecimal existingTotal = allocationRepository
                .findByCategorySourceId(sourceId)
                .stream()
                .map(OfficeBudgetAllocation::getAllocatedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (existingTotal.add(request.allocatedAmount())
                .compareTo(source.getAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Office allocations exceed source budget");
        }

        OfficeBudgetAllocation allocation = new OfficeBudgetAllocation();
        allocation.setCategorySourceId(sourceId);
        allocation.setOrganizationId(request.organizationId());
        allocation.setAllocatedAmount(request.allocatedAmount());
        allocation.setRemarks(request.remarks());

        return allocationRepository.save(allocation);
    }

    @Transactional(readOnly = true)
    public List<OfficeBudgetAllocation> getBySource(Long sourceId) {
        if (!sourceRepository.existsById(sourceId)) {
            throw new IllegalArgumentException("Source not found");
        }
        return allocationRepository.findByCategorySourceId(sourceId);
    }

    @Transactional
    public OfficeBudgetAllocation update(
            Long id, OfficeAllocationRequest request) {

        OfficeBudgetAllocation allocation = allocationRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Office allocation not found"));

        if (!allocation.getOrganizationId().equals(request.organizationId())) {
            throw new IllegalArgumentException(
                    "Organization cannot be changed");
        }

        validateAmount(request.allocatedAmount());

        CategoryBudgetSource source = sourceRepository
                .findById(allocation.getCategorySourceId()).orElseThrow();

        BigDecimal otherAllocations = allocationRepository
                .findByCategorySourceId(source.getId())
                .stream()
                .filter(a -> !a.getId().equals(id))
                .map(OfficeBudgetAllocation::getAllocatedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (otherAllocations.add(request.allocatedAmount())
                .compareTo(source.getAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Office allocations exceed source budget");
        }

        BigDecimal projectTotal = projectRepository
                .findByOfficeBudgetAllocationId(id)
                .stream()
                .map(Project::getAllocatedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal officeExpenditure = historyRepository
                .findByOfficeBudgetAllocationIdOrderByReportDateDescIdDesc(id)
                .stream()
                .findFirst()
                .map(OfficeExpenditureHistory::getCumulativeAmount)
                .orElse(BigDecimal.ZERO);

        if (request.allocatedAmount().compareTo(projectTotal) < 0
                || request.allocatedAmount().compareTo(officeExpenditure) < 0) {
            throw new IllegalArgumentException(
                    "Allocation cannot be less than projects or expenditure");
        }

        allocation.setAllocatedAmount(request.allocatedAmount());
        allocation.setRemarks(request.remarks());

        return allocationRepository.save(allocation);
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Invalid allocation amount");
        }
    }
}
