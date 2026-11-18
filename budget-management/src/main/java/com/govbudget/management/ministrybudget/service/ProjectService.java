
package com.govbudget.management.ministrybudget.service;

import com.govbudget.management.ministrybudget.dto.ProjectRequest;
import com.govbudget.management.ministrybudget.entity.*;
import com.govbudget.management.ministrybudget.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final OfficeBudgetAllocationRepository allocationRepository;
    private final CategoryBudgetSourceRepository sourceRepository;
    private final MinistryBudgetCategoryRepository categoryRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            OfficeBudgetAllocationRepository allocationRepository,
            CategoryBudgetSourceRepository sourceRepository,
            MinistryBudgetCategoryRepository categoryRepository) {
        this.projectRepository = projectRepository;
        this.allocationRepository = allocationRepository;
        this.sourceRepository = sourceRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public Project create(Long allocationId, ProjectRequest request) {

        OfficeBudgetAllocation allocation = allocationRepository
                .findById(allocationId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Office allocation not found"));

        CategoryBudgetSource source = sourceRepository
                .findById(allocation.getCategorySourceId())
                .orElseThrow();

        MinistryBudgetCategory category = categoryRepository
                .findById(source.getCategoryId())
                .orElseThrow();

        if (!"DEVELOPMENT".equals(category.getCategoryCode())
                || !"ADP".equals(source.getSourceCode())) {
            throw new IllegalArgumentException(
                    "Projects can only be created under Development ADP");
        }

        if (request.projectCode() == null || request.projectCode().isBlank()
                || request.projectName() == null || request.projectName().isBlank()) {
            throw new IllegalArgumentException(
                    "Project code and name are required");
        }

        if (request.allocatedAmount() == null
                || request.allocatedAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Invalid project allocation");
        }

        if (projectRepository.existsByProjectCode(request.projectCode())) {
            throw new IllegalArgumentException("Project code already exists");
        }

        if (request.startDate() != null && request.endDate() != null
                && request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("Invalid project dates");
        }

        BigDecimal existingProjectTotal = projectRepository
                .findByOfficeBudgetAllocationId(allocationId)
                .stream()
                .map(Project::getAllocatedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (existingProjectTotal.add(request.allocatedAmount())
                .compareTo(allocation.getAllocatedAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Project allocations exceed office ADP allocation");
        }

        Project project = new Project();
        project.setOfficeBudgetAllocationId(allocationId);
        project.setProjectCode(request.projectCode());
        project.setProjectName(request.projectName());
        project.setProjectNameBn(request.projectNameBn());
        project.setAllocatedAmount(request.allocatedAmount());
        project.setStartDate(request.startDate());
        project.setEndDate(request.endDate());
        project.setRemarks(request.remarks());

        return projectRepository.save(project);
    }

    @Transactional(readOnly = true)
    public List<Project> getByOfficeAllocation(Long allocationId) {
        if (!allocationRepository.existsById(allocationId)) {
            throw new IllegalArgumentException("Office allocation not found");
        }
        return projectRepository.findByOfficeBudgetAllocationId(allocationId);
    }

    @Transactional(readOnly = true)
    public Project getById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
    }

    @Transactional
    public Project update(Long id, ProjectRequest request) {

        Project project = projectRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Project not found"));

        if (request.allocatedAmount() == null
                || request.allocatedAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Invalid project allocation");
        }

        if (!project.getProjectCode().equals(request.projectCode())) {
            throw new IllegalArgumentException(
                    "Project code cannot be changed");
        }

        BigDecimal otherProjects = projectRepository
                .findByOfficeBudgetAllocationId(
                        project.getOfficeBudgetAllocationId())
                .stream()
                .filter(p -> !p.getId().equals(id))
                .map(Project::getAllocatedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        OfficeBudgetAllocation allocation = allocationRepository
                .findById(project.getOfficeBudgetAllocationId()).orElseThrow();

        if (otherProjects.add(request.allocatedAmount())
                .compareTo(allocation.getAllocatedAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Project allocations exceed office allocation");
        }

        project.setProjectName(request.projectName());
        project.setProjectNameBn(request.projectNameBn());
        project.setAllocatedAmount(request.allocatedAmount());
        project.setStartDate(request.startDate());
        project.setEndDate(request.endDate());
        project.setRemarks(request.remarks());

        return projectRepository.save(project);
    }
}
