-- =====================================================================
-- Nodemore LMS - initial schema
-- Multi-tenant: every teacher-owned row carries teacher_id (the tenant).
-- =====================================================================

CREATE TABLE users (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                  VARCHAR(255) NOT NULL,
    password_hash          VARCHAR(255) NOT NULL,
    full_name              VARCHAR(150) NOT NULL,
    phone                  VARCHAR(30),
    role                   VARCHAR(20)  NOT NULL CHECK (role IN ('SUPER_ADMIN','TEACHER','STUDENT')),
    status                 VARCHAR(30)  NOT NULL CHECK (status IN ('PENDING_VERIFICATION','ACTIVE','SUSPENDED')),
    email_verified         BOOLEAN      NOT NULL DEFAULT FALSE,
    preferred_language     VARCHAR(5)   NOT NULL DEFAULT 'en',
    avatar_key             VARCHAR(500),
    failed_login_attempts  INTEGER      NOT NULL DEFAULT 0,
    locked_until           TIMESTAMPTZ,
    last_login_at          TIMESTAMPTZ,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));
CREATE INDEX ix_users_role_status ON users (role, status);

CREATE TABLE teacher_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    headline        VARCHAR(200),
    bio             TEXT,
    subjects        VARCHAR(300),
    qualifications  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    school          VARCHAR(200),
    grade           VARCHAR(50),
    guardian_name   VARCHAR(150),
    guardian_phone  VARCHAR(30),
    date_of_birth   DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE one_time_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose     VARCHAR(30) NOT NULL CHECK (purpose IN ('VERIFY_EMAIL','RESET_PASSWORD')),
    token_hash  VARCHAR(128) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    attempts    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_ott_user_purpose ON one_time_tokens (user_id, purpose);
CREATE INDEX ix_ott_hash ON one_time_tokens (token_hash);

CREATE TABLE refresh_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   VARCHAR(128) NOT NULL UNIQUE,
    family_id    UUID NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ,
    user_agent   VARCHAR(300),
    ip_address   VARCHAR(64),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_refresh_user ON refresh_tokens (user_id);
CREATE INDEX ix_refresh_family ON refresh_tokens (family_id);

-- ---------------------------------------------------------------- plans
CREATE TABLE plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(30)  NOT NULL UNIQUE,
    name                VARCHAR(80)  NOT NULL,
    price_monthly       NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency            VARCHAR(3)   NOT NULL DEFAULT 'LKR',
    max_classes         INTEGER      NOT NULL,
    max_students        INTEGER      NOT NULL,
    storage_mb          BIGINT       NOT NULL,
    advanced_analytics  BOOLEAN      NOT NULL DEFAULT FALSE,
    custom_branding     BOOLEAN      NOT NULL DEFAULT FALSE,
    priority_support    BOOLEAN      NOT NULL DEFAULT FALSE,
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order          INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan_id               UUID NOT NULL REFERENCES plans(id),
    status                VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','PAST_DUE','CANCELLED')),
    current_period_start  TIMESTAMPTZ NOT NULL,
    current_period_end    TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- classes
CREATE TABLE classes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    subject          VARCHAR(100) NOT NULL,
    grade_level      VARCHAR(60),
    medium           VARCHAR(10)  NOT NULL DEFAULT 'en',
    thumbnail_key    VARCHAR(500),
    schedule_text    VARCHAR(300),
    enrollment_mode  VARCHAR(20)  NOT NULL CHECK (enrollment_mode IN ('OPEN','APPROVAL')),
    billing_type     VARCHAR(20)  NOT NULL CHECK (billing_type IN ('FREE','ONE_TIME','MONTHLY')),
    fee              NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency         VARCHAR(3)   NOT NULL DEFAULT 'LKR',
    max_students     INTEGER,
    status           VARCHAR(20)  NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_classes_teacher ON classes (teacher_id);
CREATE INDEX ix_classes_status ON classes (status);

CREATE TABLE enrollments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id     UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','ACTIVE','REJECTED','CANCELLED','REMOVED')),
    note         VARCHAR(500),
    approved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_enrollment UNIQUE (class_id, student_id)
);
CREATE INDEX ix_enrollments_student ON enrollments (student_id);
CREATE INDEX ix_enrollments_teacher ON enrollments (teacher_id, status);

