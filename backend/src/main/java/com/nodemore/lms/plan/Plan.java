package com.nodemore.lms.plan;

import com.nodemore.lms.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "plans")
public class Plan extends BaseEntity {
    @Column(nullable = false, unique = true)
    private String code;
    @Column(nullable = false)
    private String name;
    @Column(name = "price_monthly", nullable = false)
    private BigDecimal priceMonthly;
    @Column(nullable = false)
    private String currency;
    @Column(name = "max_classes", nullable = false)
    private int maxClasses;
    @Column(name = "max_students", nullable = false)
    private int maxStudents;
    @Column(name = "storage_mb", nullable = false)
    private long storageMb;
    @Column(name = "advanced_analytics", nullable = false)
    private boolean advancedAnalytics;
    @Column(name = "custom_branding", nullable = false)
    private boolean customBranding;
    @Column(name = "priority_support", nullable = false)
    private boolean prioritySupport;
    @Column(nullable = false)
    private boolean active;
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
