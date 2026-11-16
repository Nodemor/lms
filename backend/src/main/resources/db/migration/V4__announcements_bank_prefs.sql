-- Each teacher can show their own bank account to students (money goes straight to the teacher).
ALTER TABLE teacher_profiles ADD COLUMN bank_details TEXT;

-- Users can turn off non-essential e-mails (security and payment e-mails are always sent).
ALTER TABLE users ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT TRUE;

-- Class announcements from the teacher.
CREATE TABLE announcements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    body        TEXT NOT NULL,
    pinned      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_announcements_class ON announcements (class_id, pinned DESC, created_at DESC);
