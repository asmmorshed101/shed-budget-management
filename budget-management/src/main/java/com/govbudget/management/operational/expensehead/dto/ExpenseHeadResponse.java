
package com.govbudget.management.operational.expensehead.dto;

import java.time.OffsetDateTime;

public class ExpenseHeadResponse {

    private Long id;
    private String code;
    private String name;
    private String nameBn;
    private Boolean active;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public ExpenseHeadResponse(
            Long id,
            String code,
            String name,
            String nameBn,
            Boolean active,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {

        this.id = id;
        this.code = code;
        this.name = name;
        this.nameBn = nameBn;
        this.active = active;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getNameBn() {
        return nameBn;
    }

    public Boolean getActive() {
        return active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
