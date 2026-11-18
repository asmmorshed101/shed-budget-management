package com.govbudget.management.audit.repository;

import com.govbudget.management.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    @Query("""
        select a from AuditLog a where :search = ''
        or lower(a.actorEmail) like lower(concat('%', :search, '%'))
        or lower(a.action) like lower(concat('%', :search, '%'))
        or lower(a.entityType) like lower(concat('%', :search, '%'))
        or lower(a.entityId) like lower(concat('%', :search, '%'))
        or lower(a.summary) like lower(concat('%', :search, '%'))
        or lower(a.endpoint) like lower(concat('%', :search, '%'))
        or lower(a.ipAddress) like lower(concat('%', :search, '%'))
        or lower(a.userAgent) like lower(concat('%', :search, '%'))
        """)
    Page<AuditLog> search(@Param("search") String search, Pageable pageable);
}
