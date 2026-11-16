-- Live classes can run on an external meeting service (Zoom, Google Meet, Microsoft Teams, ...).
-- The link is only revealed to enrolled students who have access, through the join endpoint.
ALTER TABLE class_sessions ADD COLUMN meeting_url VARCHAR(1000);
ALTER TABLE class_sessions ADD COLUMN meeting_provider VARCHAR(20);
CREATE INDEX ix_sessions_external ON class_sessions (status, scheduled_start) WHERE meeting_url IS NOT NULL;
