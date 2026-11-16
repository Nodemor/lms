-- Lessons can be an uploaded video OR a YouTube (unlisted) link, and can carry a lecture-notes file.
ALTER TABLE lessons ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT 'UPLOAD'
    CHECK (source_type IN ('UPLOAD','YOUTUBE'));
ALTER TABLE lessons ADD COLUMN youtube_id VARCHAR(20);
ALTER TABLE lessons ADD COLUMN notes_key VARCHAR(500);
ALTER TABLE lessons ADD COLUMN notes_name VARCHAR(255);
ALTER TABLE lessons ADD COLUMN notes_size_bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE lessons ALTER COLUMN video_key DROP NOT NULL;
ALTER TABLE lessons ADD CONSTRAINT ck_lesson_source CHECK (
    (source_type = 'UPLOAD' AND video_key IS NOT NULL) OR (source_type = 'YOUTUBE' AND youtube_id IS NOT NULL));
