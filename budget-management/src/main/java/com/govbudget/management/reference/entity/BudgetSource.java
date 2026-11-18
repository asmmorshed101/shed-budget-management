
package com.govbudget.management.reference.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "budget_sources")
@Getter
@Setter
public class BudgetSource {

    @Id
    private Short id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_bn", nullable = false)
    private String nameBn;

    @Column(name = "is_active")
    private Boolean active;
}
