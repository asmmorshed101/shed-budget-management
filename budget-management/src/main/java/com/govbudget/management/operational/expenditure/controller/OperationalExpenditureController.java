
package com.govbudget.management.operational.expenditure.controller;



import com.govbudget.management.operational.expenditure.dto.OperationalExpenditureRequest;
import com.govbudget.management.operational.expenditure.dto.OperationalExpenditureResponse;
import com.govbudget.management.operational.expenditure.service.FileStorageService;
import com.govbudget.management.operational.expenditure.service.OperationalExpenditureService;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/operational-expenditures")
public class OperationalExpenditureController {

    private final OperationalExpenditureService expenditureService;
    private final FileStorageService fileStorageService;

    public OperationalExpenditureController(
            OperationalExpenditureService expenditureService,
            FileStorageService fileStorageService
    ) {
        this.expenditureService = expenditureService;
        this.fileStorageService = fileStorageService;
    }

    // Create Expenditure with optional attachment
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OperationalExpenditureResponse> createExpenditure(
            @RequestPart("data") OperationalExpenditureRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {

        String fileName = fileStorageService.storeFile(file);

        try {
            return ResponseEntity.status(201).body(
                    expenditureService.createExpenditure(
                            request,
                            fileName
                    )
            );
        } catch (RuntimeException e) {
            fileStorageService.deleteFile(fileName);
            throw e;
        }
    }

    // Get All Expenditures
    @GetMapping
    public ResponseEntity<List<OperationalExpenditureResponse>>
    getAllExpenditures() {

        return ResponseEntity.ok(
                expenditureService.getAllExpenditures()
        );
    }

    // Get Expenditure By ID
    @GetMapping("/{id}")
    public ResponseEntity<OperationalExpenditureResponse>
    getExpenditureById(@PathVariable Long id) {

        return ResponseEntity.ok(
                expenditureService.getExpenditureById(id)
        );
    }

    // Get Expenditures By Budget Head
    @GetMapping("/budget-head/{budgetHeadId}")
    public ResponseEntity<List<OperationalExpenditureResponse>>
    getByBudgetHeadId(@PathVariable Long budgetHeadId) {

        return ResponseEntity.ok(
                expenditureService.getByBudgetHeadId(budgetHeadId)
        );
    }

    // Get Expenditures By Status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<OperationalExpenditureResponse>>
    getByStatus(@PathVariable String status) {

        return ResponseEntity.ok(
                expenditureService.getByStatus(status)
        );
    }

    // Update Expenditure with optional new attachment
    @PutMapping(
        value = "/{id}",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<OperationalExpenditureResponse>
    updateExpenditure(
            @PathVariable Long id,
            @RequestPart("data") OperationalExpenditureRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {

        String fileName = fileStorageService.storeFile(file);

        try {
            return ResponseEntity.ok(
                    expenditureService.updateExpenditure(
                            id,
                            request,
                            fileName
                    )
            );
        } catch (RuntimeException e) {
            fileStorageService.deleteFile(fileName);
            throw e;
        }
    }

    // Submit For Approval
    @PatchMapping("/{id}/submit")
    public ResponseEntity<OperationalExpenditureResponse>
    submitForApproval(@PathVariable Long id) {

        return ResponseEntity.ok(
                expenditureService.submitForApproval(id)
        );
    }

    // Approve Expenditure
    @PatchMapping("/{id}/approve")
    public ResponseEntity<OperationalExpenditureResponse>
    approveExpenditure(@PathVariable Long id) {

        return ResponseEntity.ok(
                expenditureService.approveExpenditure(id)
        );
    }

    // Reject Expenditure
    @PatchMapping("/{id}/reject")
    public ResponseEntity<OperationalExpenditureResponse>
    rejectExpenditure(
            @PathVariable Long id,
            @RequestParam(required = false) String remarks
    ) {

        return ResponseEntity.ok(
                expenditureService.rejectExpenditure(id, remarks)
        );
    }

    // Download Attachment
    @GetMapping("/{id}/attachment")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id
    ) {

        OperationalExpenditureResponse expenditure =
                expenditureService.getExpenditureById(id);

        String fileName = expenditure.getAttachmentPath();

        if (fileName == null || fileName.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = fileStorageService.loadFile(fileName);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\""
                )
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
