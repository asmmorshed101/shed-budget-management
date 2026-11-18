

package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.dto.OfficeAllocationRequest;
import com.govbudget.management.ministrybudget.service.OfficeBudgetAllocationService;
import com.govbudget.management.ministrybudget.repository.OfficeBudgetAllocationRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class OfficeBudgetAllocationController {

    private final OfficeBudgetAllocationService service;
    private final OfficeBudgetAllocationRepository repository;

    public OfficeBudgetAllocationController(
            OfficeBudgetAllocationService service,
            OfficeBudgetAllocationRepository repository) {
        this.service = service;
        this.repository = repository;
    }

    @GetMapping("/office-allocations/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ResponseEntity.ok(repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Office allocation not found")));
    }

    @PostMapping("/budget-sources/{sourceId}/offices")
    public ResponseEntity<?> create(
            @PathVariable Long sourceId,
            @RequestBody OfficeAllocationRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(sourceId, request));
    }

    @GetMapping("/budget-sources/{sourceId}/offices")
    public ResponseEntity<?> getBySource(
            @PathVariable Long sourceId) {

        return ResponseEntity.ok(service.getBySource(sourceId));
    }

    @PutMapping("/office-allocations/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody OfficeAllocationRequest request) {

        return ResponseEntity.ok(service.update(id, request));
    }
}


// package com.govbudget.management.ministrybudget.controller;

// import com.govbudget.management.ministrybudget.dto.OfficeAllocationRequest;
// import com.govbudget.management.ministrybudget.service.OfficeBudgetAllocationService;

// import org.springframework.http.HttpStatus;
// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.*;

// @RestController
// public class OfficeBudgetAllocationController {

//     private final OfficeBudgetAllocationService service;

//     public OfficeBudgetAllocationController(
//             OfficeBudgetAllocationService service) {
//         this.service = service;
//     }

//     @PostMapping("/api/v1/budget-sources/{sourceId}/offices")
//     public ResponseEntity<?> create(
//             @PathVariable Long sourceId,
//             @RequestBody OfficeAllocationRequest request) {
//         return ResponseEntity.status(HttpStatus.CREATED)
//                 .body(service.create(sourceId, request));
//     }

//     @GetMapping("/api/v1/budget-sources/{sourceId}/offices")
//     public ResponseEntity<?> getBySource(@PathVariable Long sourceId) {
//         return ResponseEntity.ok(service.getBySource(sourceId));
//     }

//     @PutMapping("/api/v1/office-allocations/{id}")
//     public ResponseEntity<?> update(
//             @PathVariable Long id,
//             @RequestBody OfficeAllocationRequest request) {
//         return ResponseEntity.ok(service.update(id, request));
//     }
// }
