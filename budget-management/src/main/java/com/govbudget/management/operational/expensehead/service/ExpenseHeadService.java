
package com.govbudget.management.operational.expensehead.service;

import com.govbudget.management.operational.expensehead.entity.ExpenseHead;
import com.govbudget.management.operational.expensehead.repository.ExpenseHeadRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ExpenseHeadService {

    private final ExpenseHeadRepository repository;

    public ExpenseHeadService(ExpenseHeadRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ExpenseHead> getActiveHeads() {
        return repository.findByActiveTrueOrderByIdDesc();
    }
@Transactional
public ExpenseHead create(ExpenseHead head) {

    if (head.getCode() == null || head.getCode().isBlank()) {
        throw new IllegalArgumentException("Expense head code is required");
    }

    if (head.getName() == null || head.getName().isBlank()) {
        throw new IllegalArgumentException("Expense head name is required");
    }

    if (repository.existsByCode(head.getCode().trim())) {
        throw new IllegalArgumentException("Expense head code already exists");
    }

    head.setId(null);
    head.setCode(head.getCode().trim());
    head.setName(head.getName().trim());
    head.setActive(true);

    return repository.save(head);
}
@Transactional
public ExpenseHead update(Long id, ExpenseHead request) {

    ExpenseHead existing = repository.findById(id)
            .orElseThrow(() ->
                    new IllegalArgumentException("Expense head not found"));

    if (request.getCode() == null || request.getCode().isBlank()) {
        throw new IllegalArgumentException("Code is required");
    }

    if (request.getName() == null || request.getName().isBlank()) {
        throw new IllegalArgumentException("Name is required");
    }

    String newCode = request.getCode().trim();

    repository.findByCode(newCode)
            .filter(head -> !head.getId().equals(id))
            .ifPresent(head -> {
                throw new IllegalArgumentException("Expense head code already exists");
            });

    existing.setCode(newCode);
    existing.setName(request.getName().trim());
    existing.setNameBn(request.getNameBn());

    return repository.save(existing);
}
@Transactional
public ExpenseHead deactivate(Long id) {

    ExpenseHead head = repository.findById(id)
            .orElseThrow(() ->
                    new IllegalArgumentException("Expense head not found"));

    head.setActive(false);

    return repository.save(head);
}
@Transactional(readOnly = true)
public List<ExpenseHead> getAllHeads() {
    return repository.findAllByOrderByIdDesc();
}

// @Transactional(readOnly = true)
// public List<ExpenseHead> getActiveHeads() {
//     return repository.findByActiveTrueOrderByIdDesc();
// }
@Transactional
public ExpenseHead activate(Long id) {

    ExpenseHead head = repository.findById(id)
            .orElseThrow(() ->
                    new IllegalArgumentException("Expense head not found"));

    head.setActive(true);

    return repository.save(head);
}
}
