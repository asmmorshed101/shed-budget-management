package com.govbudget.management.auth.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "app_users")
@Getter @Setter
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 320)
    private String email;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(nullable = false, length = 30)
    private String role;
    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = true;
    @Column(name = "assigned_project_id")
    private Long assignedProjectId;
    @Column(name = "assigned_office_allocation_id")
    private Long assignedOfficeAllocationId;
    @Column(nullable = false)
    private boolean enabled = true;
}
