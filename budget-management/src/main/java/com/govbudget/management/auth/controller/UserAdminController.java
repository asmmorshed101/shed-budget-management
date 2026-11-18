package com.govbudget.management.auth.controller;

import com.govbudget.management.auth.entity.AppUser;
import com.govbudget.management.auth.repository.AppUserRepository;
import com.govbudget.management.ministrybudget.repository.ProjectRepository;
import com.govbudget.management.ministrybudget.repository.OfficeBudgetAllocationRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/auth/users")
public class UserAdminController {
    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final ProjectRepository projects;
    private final OfficeBudgetAllocationRepository offices;
    public UserAdminController(AppUserRepository users, PasswordEncoder encoder, ProjectRepository projects, OfficeBudgetAllocationRepository offices) {
        this.users = users; this.encoder = encoder; this.projects = projects; this.offices = offices;
    }

    @GetMapping
    public List<AuthController.UserResponse> list() {
        return users.findAll().stream().map(u -> new AuthController.UserResponse(u.getId(), u.getEmail(), u.getRole(), u.isMustChangePassword(), u.getAssignedProjectId(), u.getAssignedOfficeAllocationId())).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AuthController.UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        String role = request.role().toUpperCase(Locale.ROOT);
        if (!List.of("SUPER_ADMIN", "ADMIN", "USER").contains(role)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid role");
        if (users.existsByEmailIgnoreCase(request.email())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        if (role.equals("ADMIN") && request.assignedProjectId() == null && request.assignedOfficeAllocationId() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assign an office or project to an admin");
        if (request.assignedProjectId() != null && !projects.existsById(request.assignedProjectId()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned project does not exist");
        if (request.assignedOfficeAllocationId() != null && !offices.existsById(request.assignedOfficeAllocationId()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned office allocation does not exist");
        var user = new AppUser(); user.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        user.setPasswordHash(encoder.encode(request.password())); user.setRole(role); user.setMustChangePassword(true);
        user.setAssignedProjectId(request.assignedProjectId()); user.setAssignedOfficeAllocationId(request.assignedOfficeAllocationId());
        var saved = users.save(user);
        return new AuthController.UserResponse(saved.getId(), saved.getEmail(), saved.getRole(), saved.isMustChangePassword(), saved.getAssignedProjectId(), saved.getAssignedOfficeAllocationId());
    }

    public record CreateUserRequest(@Email @NotBlank String email, @NotBlank @Size(min=10, max=128) String password,
                                    @NotBlank String role, Long assignedProjectId, Long assignedOfficeAllocationId) {}
}
