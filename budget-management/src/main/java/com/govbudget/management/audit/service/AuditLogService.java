package com.govbudget.management.audit.service;

import com.govbudget.management.audit.entity.AuditLog;
import com.govbudget.management.audit.repository.AuditLogRepository;
import com.govbudget.management.auth.repository.AppUserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AuditLogService {
    private static final Pattern ID = Pattern.compile("\\d+");
    private static final Pattern JSON_FIELD = Pattern.compile("\"([^\"]+)\"\\s*:");
    private static final Pattern JSON_ID = Pattern.compile("\"id\"\\s*:\\s*\"?(\\d+)");
    private static final Set<String> SENSITIVE_KEYS = Set.of("password", "passwordhash", "token", "secret", "authorization");
    private final AuditLogRepository logs;
    private final AppUserRepository users;

    public AuditLogService(AuditLogRepository logs, AppUserRepository users) {
        this.logs = logs;
        this.users = users;
    }

    @Transactional
    public void record(HttpServletRequest request, int status, byte[] requestBody, byte[] responseBody) {
        String email = Optional.ofNullable(org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication()).map(a -> a.getName()).orElse("unknown");
        var actor = users.findByEmailIgnoreCase(email).orElse(null);
        String method = request.getMethod().toUpperCase(Locale.ROOT);
        String path = request.getRequestURI();
        String action = switch (method) {
            case "POST" -> "CREATE";
            case "PUT", "PATCH" -> "UPDATE";
            case "DELETE" -> "DELETE";
            default -> method;
        };
        String entityType = entityType(path);
        String entityId = method.equals("POST") ? responseId(responseBody) : pathId(path);
        if (entityId == null) entityId = pathId(path);
        List<String> fields = changedFields(requestBody);
        String summary = action.substring(0, 1) + action.substring(1).toLowerCase(Locale.ROOT)
                + " " + entityType + (entityId == null ? "" : " #" + entityId)
                + (fields.isEmpty() ? "" : " — submitted fields: " + String.join(", ", fields));

        AuditLog log = new AuditLog();
        log.setActorUserId(actor == null ? null : actor.getId());
        log.setActorEmail(email);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setSummary(summary);
        log.setRequestMethod(method);
        log.setEndpoint(path);
        log.setIpAddress(limit(request.getRemoteAddr(), 200));
        log.setUserAgent(limit(request.getHeader("User-Agent"), 500));
        logs.save(log);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> recent(String search, Pageable pageable) {
        return logs.search(search == null ? "" : search.trim(), pageable);
    }

    private List<String> changedFields(byte[] body) {
        if (body == null || body.length == 0) return List.of();
        String json = new String(body, StandardCharsets.UTF_8);
        Matcher matcher = JSON_FIELD.matcher(json);
        Set<String> names = new LinkedHashSet<>();
        while (matcher.find()) {
            String key = matcher.group(1);
            String normalized = key.replaceAll("[^A-Za-z]", "").toLowerCase(Locale.ROOT);
            if (!SENSITIVE_KEYS.contains(normalized)
                    && !normalized.contains("password")
                    && !normalized.contains("token")
                    && !normalized.contains("secret")) names.add(key);
        }
        return names.stream().limit(12).map(AuditLogService::humanize).toList();
    }

    private String responseId(byte[] body) {
        if (body == null || body.length == 0) return null;
        Matcher matcher = JSON_ID.matcher(new String(body, StandardCharsets.UTF_8));
        return matcher.find() ? matcher.group(1) : null;
    }

    private static String pathId(String path) {
        for (String segment : path.split("/")) if (ID.matcher(segment).matches()) return segment;
        return null;
    }

    private static String entityType(String path) {
        String[] segments = path.split("/");
        for (String segment : segments) {
            if (segment.isBlank() || segment.equals("api") || segment.equals("v1")) continue;
            return switch (segment) {
                case "office-allocations" -> "Office allocation";
                case "projects" -> "Project / expenditure";
                case "expense-heads" -> "Budget head";
                case "budget-sources" -> "Budget source / office allocation";
                case "budget-categories" -> "Budget category / source";
                case "ministry-budgets" -> "Ministry budget";
                case "organizations" -> "Office";
                case "fiscal-years" -> "Fiscal year";
                case "auth" -> "User account";
                default -> humanize(segment);
            };
        }
        return "Record";
    }

    private static String humanize(String value) {
        return Arrays.stream(value.replaceAll("([a-z0-9])([A-Z])", "$1 $2").replace('-', ' ').split("\\s+"))
                .filter(part -> !part.isBlank())
                .map(part -> part.substring(0, 1).toUpperCase(Locale.ROOT) + part.substring(1))
                .collect(Collectors.joining(" "));
    }

    private static String limit(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
