CREATE TABLE app_users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_project_id BIGINT REFERENCES projects(id),
    assigned_office_allocation_id BIGINT REFERENCES office_budget_allocations(id),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT app_users_admin_assignment CHECK (
        role <> 'ADMIN' OR assigned_project_id IS NOT NULL OR assigned_office_allocation_id IS NOT NULL
    )
);
