
package com.govbudget.management.operational.expenditure.service;

import com.govbudget.management.operational.expenditure.dto.OperationalExpenditureRequest;
import com.govbudget.management.operational.expenditure.dto.OperationalExpenditureResponse;
import com.govbudget.management.operational.expenditure.entity.OperationalExpenditure;
import com.govbudget.management.operational.expenditure.repository.OperationalExpenditureRepository;

import com.govbudget.management.operational.budgethead.entity.OperationalBudgetHead;
import com.govbudget.management.operational.budgethead.repository.OperationalBudgetHeadRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@Transactional
public class OperationalExpenditureService {

    private final OperationalExpenditureRepository expenditureRepository;
    private final OperationalBudgetHeadRepository budgetHeadRepository;

    public OperationalExpenditureService(
            OperationalExpenditureRepository expenditureRepository,
            OperationalBudgetHeadRepository budgetHeadRepository
    ) {
        this.expenditureRepository = expenditureRepository;
        this.budgetHeadRepository = budgetHeadRepository;
    }

    // =====================================================
    // CREATE EXPENDITURE
    // =====================================================

    public OperationalExpenditureResponse createExpenditure(
            OperationalExpenditureRequest request,
            String attachmentPath
    ) 

{

        validateRequest(request);

        OperationalBudgetHead budgetHead =
                getBudgetHead(request.getOperationalBudgetHeadId());

        if (!"APPROVED".equals(budgetHead.getStatus())) {
            throw new RuntimeException(
                    "Operational budget head must be approved first"
            );
        }

        validateRemainingBudget(
                budgetHead,
                request.getAmount(),
                null
        );

        OperationalExpenditure expenditure =
                new OperationalExpenditure();

        expenditure.setOperationalBudgetHeadId(
                request.getOperationalBudgetHeadId()
        );
         expenditure.setAttachmentPath(attachmentPath);

        expenditure.setExpenditureDate(
                request.getExpenditureDate()
        );

        expenditure.setAmount(request.getAmount());
        expenditure.setDescription(request.getDescription());
        expenditure.setRemarks(request.getRemarks());
        expenditure.setStatus("DRAFT");

        OperationalExpenditure saved =
                expenditureRepository.save(expenditure);

        return mapToResponse(saved);
    }


    // =====================================================
    // GET ALL EXPENDITURES
    // =====================================================

    @Transactional(readOnly = true)
    public List<OperationalExpenditureResponse> getAllExpenditures() {

        return expenditureRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }


    // =====================================================
    // GET EXPENDITURE BY ID
    // =====================================================

    @Transactional(readOnly = true)
    public OperationalExpenditureResponse getExpenditureById(Long id) {

        OperationalExpenditure expenditure =
                getExpenditure(id);

        return mapToResponse(expenditure);
    }


    // =====================================================
    // GET EXPENDITURES BY BUDGET HEAD
    // =====================================================