-- ---------------------------------------------------------------- live sessions
CREATE TABLE class_sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id          UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(200) NOT NULL,
    description       TEXT,
    scheduled_start   TIMESTAMPTZ NOT NULL,
    duration_minutes  INTEGER NOT NULL,
    status            VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED','LIVE','ENDED','CANCELLED')),
    room_name         VARCHAR(100) NOT NULL UNIQUE,
    started_at        TIMESTAMPTZ,
    ended_at          TIMESTAMPTZ,
    reminder_sent     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_sessions_class ON class_sessions (class_id, scheduled_start);
CREATE INDEX ix_sessions_status_start ON class_sessions (status, scheduled_start);

CREATE TABLE attendance (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    class_id           UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_joined_at    TIMESTAMPTZ,
    last_left_at       TIMESTAMPTZ,
    open_joined_at     TIMESTAMPTZ,
    total_seconds      INTEGER NOT NULL DEFAULT 0,
    join_count         INTEGER NOT NULL DEFAULT 0,
    present            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_attendance UNIQUE (session_id, student_id)
);
CREATE INDEX ix_attendance_class_student ON attendance (class_id, student_id);

-- ---------------------------------------------------------------- recorded lessons
CREATE TABLE lessons (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id          UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(200) NOT NULL,
    description       TEXT,
    video_key         VARCHAR(500) NOT NULL,
    content_type      VARCHAR(100),
    size_bytes        BIGINT NOT NULL DEFAULT 0,
    duration_seconds  INTEGER,
    position          INTEGER NOT NULL DEFAULT 0,
    published         BOOLEAN NOT NULL DEFAULT TRUE,
    available_from    TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_lessons_class ON lessons (class_id, position);

CREATE TABLE lesson_progress (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id              UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id               UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    watched_seconds        INTEGER NOT NULL DEFAULT 0,
    last_position_seconds  INTEGER NOT NULL DEFAULT 0,
    completed              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_lesson_progress UNIQUE (lesson_id, student_id)
);

-- ---------------------------------------------------------------- notes / materials
CREATE TABLE materials (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id      UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    category      VARCHAR(60),
    file_key      VARCHAR(500) NOT NULL,
    file_name     VARCHAR(255) NOT NULL,
    content_type  VARCHAR(100),
    size_bytes    BIGINT NOT NULL DEFAULT 0,
    downloadable  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_materials_class ON materials (class_id);

-- ---------------------------------------------------------------- assignments
CREATE TABLE assignments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id         UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    instructions     TEXT,
    due_at           TIMESTAMPTZ NOT NULL,
    max_marks        INTEGER NOT NULL DEFAULT 100,
    attachment_key   VARCHAR(500),
    attachment_name  VARCHAR(255),
    allow_late       BOOLEAN NOT NULL DEFAULT FALSE,
    published        BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_sent    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_assignments_class ON assignments (class_id, due_at);

CREATE TABLE submissions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id  UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    class_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text_answer    TEXT,
    file_key       VARCHAR(500),
    file_name      VARCHAR(255),
    version        INTEGER NOT NULL DEFAULT 1,
    submitted_at   TIMESTAMPTZ NOT NULL,
    late           BOOLEAN NOT NULL DEFAULT FALSE,
    status         VARCHAR(20) NOT NULL CHECK (status IN ('SUBMITTED','GRADED')),
    marks          INTEGER,
    feedback       TEXT,
    graded_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_submission UNIQUE (assignment_id, student_id)
);
CREATE INDEX ix_submissions_student ON submissions (student_id);

-- ---------------------------------------------------------------- quizzes
CREATE TABLE quizzes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id            UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    opens_at            TIMESTAMPTZ,
    closes_at           TIMESTAMPTZ,
    time_limit_minutes  INTEGER,
    max_attempts        INTEGER NOT NULL DEFAULT 1,
    shuffle_questions   BOOLEAN NOT NULL DEFAULT FALSE,
    show_answers        BOOLEAN NOT NULL DEFAULT TRUE,
    published           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_quizzes_class ON quizzes (class_id);

CREATE TABLE questions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id        UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    text           TEXT NOT NULL,
    type           VARCHAR(20) NOT NULL CHECK (type IN ('MCQ','TRUE_FALSE')),
    options_json   TEXT NOT NULL,
    correct_index  INTEGER NOT NULL,
    marks          INTEGER NOT NULL DEFAULT 1,
    position       INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_questions_quiz ON questions (quiz_id, position);

CREATE TABLE quiz_attempts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id        UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    class_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status         VARCHAR(20) NOT NULL CHECK (status IN ('IN_PROGRESS','SUBMITTED')),
    started_at     TIMESTAMPTZ NOT NULL,
    deadline_at    TIMESTAMPTZ,
    submitted_at   TIMESTAMPTZ,
    answers_json   TEXT,
    score          INTEGER,
    max_score      INTEGER,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_attempts_quiz_student ON quiz_attempts (quiz_id, student_id);

-- ---------------------------------------------------------------- payments
CREATE TABLE payments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      VARCHAR(40) NOT NULL UNIQUE,
    type          VARCHAR(20) NOT NULL CHECK (type IN ('CLASS_FEE','SUBSCRIPTION')),
    method        VARCHAR(20) NOT NULL CHECK (method IN ('PAYHERE','BANK_TRANSFER','CASH')),
    status        VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','PAID','FAILED','CANCELLED','REFUNDED')),
    teacher_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    class_id      UUID REFERENCES classes(id) ON DELETE SET NULL,
    plan_id       UUID REFERENCES plans(id),
    period_month  VARCHAR(7),
    amount        NUMERIC(12,2) NOT NULL,
    currency      VARCHAR(3) NOT NULL,
    gateway_ref   VARCHAR(100),
    slip_key      VARCHAR(500),
    note          VARCHAR(500),
    verified_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    paid_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_payments_teacher ON payments (teacher_id, status);
CREATE INDEX ix_payments_student_class ON payments (student_id, class_id, status);

-- ---------------------------------------------------------------- notifications
CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(60) NOT NULL,
    params_json  TEXT,
    link         VARCHAR(300),
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_user ON notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------- support
CREATE TABLE support_tickets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category     VARCHAR(40) NOT NULL,
    subject      VARCHAR(200) NOT NULL,
    message      TEXT NOT NULL,
    status       VARCHAR(20) NOT NULL CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),
    admin_reply  TEXT,
    replied_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_tickets_status ON support_tickets (status);

