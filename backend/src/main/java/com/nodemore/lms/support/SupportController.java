package com.nodemore.lms.support;

import com.nodemore.lms.audit.AuditService;
import com.nodemore.lms.classroom.ClassMapper;
import com.nodemore.lms.common.ApiException;
import com.nodemore.lms.common.PageResponse;
import com.nodemore.lms.common.Pages;
import com.nodemore.lms.notification.NotificationService;
import com.nodemore.lms.security.CurrentUser;
import com.nodemore.lms.user.User;
import com.nodemore.lms.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class SupportController {

    private final SupportTicketRepository repo;
    private final UserRepository users;
    private final NotificationService notifications;
    private final AuditService audit;

    public record TicketRequest(@NotBlank @Pattern(regexp = "GENERAL|TECHNICAL|PAYMENT|ACCOUNT|COMPLAINT") String category,
                                @NotBlank @Size(max = 200) String subject, @NotBlank @Size(max = 5000) String message) {}

    public record ReplyRequest(@Size(max = 5000) String reply, @NotNull SupportTicket.Status status) {}

    public record TicketDto(UUID id, UUID userId, String userName, String userEmail, String category, String subject,
                            String message, SupportTicket.Status status, String adminReply, Instant repliedAt, Instant createdAt) {}

    @PostMapping("/api/support/tickets")
    @Transactional
    public TicketDto create(@Valid @RequestBody TicketRequest req) {
        SupportTicket t = new SupportTicket();
        t.setUserId(CurrentUser.get().id());
        t.setCategory(req.category());
        t.setSubject(req.subject().trim());
        t.setMessage(req.message().trim());
        t.setStatus(SupportTicket.Status.OPEN);
        repo.save(t);
        return dto(t, null);
    }

    @GetMapping("/api/support/tickets")
    public List<TicketDto> mine() {
        return repo.findByUserIdOrderByCreatedAtDesc(CurrentUser.get().id()).stream().map(t -> dto(t, null)).toList();
    }

    @GetMapping("/api/admin/support/tickets")
    @Transactional(readOnly = true)
    public PageResponse<TicketDto> all(@RequestParam(required = false) SupportTicket.Status status,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        Page<SupportTicket> p = repo.search(status, Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        Map<UUID, User> us = ClassMapper.index(users.findAllById(p.getContent().stream().map(SupportTicket::getUserId).toList()), User::getId);
        return new PageResponse<>(p.getContent().stream().map(t -> dto(t, us.get(t.getUserId()))).toList(),
                p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @PostMapping("/api/admin/support/tickets/{id}/reply")
    @Transactional
    public TicketDto reply(@PathVariable UUID id, @Valid @RequestBody ReplyRequest req) {
        SupportTicket t = repo.findById(id).orElseThrow(ApiException::notFound);
        if (req.reply() != null && !req.reply().isBlank()) {
            t.setAdminReply(req.reply().trim());
            t.setRepliedAt(Instant.now());
            notifications.notify(t.getUserId(), "TICKET_REPLIED", Map.of("subject", t.getSubject()), "/support", true);
        }
        t.setStatus(req.status());
        audit.log("TICKET_UPDATED", "SupportTicket", id.toString(), req.status().name());
        return dto(t, users.findById(t.getUserId()).orElse(null));
    }

    private static TicketDto dto(SupportTicket t, User u) {
        return new TicketDto(t.getId(), t.getUserId(), u == null ? null : u.getFullName(), u == null ? null : u.getEmail(),
                t.getCategory(), t.getSubject(), t.getMessage(), t.getStatus(), t.getAdminReply(), t.getRepliedAt(), t.getCreatedAt());
    }
}
