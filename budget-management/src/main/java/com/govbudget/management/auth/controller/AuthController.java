package com.govbudget.management.auth.controller;

import com.govbudget.management.auth.entity.AppUser;
import com.govbudget.management.auth.repository.AppUserRepository;
import com.govbudget.management.ministrybudget.entity.Project;
import com.govbudget.management.ministrybudget.entity.ProjectExpenditureHistory;
import com.govbudget.management.ministrybudget.repository.ProjectExpenditureHistoryRepository;
import com.govbudget.management.ministrybudget.repository.ProjectRepository;
import com.govbudget.management.operational.expensehead.repository.ExpenseHeadRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Locale;
import java.util.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AppUserRepository users;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final ProjectRepository projects;
    private final ProjectExpenditureHistoryRepository projectHistory;
    private final ExpenseHeadRepository expenseHeads;

    public AuthController(AppUserRepository users, AuthenticationManager authenticationManager, PasswordEncoder passwordEncoder,
                          ProjectRepository projects, ProjectExpenditureHistoryRepository projectHistory, ExpenseHeadRepository expenseHeads) {
        this.users = users; this.authenticationManager = authenticationManager; this.passwordEncoder = passwordEncoder;
        this.projects = projects; this.projectHistory = projectHistory; this.expenseHeads = expenseHeads;
    }

    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(Locale.ROOT), request.password()));
        if (servletRequest.getSession(false) != null) servletRequest.changeSessionId();
        var context = SecurityContextHolder.createEmptyContext(); context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        new HttpSessionSecurityContextRepository().saveContext(context, servletRequest, servletResponse);
        return current(authentication.getName());
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) { return current(authentication.getName()); }

    @GetMapping("/my-project-dashboard")
    public AssignedProjectDashboard myProjectDashboard(Authentication authentication) {
        var user = users.findByEmailIgnoreCase(authentication.getName()).orElseThrow();
        if (!"ADMIN".equals(user.getRole()) || user.getAssignedProjectId() == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No project is assigned to this account");
        Project project = projects.findById(user.getAssignedProjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assigned project not found"));

        List<ProjectExpenditureHistory> history = projectHistory.findByProjectIdOrderByReportDateDescIdDesc(project.getId());
        var headsById = new HashMap<Long, com.govbudget.management.operational.expensehead.entity.ExpenseHead>();
        expenseHeads.findAll().forEach(head -> headsById.put(head.getId(), head));
        var latestByHead = new LinkedHashMap<Long, ProjectExpenditureHistory>();
        history.forEach(row -> latestByHead.putIfAbsent(row.getExpenseHeadId(), row));

        List<BudgetHeadSummary> budgetHeads = latestByHead.entrySet().stream().map(entry -> {
            var head = entry.getKey() == null ? null : headsById.get(entry.getKey());
            return new BudgetHeadSummary(entry.getKey(), head == null ? (entry.getKey() == null ? "Legacy entries" : "Unknown budget head") : head.getCode(),
                    head == null ? "" : (head.getNameBn() == null || head.getNameBn().isBlank() ? head.getName() : head.getNameBn()),
                    entry.getValue().getCumulativeAmount(), entry.getValue().getReportDate());
        }).toList();
        BigDecimal totalSpent = budgetHeads.stream().map(BudgetHeadSummary::spent).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remaining = project.getAllocatedAmount().subtract(totalSpent).max(BigDecimal.ZERO);
        return new AssignedProjectDashboard(project, totalSpent, remaining, budgetHeads, history.stream().limit(10).toList());
    }

    @PostMapping("/password")
    public UserResponse changePassword(@Valid @RequestBody PasswordRequest request, Authentication authentication) {
        var user = users.findByEmailIgnoreCase(authentication.getName()).orElseThrow();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        users.save(user);
        return response(user);
    }

    private UserResponse current(String email) { return response(users.findByEmailIgnoreCase(email).orElseThrow()); }
    private static UserResponse response(AppUser u) {
        return new UserResponse(u.getId(), u.getEmail(), u.getRole(), u.isMustChangePassword(), u.getAssignedProjectId(), u.getAssignedOfficeAllocationId());
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record PasswordRequest(@NotBlank String currentPassword, @NotBlank @Size(min=10, max=128) String newPassword) {}
    public record UserResponse(Long id, String email, String role, boolean mustChangePassword, Long assignedProjectId, Long assignedOfficeAllocationId) {}
    public record AssignedProjectDashboard(Project project, BigDecimal totalSpent, BigDecimal remaining,
                                           List<BudgetHeadSummary> budgetHeads, List<ProjectExpenditureHistory> recentEntries) {}
    public record BudgetHeadSummary(Long expenseHeadId, String code, String name, BigDecimal spent, java.time.LocalDate lastReported) {}
}
