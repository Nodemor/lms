package com.nodemore.lms.payment;

public final class PaymentEnums {
    private PaymentEnums() {}
    public enum Type { CLASS_FEE, SUBSCRIPTION }
    public enum Method { PAYHERE, BANK_TRANSFER, CASH }
    public enum Status { PENDING, PAID, FAILED, CANCELLED, REFUNDED }
}
