package com.nodemore.lms.plan;

import java.math.BigDecimal;
import java.util.UUID;

public record PlanDto(UUID id, String code, String name, BigDecimal priceMonthly, String currency, int maxClasses,
                      int maxStudents, long storageMb, boolean advancedAnalytics, boolean customBranding,
                      boolean prioritySupport, boolean active) {
    public static PlanDto of(Plan p) {
        return new PlanDto(p.getId(), p.getCode(), p.getName(), p.getPriceMonthly(), p.getCurrency(), p.getMaxClasses(),
                p.getMaxStudents(), p.getStorageMb(), p.isAdvancedAnalytics(), p.isCustomBranding(),
                p.isPrioritySupport(), p.isActive());
    }
}
