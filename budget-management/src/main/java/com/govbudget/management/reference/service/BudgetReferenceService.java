
package com.govbudget.management.reference.service;

import com.govbudget.management.reference.dto.BudgetReferenceResponse;
import com.govbudget.management.reference.repository.BudgetTypeRepository;
import com.govbudget.management.reference.repository.BudgetSourceRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BudgetReferenceService {

    private final BudgetTypeRepository budgetTypeRepository;
    private final BudgetSourceRepository budgetSourceRepository;

    public BudgetReferenceService(
            BudgetTypeRepository budgetTypeRepository,
            BudgetSourceRepository budgetSourceRepository) {

        this.budgetTypeRepository = budgetTypeRepository;
        this.budgetSourceRepository = budgetSourceRepository;
    }

    @Transactional(readOnly = true)
    public List<BudgetReferenceResponse> getBudgetTypes() {

        return budgetTypeRepository.findAll()
                .stream()
                .map(item -> new BudgetReferenceResponse(
                        item.getId(),
                        item.getCode(),
                        item.getName(),
                        item.getNameBn()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BudgetReferenceResponse> getBudgetSources() {

        return budgetSourceRepository.findByActiveTrue()
                .stream()
                .map(item -> new BudgetReferenceResponse(
                        item.getId(),
                        item.getCode(),
                        item.getName(),
                        item.getNameBn()
                ))
                .toList();
    }
}
