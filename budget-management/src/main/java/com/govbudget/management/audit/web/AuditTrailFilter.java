package com.govbudget.management.audit.web;

import com.govbudget.management.audit.service.AuditLogService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;
import java.io.IOException;
import java.util.Set;

public class AuditTrailFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(AuditTrailFilter.class);
    private static final Set<String> MUTATING = Set.of("POST", "PUT", "PATCH", "DELETE");
    private final AuditLogService auditLogService;

    public AuditTrailFilter(AuditLogService auditLogService) { this.auditLogService = auditLogService; }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !MUTATING.contains(request.getMethod().toUpperCase())
                || !path.startsWith(request.getContextPath() + "/api/v1/")
                || path.matches(".*/auth/(login|logout|password)$");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(request, 16 * 1024);
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);
        try {
            chain.doFilter(wrappedRequest, wrappedResponse);
            int status = wrappedResponse.getStatus();
            if (status >= 200 && status < 400) {
                try {
                    auditLogService.record(wrappedRequest, status, wrappedRequest.getContentAsByteArray(), wrappedResponse.getContentAsByteArray());
                } catch (Exception exception) {
                    logger.error("Could not persist audit event for {} {}", request.getMethod(), request.getRequestURI(), exception);
                }
            }
        } finally {
            wrappedResponse.copyBodyToResponse();
        }
    }
}
