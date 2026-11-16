package com.nodemore.lms.payment;

import com.nodemore.lms.common.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService service;

    public record RefundRequest(String note) {}

    @GetMapping("/api/payments/bank-details")
    public Map<String, Object> bankDetails(@RequestParam(required = false) UUID classId) { return service.bankDetails(classId); }

    @PostMapping("/api/student/classes/{classId}/checkout")
    public Map<String, Object> checkout(@PathVariable UUID classId, @Valid @RequestBody PaymentService.ClassCheckoutRequest req) {
        return service.classCheckout(classId, req);
    }

    @GetMapping("/api/student/payments")
    public PageResponse<PaymentService.PaymentDto> mine(@RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "20") int size) {
        return service.studentList(page, size);
    }

    @GetMapping("/api/payments/order/{orderId}")
    public PaymentService.PaymentDto byOrder(@PathVariable String orderId) { return service.byOrder(orderId); }

    @GetMapping("/api/payments/{id}/slip")
    public Map<String, Object> slip(@PathVariable UUID id) { return service.slipUrl(id); }

    @GetMapping("/api/teacher/payments")
    public PageResponse<PaymentService.PaymentDto> teacherList(@RequestParam(required = false) UUID classId,
                                                               @RequestParam(required = false) PaymentEnums.Status status,
                                                               @RequestParam(defaultValue = "0") int page,
                                                               @RequestParam(defaultValue = "20") int size) {
        return service.teacherList(classId, status, page, size);
    }

    @PostMapping("/api/teacher/payments/{id}/decision")
    public PaymentService.PaymentDto decide(@PathVariable UUID id, @Valid @RequestBody PaymentService.DecisionRequest req) {
        return service.decide(id, req);
    }

    @PostMapping("/api/teacher/payments/{id}/refund")
    public PaymentService.PaymentDto refund(@PathVariable UUID id, @RequestBody RefundRequest req) {
        return service.refund(id, req.note());
    }

    @PostMapping("/api/teacher/classes/{classId}/payments/cash")
    public PaymentService.PaymentDto cash(@PathVariable UUID classId, @Valid @RequestBody PaymentService.CashRequest req) {
        return service.recordCash(classId, req);
    }

}