-- ---------------------------------------------------------------- audit + settings
CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     UUID,
    actor_email  VARCHAR(255),
    action       VARCHAR(60) NOT NULL,
    entity_type  VARCHAR(60),
    entity_id    VARCHAR(60),
    details      TEXT,
    ip_address   VARCHAR(64),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_created ON audit_logs (created_at DESC);
CREATE INDEX ix_audit_action ON audit_logs (action);

CREATE TABLE platform_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(80) NOT NULL UNIQUE,
    value       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- seed data
INSERT INTO plans (code, name, price_monthly, max_classes, max_students, storage_mb, advanced_analytics, custom_branding, priority_support, sort_order) VALUES
 ('FREE',         'Free',          0,     2,    50,    1024,  FALSE, FALSE, FALSE, 0),
 ('STARTER',      'Starter',       2500,  5,    200,   10240, FALSE, FALSE, FALSE, 1),
 ('PROFESSIONAL', 'Professional',  6500,  20,   1000,  51200, TRUE,  FALSE, TRUE,  2),
 ('PREMIUM',      'Premium',       14500, 100,  10000, 204800,TRUE,  TRUE,  TRUE,  3);

INSERT INTO platform_settings (setting_key, value) VALUES
 ('platform.name', 'Nodemore LMS'),
 ('platform.supportEmail', 'support@nodemor.com'),
 ('attendance.minPercent', '50'),
 ('registration.teachersEnabled', 'true'),
 ('registration.studentsEnabled', 'true'),
 ('bank.details', 'Bank: -\nAccount name: -\nAccount number: -\nBranch: -');
