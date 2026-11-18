
package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.dto.MinistryBudgetRequest;
import com.govbudget.management.ministrybudget.service.MinistryBudgetService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ministry-budgets")
public class MinistryBudgetController {

    private final MinistryBudgetService service;

    public MinistryBudgetController(MinistryBudgetService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody MinistryBudgetRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(request));
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/by-year")
    public ResponseEntity<?> getByYear(
            @RequestParam Long fiscalYearId,
            @RequestParam UUID organizationId) {

        return ResponseEntity.ok(
                service.getByFiscalYearAndOrganization(
                        fiscalYearId, organizationId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody MinistryBudgetRequest request) {

        return ResponseEntity.ok(service.update(id, request));
    }
@GetMapping("/by-fiscal-year")
public ResponseEntity<?> getByFiscalYear(
        @RequestParam Long fiscalYearId,
        @RequestParam UUID organizationId) {

    return ResponseEntity.ok(
            service.getByFiscalYearAndOrganization(
                    fiscalYearId, organizationId));
}
}





// package com.govbudget.management.ministrybudget.controller;

// import com.govbudget.management.ministrybudget.dto.MinistryBudgetRequest;
// import com.govbudget.management.ministrybudget.service.MinistryBudgetService;

// import org.springframework.http.HttpStatus;
// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.*;

// import java.util.UUID;

// @RestController
// @RequestMapping("/api/v1/ministry-budgets")
// public class MinistryBudgetController {

//     private final MinistryBudgetService service;

//     public MinistryBudgetController(MinistryBudgetService service) {
//         this.service = service;
//     }

//     @PostMapping
//     public ResponseEntity<?> create(@RequestBody MinistryBudgetRequest request) {
//         return ResponseEntity.status(HttpStatus.CREATED)
//                 .body(service.create(request));
//     }

//     @GetMapping
//     public ResponseEntity<?> getAll() {
//         return ResponseEntity.ok(service.getAll());
//     }

//     @GetMapping("/by-year")
//     public ResponseEntity<?> getByYear(
//             @RequestParam Long fiscalYearId,
//             @RequestParam UUID organizationId) {
//         return ResponseEntity.ok(
//                 service.getByFiscalYearAndOrganization(
//                         fiscalYearId, organizationId));
//     }

//     // @PutMapping("/{id}")
//     // public ResponseEntity<?> update(
//     //         @PathVariable Long id,
//     //         @RequestBody MinistryBudgetRequest request) {
//     //     return ResponseEntity.ok(service.update(id, request));
//     // }

// @GetMapping("/by-fiscal-year")
// public ResponseEntity<?> getByFiscalYear(
//         @RequestParam Long fiscalYearId,
//         @RequestParam UUID organizationId) {

//     return ResponseEntity.ok(
//             service.getByFiscalYear(
//                     fiscalYearId, organizationId));
// }

// @GetMapping("/{id}")
// public ResponseEntity<?> getById(@PathVariable Long id) {
//     return ResponseEntity.ok(service.getById(id));
// }

// @PutMapping("/{id}")
// public ResponseEntity<?> update(
//         @PathVariable Long id,
//         @RequestBody MinistryBudgetRequest request) {

//     return ResponseEntity.ok(
//             service.update(id, request));
// }

// }
