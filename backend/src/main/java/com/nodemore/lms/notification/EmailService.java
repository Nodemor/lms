package com.nodemore.lms.notification;

import com.nodemore.lms.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

/**
 * Sends e-mails in the recipient's language using email.&lt;TYPE&gt;.subject / .body keys from
 * messages_{en,si,ta}.properties. Placeholders use {{name}} syntax.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final MessageSource messages;
    private final AppProperties props;

    @Async
    public void sendTemplate(String to, String language, String type, Map<String, ?> params) {
        Locale locale = Locale.forLanguageTag(language == null ? "en" : language);
        String subject;
        String body;
        try {
            subject = fill(messages.getMessage("email." + type + ".subject", null, locale), params);
            body = fill(messages.getMessage("email." + type + ".body", null, locale), params);
        } catch (NoSuchMessageException e) {
            log.debug("No e-mail template for {}", type);
            return;
        }
        String footer = messages.getMessage("email.footer", null, "NodeMor Academy", locale);
        send(to, subject, body, layout(subject, body, footer));
    }

    private static String fill(String template, Map<String, ?> params) {
        String out = template;
        if (params != null) {
            for (var e : params.entrySet()) {
                out = out.replace("{{" + e.getKey() + "}}", String.valueOf(e.getValue()));
            }
        }
        return out;
    }

    private String layout(String title, String body, String footer) {
        String safeBody = HtmlUtils.htmlEscape(body).replace("\n", "<br>");
        // Make links clickable after escaping.
        safeBody = safeBody.replaceAll("(https?://[^\\s<]+)", "<a href=\"$1\" style=\"color:#6d28d9\">$1</a>");
        return """
            <!doctype html><html><body style="margin:0;background:#f5f3fb;font-family:'Noto Sans','Noto Sans Sinhala','Noto Sans Tamil',Arial,sans-serif">
            <table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
            <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
            <tr><td style="background:#000;padding:20px 28px;color:#fff;font-size:20px;font-weight:700">NodeMor <span style="color:#8b5cf6">Academy</span></td></tr>
            <tr><td style="padding:28px;color:#1f1b2e;font-size:15px;line-height:1.65">
            <h1 style="font-size:20px;margin:0 0 16px">%s</h1>%s</td></tr>
            <tr><td style="padding:16px 28px;background:#f5f3fb;color:#6b6780;font-size:12px">%s</td></tr>
            </table></td></tr></table></body></html>
            """.formatted(HtmlUtils.htmlEscape(title), safeBody, HtmlUtils.htmlEscape(footer));
    }

    private void send(String to, String subject, String plainText, String html) {
        if (!props.getMail().isEnabled()) {
            // Local testing: print the e-mail (e.g. verification code) instead of sending it.
            log.info("\n==================== EMAIL (not sent, mail disabled) ====================\nTo: {}\nSubject: {}\n{}\n=========================================================================",
                    to, subject, plainText);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, false, StandardCharsets.UTF_8.name());
            h.setFrom(props.getMail().getFrom());
            if (props.getMail().getReplyTo() != null && !props.getMail().getReplyTo().isBlank()) {
                h.setReplyTo(props.getMail().getReplyTo());
            }
            h.setTo(to);
            h.setSubject(subject);
            h.setText(html, true);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send e-mail to {}: {}", to, e.getMessage());
        }
    }
}
