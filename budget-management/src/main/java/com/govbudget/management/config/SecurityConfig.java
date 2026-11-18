package com.govbudget.management.config;

import com.govbudget.management.auth.repository.AppUserRepository;
import com.govbudget.management.audit.service.AuditLogService;
import com.govbudget.management.audit.web.AuditTrailFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
// import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
    @Bean CorsConfigurationSource corsConfigurationSource() {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5172"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, AppUserRepository users, AuditLogService auditLogs) throws Exception {
        http.cors(cors -> {}).csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/login").permitAll()
                .requestMatchers("/api/v1/audit-logs/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/v1/auth/users/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/v1/auth/**").authenticated()
                .anyRequest().access((authentication, context) -> {
                    var a = authentication.get();
                    var request = context.getRequest();
                    if (a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_SUPER_ADMIN")))
                        return new org.springframework.security.authorization.AuthorizationDecision(true);
                    if (a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_USER")))
                        return new org.springframework.security.authorization.AuthorizationDecision(
                            "GET".equals(request.getMethod()) && isReportRead(request));
                    if (a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_ADMIN")))
                        return new org.springframework.security.authorization.AuthorizationDecision(
                            isAssignedAdminRead(request, a.getName(), users) || isAssignedInput(request, a.getName(), users));
                    return new org.springframework.security.authorization.AuthorizationDecision(false);
                })
            )
            .httpBasic(basic -> basic.disable()).formLogin(form -> form.disable())
            .logout(logout -> logout.logoutUrl("/api/v1/auth/logout").logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
            .securityContext(context -> context.securityContextRepository(new HttpSessionSecurityContextRepository()))
            .addFilterAfter(new AuditTrailFilter(auditLogs), AuthorizationFilter.class);
        return http.build();
    }

    private static boolean isReportRead(HttpServletRequest request) {
        var path = request.getRequestURI();
        return path.startsWith("/api/v1/reports/") || path.startsWith("/api/v1/development-budget-summary")
            || path.startsWith("/api/v1/dashboard/")
            || path.matches("/api/v1/(fiscal-years|organizations/hierarchy|budget-sources/[0-9]+/offices|budget-categories/[0-9]+/sources|office-allocations/[0-9]+/projects|projects/[0-9]+/expenditures|office-allocations/[0-9]+/expenditures|ministry-budgets/by-fiscal-year|ministry-budgets/[0-9]+/categories)");
    }

    private static boolean isAssignedInput(HttpServletRequest request, String email, AppUserRepository users) {
        var path = request.getRequestURI();
        var user = users.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) return false;
        if ("POST".equals(request.getMethod()) && path.matches("/api/v1/projects/[0-9]+/expenditures"))
            return user.getAssignedProjectId() != null && path.split("/")[4].equals(user.getAssignedProjectId().toString());
        if ("POST".equals(request.getMethod()) && path.matches("/api/v1/office-allocations/[0-9]+/expenditures"))
            return user.getAssignedOfficeAllocationId() != null && path.split("/")[4].equals(user.getAssignedOfficeAllocationId().toString());
        if ("PUT".equals(request.getMethod()) && path.matches("/api/v1/projects/[0-9]+/head-budgets"))
            return user.getAssignedProjectId() != null && path.split("/")[4].equals(user.getAssignedProjectId().toString());
        if ("PUT".equals(request.getMethod()) && path.matches("/api/v1/office-allocations/[0-9]+/head-budgets"))
            return user.getAssignedOfficeAllocationId() != null && path.split("/")[4].equals(user.getAssignedOfficeAllocationId().toString());
        return false;
    }

    private static boolean isAssignedAdminRead(HttpServletRequest request, String email, AppUserRepository users) {
        if (!"GET".equals(request.getMethod())) return false;
        var user = users.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) return false;
        var path = request.getRequestURI();
        if ("/api/v1/expense-heads".equals(path) || "/api/v1/expense-heads/active".equals(path)) return true;
        if (user.getAssignedProjectId() != null) {
            var id = user.getAssignedProjectId().toString();
            if (path.equals("/api/v1/projects/" + id) || path.equals("/api/v1/projects/" + id + "/expenditures")
                    || path.equals("/api/v1/projects/" + id + "/head-budgets")) return true;
        }
        if (user.getAssignedOfficeAllocationId() != null) {
            var id = user.getAssignedOfficeAllocationId().toString();
            if (path.equals("/api/v1/office-allocations/" + id) || path.equals("/api/v1/office-allocations/" + id + "/expenditures")
                    || path.equals("/api/v1/office-allocations/" + id + "/head-budgets")) return true;
        }
        return false;
    }
}
