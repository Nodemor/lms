package com.nodemore.lms.settings;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class SettingsService {

    /** Only these keys may be edited by the Super Admin. */
    public static final Set<String> EDITABLE = Set.of(
            "platform.name", "platform.supportEmail", "attendance.minPercent",
            "registration.teachersEnabled", "registration.studentsEnabled", "bank.details", "contact.whatsapp");

    private final PlatformSettingRepository repo;

    @Transactional(readOnly = true)
    public String get(String key, String def) {
        return repo.findBySettingKey(key).map(PlatformSetting::getValue).orElse(def);
    }

    public int getInt(String key, int def) {
        try { return Integer.parseInt(get(key, String.valueOf(def)).trim()); }
        catch (NumberFormatException e) { return def; }
    }

    public boolean getBool(String key, boolean def) {
        return Boolean.parseBoolean(get(key, String.valueOf(def)).trim());
    }

    @Transactional(readOnly = true)
    public Map<String, String> all() {
        Map<String, String> m = new TreeMap<>();
        repo.findAll().forEach(s -> m.put(s.getSettingKey(), s.getValue()));
        return m;
    }

    @Transactional
    public void put(String key, String value) {
        PlatformSetting s = repo.findBySettingKey(key).orElseGet(() -> {
            PlatformSetting n = new PlatformSetting();
            n.setSettingKey(key);
            return n;
        });
        s.setValue(value);
        repo.save(s);
    }
}