    @Transactional(readOnly = true)
    public List<OperationalExpenditureResponse>
    getByBudgetHeadId(Long budgetHeadId) {

        return expenditureRepository
                .findByOperationalBudgetHeadIdOrderByIdDesc(budgetHeadId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }


    // =====================================================
    // GET EXPENDITURES BY STATUS
    // =====================================================

    @Transactional(readOnly = true)
    public List<OperationalExpenditureResponse> getByStatus(
            String status
    ) {

        return expenditureRepository.findByStatusOrderByIdDesc(
                status.toUpperCase()
        ).stream()
                .map(this::mapToResponse)
                .toList();
    }


    // =====================================================
    // UPDATE DRAFT / REJECTED EXPENDITURE
    // =====================================================

    public OperationalExpenditureResponse updateExpenditure(
            Long id,
            OperationalExpenditureRequest request,
String attachmentPath

    ) {

        validateRequest(request);

        OperationalExpenditure expenditure = getExpenditure(id);

        if (!"DRAFT".equals(expenditure.getStatus())
                && !"REJECTED".equals(expenditure.getStatus())) {

            throw new RuntimeException(
                    "Only DRAFT or REJECTED expenditure can be updated"
            );
        }

        if (!expenditure.getOperationalBudgetHeadId()
                .equals(request.getOperationalBudgetHeadId())) {

            throw new RuntimeException(
                    "Budget head cannot be changed"
            );
        }

        OperationalBudgetHead budgetHead =
                getBudgetHead(expenditure.getOperationalBudgetHeadId());

        if (!"APPROVED".equals(budgetHead.getStatus())) {
            throw new RuntimeException(
                    "Operational budget head must be approved"
            );
        }

        validateRemainingBudget(
                budgetHead,
                request.getAmount(),
                id
        );

        expenditure.setExpenditureDate(request.getExpenditureDate());
        expenditure.setAmount(request.getAmount());
        expenditure.setDescription(request.getDescription());
        expenditure.setRemarks(request.getRemarks());

        // Update attachment only when a new file is uploaded
            if (attachmentPath != null) {
                expenditure.setAttachmentPath(attachmentPath);
            }

        expenditure.setStatus("DRAFT");
        expenditure.setSubmittedAt(null);
        expenditure.setApprovedAt(null);

        OperationalExpenditure updated =
                expenditureRepository.save(expenditure);

        return mapToResponse(updated);
    }


    // =====================================================
    // SUBMIT EXPENDITURE FOR APPROVAL
    // =====================================================

    public OperationalExpenditureResponse submitForApproval(Long id) {

        OperationalExpenditure expenditure = getExpenditure(id);

        if (!"DRAFT".equals(expenditure.getStatus())) {
            throw new RuntimeException(
                    "Only DRAFT expenditure can be submitted"
            );
        }

        OperationalBudgetHead budgetHead =
                getBudgetHead(expenditure.getOperationalBudgetHeadId());

        if (!"APPROVED".equals(budgetHead.getStatus())) {
            throw new RuntimeException(
                    "Operational budget head is not approved"
            );
        }

        validateRemainingBudget(
                budgetHead,
                expenditure.getAmount(),
                id
        );

        expenditure.setStatus("SUBMITTED");
        expenditure.setSubmittedAt(OffsetDateTime.now());

        OperationalExpenditure updated =
                expenditureRepository.save(expenditure);

        return mapToResponse(updated);
    }


    // =====================================================
    // APPROVE EXPENDITURE
    // =====================================================

    public OperationalExpenditureResponse approveExpenditure(Long id) {

        OperationalExpenditure expenditure = getExpenditure(id);

        if (!"SUBMITTED".equals(expenditure.getStatus())) {
            throw new RuntimeException(
                    "Only SUBMITTED expenditure can be approved"
            );
        }

        OperationalBudgetHead budgetHead =
                getBudgetHead(expenditure.getOperationalBudgetHeadId());

        if (!"APPROVED".equals(budgetHead.getStatus())) {
            throw new RuntimeException(
                    "Operational budget head is not approved"
            );
        }

        // Recheck remaining budget at approval time
        validateRemainingBudget(
                budgetHead,
                expenditure.getAmount(),
                id
        );

        expenditure.setStatus("APPROVED");
        expenditure.setApprovedAt(OffsetDateTime.now());

        OperationalExpenditure updated =
                expenditureRepository.save(expenditure);

        return mapToResponse(updated);
    }


    // =====================================================
    // REJECT EXPENDITURE
    // =====================================================

    public OperationalExpenditureResponse rejectExpenditure(
            Long id,
            String remarks
    ) {

        OperationalExpenditure expenditure = getExpenditure(id);

        if (!"SUBMITTED".equals(expenditure.getStatus())) {
            throw new RuntimeException(
                    "Only SUBMITTED expenditure can be rejected"
            );
        }

        expenditure.setStatus("REJECTED");
        expenditure.setRemarks(remarks);

        OperationalExpenditure updated =
                expenditureRepository.save(expenditure);

        return mapToResponse(updated);
    }


    // =====================================================
    // CALCULATE APPROVED EXPENDITURE
    // =====================================================

    @Transactional(readOnly = true)
    public BigDecimal getTotalApprovedExpenditure(Long budgetHeadId) {

        List<OperationalExpenditure> expenditures =
                expenditureRepository
                        .findByOperationalBudgetHeadIdAndStatus(
                                budgetHeadId,
                                "APPROVED"
                        );

        return expenditures.stream()
                .map(OperationalExpenditure::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }


    // =====================================================
    // REMAINING BUDGET VALIDATION
    // =====================================================

    private void validateRemainingBudget(
            OperationalBudgetHead budgetHead,
            BigDecimal requestedAmount,
            Long excludeExpenditureId
    ) {

        List<OperationalExpenditure> expenditures =
                expenditureRepository
                        .findByOperationalBudgetHeadIdOrderByIdDesc(
                                budgetHead.getId()
                        );

        BigDecimal approvedTotal = BigDecimal.ZERO;

        BigDecimal submittedTotal = BigDecimal.ZERO;

        for (OperationalExpenditure expenditure : expenditures) {

            if (excludeExpenditureId != null
                    && expenditure.getId().equals(excludeExpenditureId)) {
                continue;
            }

            if ("APPROVED".equals(expenditure.getStatus())) {

                approvedTotal = approvedTotal.add(
                        expenditure.getAmount()
                );
            }

            // Reserve budget for submitted requests
            if ("SUBMITTED".equals(expenditure.getStatus())) {

                submittedTotal = submittedTotal.add(
                        expenditure.getAmount()
                );
            }
        }

        BigDecimal totalRequired = approvedTotal
                .add(submittedTotal)
                .add(requestedAmount);

        if (totalRequired.compareTo(
                budgetHead.getBudgetedAmount()
        ) > 0) {

            throw new RuntimeException(
                    "Insufficient budget. Requested amount exceeds "
                    + "the remaining operational budget."
            );
        }
    }


    // =====================================================
    // VALIDATE REQUEST
    // =====================================================

    private void validateRequest(
            OperationalExpenditureRequest request
    ) {

        if (request == null) {
            throw new RuntimeException("Request body is required");
        }

        if (request.getOperationalBudgetHeadId() == null) {
            throw new RuntimeException(
                    "Operational budget head ID is required"
            );
        }

        if (request.getExpenditureDate() == null) {
            throw new RuntimeException(
                    "Expenditure date is required"
            );
        }

        if (request.getAmount() == null
                || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Expenditure amount must be greater than zero"
            );
        }
    }


    // =====================================================
    // GET BUDGET HEAD
    // =====================================================

    private OperationalBudgetHead getBudgetHead(Long id) {

        return budgetHeadRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Operational budget head not found"
                        )
                );
    }


    // =====================================================
    // GET EXPENDITURE
    // =====================================================

    private OperationalExpenditure getExpenditure(Long id) {

        return expenditureRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Operational expenditure not found"
                        )
                );
    }


    // =====================================================
    // ENTITY TO RESPONSE DTO
    // =====================================================

    private OperationalExpenditureResponse mapToResponse(
            OperationalExpenditure expenditure
    ) {

        return new OperationalExpenditureResponse(
                expenditure.getId(),
                expenditure.getOperationalBudgetHeadId(),
                expenditure.getExpenditureDate(),
                expenditure.getAmount(),
                expenditure.getDescription(),
                expenditure.getAttachmentPath(),
                expenditure.getStatus(),
                expenditure.getSubmittedAt(),
                expenditure.getApprovedAt(),
                expenditure.getRemarks(),
                expenditure.getCreatedAt(),
                expenditure.getUpdatedAt()
        );
    }
}
