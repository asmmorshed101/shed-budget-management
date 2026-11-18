package com.govbudget.management.audit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "actor_email", nullable = false, length = 320)
    private String actorEmail;

    @Column(nullable = false, length = 20)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType;

    @Column(name = "entity_id", length = 100)
    private String entityId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "request_method", nullable = false, length = 10)
    private String requestMethod;

    @Column(nullable = false, length = 500)
    private String endpoint;

    @Column(name = "ip_address", length = 200)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = OffsetDateTime.now(); }
}
