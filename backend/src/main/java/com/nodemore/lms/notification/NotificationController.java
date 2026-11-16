package com.nodemore.lms.notification;

import com.fasterxml.jackson.core.type.TypeReference;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.Json;
import com.nodemore.lms.common.PageResponse;
import com.nodemore.lms.common.Pages;
import com.nodemore.lms.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository repo;

    public record NotificationDto(UUID id, String type, Map<String, Object> params, String link, boolean read, Instant createdAt) {}

    @GetMapping
    public PageResponse<NotificationDto> list(@RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        UUID me = CurrentUser.get().id();
        return PageResponse.of(repo.findByUserId(me, Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                n -> new NotificationDto(n.getId(), n.getType(),
                        Json.read(n.getParamsJson(), new TypeReference<Map<String, Object>>() {}),
                        n.getLink(), n.getReadAt() != null, n.getCreatedAt()));
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unread() {
        return Map.of("count", repo.countByUserIdAndReadAtIsNull(CurrentUser.get().id()));
    }

    @PostMapping("/{id}/read")
    @Transactional
    public Map<String, Object> read(@PathVariable UUID id) {
        Notification n = repo.findByIdAndUserId(id, CurrentUser.get().id()).orElseThrow(ApiException::notFound);
        if (n.getReadAt() == null) n.setReadAt(Instant.now());
        return Map.of("ok", true);
    }

    @PostMapping("/read-all")
    @Transactional
    public Map<String, Object> readAll() {
        repo.markAllRead(CurrentUser.get().id(), Instant.now());
        return Map.of("ok", true);
    }
}
