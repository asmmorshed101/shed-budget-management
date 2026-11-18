
package com.govbudget.management.budgetallocation.service;

import com.govbudget.management.budgetallocation.dto.*;
import com.govbudget.management.budgetallocation.entity.*;
import com.govbudget.management.budgetallocation.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class BudgetAllocationService {

    private final BudgetAllocationRepository allocationRepository;
    private final BudgetAllocationRevisionRepository revisionRepository;

    public BudgetAllocationService(
            BudgetAllocationRepository allocationRepository,
            BudgetAllocationRevisionRepository revisionRepository) {
        this.allocationRepository = allocationRepository;
        this.revisionRepository = revisionRepository;
    }

    // Create Allocation
    @Transactional
    public BudgetAllocationResponse create(BudgetAllocationRequest request) {

        boolean exists =
            allocationRepository
                .existsByFiscalYearIdAndOrganizationIdAndBudgetTypeIdAndBudgetSourceId(
                    request.fiscalYearId(),
                    request.organizationId(),
                    request.budgetTypeId(),
                    request.budgetSourceId()
                );

        if (exists) {
            throw new IllegalArgumentException(
                "Allocation already exists for this organization and budget combination."
            );
        }

        BudgetAllocation allocation = new BudgetAllocation();

        allocation.setFiscalYearId(request.fiscalYearId());
        allocation.setOrganizationId(request.organizationId());
        allocation.setBudgetTypeId(request.budgetTypeId());
        allocation.setBudgetSourceId(request.budgetSourceId());

        allocation.setOriginalAmount(request.originalAmount());
        allocation.setCurrentAmount(request.originalAmount());

        allocation.setAllocationDate(request.allocationDate());
        allocation.setRemarks(request.remarks());
        allocation.setStatus("DRAFT");

        return BudgetAllocationResponse.from(
            allocationRepository.save(allocation)
        );
    }

    // Get All Allocations
    @Transactional(readOnly = true)
    public List<BudgetAllocationResponse> findAll() {
        return allocationRepository.findAll()
            .stream()
            .map(BudgetAllocationResponse::from)
            .toList();
    }

    // Get Allocation by ID
    @Transactional(readOnly = true)
    public BudgetAllocationResponse findById(Long id) {
        return BudgetAllocationResponse.from(
            getAllocation(id)
        );
    }

    // Approve Original Allocation
    @Transactional
    public BudgetAllocationResponse approve(Long id) {

        BudgetAllocation allocation = getAllocation(id);

        if (!"DRAFT".equals(allocation.getStatus())) {
            throw new IllegalStateException(
                "Only draft allocations can be approved."
            );
        }

        allocation.setStatus("APPROVED");

        return BudgetAllocationResponse.from(
            allocationRepository.save(allocation)
        );
    }

    // Submit Revision
    @Transactional
    public RevisionResponse submitRevision(
            Long allocationId,
            RevisionRequest request) {

        BudgetAllocation allocation = getAllocation(allocationId);

        if (!"APPROVED".equals(allocation.getStatus())) {
            throw new IllegalStateException(
                "Only approved allocations can be revised."
            );
        }

        boolean pending =
            revisionRepository.existsByBudgetAllocationIdAndStatus(
                allocationId, "SUBMITTED"
            );

        if (pending) {
            throw new IllegalStateException(
                "A revision is already pending approval."
            );
        }

        int nextRevisionNo =
            revisionRepository
                .findTopByBudgetAllocationIdOrderByRevisionNoDesc(allocationId)
                .map(revision -> revision.getRevisionNo() + 1)
                .orElse(1);

        BudgetAllocationRevision revision =
            new BudgetAllocationRevision();

        revision.setBudgetAllocationId(allocationId);
        revision.setRevisionNo(nextRevisionNo);
        revision.setPreviousAmount(allocation.getCurrentAmount());
        revision.setRevisedAmount(request.revisedAmount());
        revision.setRevisionReason(request.revisionReason());
        revision.setRemarks(request.remarks());
        revision.setStatus("SUBMITTED");

        return RevisionResponse.from(
            revisionRepository.save(revision)
        );
    }

    // Approve Revision
    @Transactional
    public RevisionResponse approveRevision(Long revisionId) {

        BudgetAllocationRevision revision =
            revisionRepository.findById(revisionId)
                .orElseThrow(() -> new IllegalArgumentException(
                    "Revision not found."
                ));

        BudgetAllocation allocation =
            getAllocation(revision.getBudgetAllocationId());

        if (!"SUBMITTED".equals(revision.getStatus())) {
            throw new IllegalStateException(
                "Only submitted revisions can be approved."
            );
        }

        if (!allocation.getCurrentAmount()
                .equals(revision.getPreviousAmount())) {
            throw new IllegalStateException(
                "Allocation changed after this revision was submitted."
            );
        }

        allocation.setCurrentAmount(revision.getRevisedAmount());

        revision.setStatus("APPROVED");
        revision.setApprovedAt(OffsetDateTime.now());

        allocationRepository.save(allocation);
        revisionRepository.save(revision);

        return RevisionResponse.from(revision);
    }

    // Reject Revision
    @Transactional
    public RevisionResponse rejectRevision(Long revisionId) {

        BudgetAllocationRevision revision =
            revisionRepository.findById(revisionId)
                .orElseThrow(() -> new IllegalArgumentException(
                    "Revision not found."
                ));

        if (!"SUBMITTED".equals(revision.getStatus())) {
            throw new IllegalStateException(
                "Only submitted revisions can be rejected."
            );
        }

        revision.setStatus("REJECTED");

        return RevisionResponse.from(
            revisionRepository.save(revision)
        );
    }

    // Get Revision History
    @Transactional(readOnly = true)
    public List<RevisionResponse> getRevisionHistory(Long allocationId) {

        getAllocation(allocationId);

        return revisionRepository
            .findByBudgetAllocationIdOrderByRevisionNoDesc(allocationId)
            .stream()
            .map(RevisionResponse::from)
            .toList();
    }

    private BudgetAllocation getAllocation(Long id) {
        return allocationRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException(
                "Budget allocation not found."
            ));
    }
}
