-- Rebrand + contact details shown across the site (editable by the Super Admin).
UPDATE platform_settings SET value = 'NodeMor Academy' WHERE setting_key = 'platform.name';
UPDATE platform_settings SET value = 'nodemoracademy@gmail.com' WHERE setting_key = 'platform.supportEmail';
INSERT INTO platform_settings (setting_key, value) VALUES ('contact.whatsapp', '94719247009')
    ON CONFLICT (setting_key) DO NOTHING;

-- In-person classes (QR check-in) are sessions without a meeting link.
ALTER TABLE class_sessions ADD COLUMN in_person BOOLEAN NOT NULL DEFAULT FALSE;
