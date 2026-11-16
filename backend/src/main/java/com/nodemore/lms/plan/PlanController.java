package com.nodemore.lms.plan;

import com.nodemore.lms.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PlanController {

    private final PlanRepository plans;
    private final SubscriptionService subscriptions;

    @GetMapping("/api/public/plans")
    public List<PlanDto> publicPlans() {
        return plans.findByActiveTrueOrderBySortOrderAsc().stream().map(PlanDto::of).toList();
    }

    @GetMapping("/api/teacher/subscription")
    public Map<String, Object> mySubscription() {
        return subscriptions.summary(CurrentUser.get().id());
    }
}
