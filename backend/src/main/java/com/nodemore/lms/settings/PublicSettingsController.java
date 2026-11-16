package com.nodemore.lms.settings;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Public contact details shown in the footer, help, pricing and fee pages. */
@RestController
@RequiredArgsConstructor
public class PublicSettingsController {
    private final SettingsService settings;

    @GetMapping("/api/public/settings")
    public Map<String, Object> publicSettings() {
        return Map.of(
                "platformName", settings.get("platform.name", "NodeMor Academy"),
                "supportEmail", settings.get("platform.supportEmail", "nodemoracademy@gmail.com"),
                "whatsapp", settings.get("contact.whatsapp", "94719247009"));
    }
}
