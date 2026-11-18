package com.govbudget.management.expenditure.service;

import com.govbudget.management.expenditure.entity.DevelopmentExpenditure;
import com.govbudget.management.expenditure.repository.DevelopmentExpenditureRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class DevelopmentExpenditureService {

    private final DevelopmentExpenditureRepository repository;

    public DevelopmentExpenditureService(
            DevelopmentExpenditureRepository repository) {
        this.repository = repository;
    }

    public List<DevelopmentExpenditure> getAllExpenditures() {
        return repository.findAll();
    }

    public DevelopmentExpenditure getExpenditureById(Long id) {
        return repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Expenditure not found with ID: " + id));
    }

    public DevelopmentExpenditure saveExpenditure(
            DevelopmentExpenditure expenditure) {
        return repository.save(expenditure);
    }

    // Submit expenditure for approval
    @Transactional
    public DevelopmentExpenditure submitExpenditure(Long id) {

        DevelopmentExpenditure expenditure =
                getExpenditureById(id);

        if (!"DRAFT".equals(expenditure.getStatus())) {
            throw new RuntimeException(
                    "Only DRAFT expenditure can be submitted");
        }

        expenditure.setStatus("SUBMITTED");
        expenditure.setSubmittedAt(OffsetDateTime.now());

        return repository.save(expenditure);
    }

    // Approve expenditure
    @Transactional
    public DevelopmentExpenditure approveExpenditure(Long id) {

        DevelopmentExpenditure expenditure =
                getExpenditureById(id);

        if (!"SUBMITTED".equals(expenditure.getStatus())) {
            throw new RuntimeException(
                    "Only SUBMITTED expenditure can be approved");
        }

        expenditure.setStatus("APPROVED");
        expenditure.setApprovedAt(OffsetDateTime.now());

        return repository.save(expenditure);
    }

    // Reject expenditure
    @Transactional
    public DevelopmentExpenditure rejectExpenditure(Long id) {

        DevelopmentExpenditure expenditure =
                getExpenditureById(id);

        if (!"SUBMITTED".equals(expenditure.getStatus())) {
            throw new RuntimeException(
                    "Only SUBMITTED expenditure can be rejected");
        }

        expenditure.setStatus("REJECTED");

        return repository.save(expenditure);
    }

    public void deleteExpenditure(Long id) {
        repository.deleteById(id);
    }
}