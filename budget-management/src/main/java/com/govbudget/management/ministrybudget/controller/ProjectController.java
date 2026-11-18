
package com.govbudget.management.ministrybudget.controller;

import com.govbudget.management.ministrybudget.dto.ProjectRequest;
import com.govbudget.management.ministrybudget.service.ProjectService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class ProjectController {

    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/office-allocations/{allocationId}/projects")
    public ResponseEntity<?> create(
            @PathVariable Long allocationId,
            @RequestBody ProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(allocationId, request));
    }

    @GetMapping("/api/v1/office-allocations/{allocationId}/projects")
    public ResponseEntity<?> getProjects(@PathVariable Long allocationId) {
        return ResponseEntity.ok(service.getByOfficeAllocation(allocationId));
    }

    @GetMapping("/api/v1/projects/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PutMapping("/api/v1/projects/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }
}
