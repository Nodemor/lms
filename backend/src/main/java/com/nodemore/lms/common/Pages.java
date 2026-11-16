package com.nodemore.lms.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class Pages {
    private Pages() {}

    public static Pageable of(int page, int size, Sort sort) {
        int p = Math.max(page, 0);
        int s = Math.min(Math.max(size, 1), 100);
        return PageRequest.of(p, s, sort);
    }
}
