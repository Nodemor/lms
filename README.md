# NodeMor Academy

Multi-teacher learning management system: live classes, recorded lessons, notes, assignments,
quizzes, attendance, class fees and teacher subscription plans, in **English, Sinhala and Tamil**.

Documentation for the client: [`docs/FEATURES.md`](docs/FEATURES.md) (proposal checklist),
[`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) and [`docs/USER_GUIDE_SI.md`](docs/USER_GUIDE_SI.md) (සිංහල).
**Step-by-step setup, deployment and testing in Sinhala: [`docs/SETUP_GUIDE_SI.md`](docs/SETUP_GUIDE_SI.md).**

```
nodemore-lms/
├── docs/       Feature checklist and user guides (English, සිංහල)
├── backend/    Spring Boot 3.3 · Java 17 · PostgreSQL · Flyway · Redis
├── frontend/   React 18 · Vite · Tailwind · TanStack Query · i18next · LiveKit
├── docker-compose.yml
└── .env.example
```

**Production deployment (Hostinger VPS, HTTPS, Jenkins CI/CD, email): see [`DEPLOY.md`](DEPLOY.md).**

## 1. Run everything with Docker (quickest)

Requirements: Docker Desktop (or Docker Engine + Compose v2).

```bash
cp .env.example .env
# Edit .env: change every value marked CHANGE. Generate secrets with:
#   openssl rand -base64 48
docker compose up -d --build
```

| What | Where |
|---|---|
| The app | http://localhost:8088 |
| Test email inbox (verification codes arrive here) | http://localhost:8025 |
| Super Admin | the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` |

First test: register a teacher → open Mailpit → enter the 6-digit code → you land on the teacher
dashboard immediately (no admin approval). Create a class, publish it, then register a student in a
private window and join.

## 2. Run for development (hot reload)

Requirements: Java 17 or newer, Maven 3.9+, Node 20+ with pnpm 9 (`corepack enable`), and PostgreSQL 16 + Redis 7 (start just those with
`docker compose up -d postgres redis mailpit livekit`).

```bash
# backend (port 8080)
cd backend
export JWT_SECRET=$(openssl rand -base64 48) DB_PASSWORD=<your db password> \
       ADMIN_EMAIL=admin@nodemor.com ADMIN_PASSWORD=ChangeMe12345 \
       LIVEKIT_API_KEY=<from .env> LIVEKIT_API_SECRET=<from .env>
mvn spring-boot:run

# frontend (port 5173, proxies /api to 8080) — uses pnpm
cd frontend
corepack enable          # once; provides the pnpm version pinned in package.json
pnpm install
pnpm dev
```

Swagger UI: http://localhost:8080/swagger-ui.html (set `API_DOCS_ENABLED=false` in production).

## 2b. Local testing WITHOUT Docker (only PostgreSQL needed)

Needs Java 17+, Maven, Node 20+ with pnpm, and PostgreSQL 13+.

1. Create the database once (in SQL Shell / pgAdmin, as `postgres`):
   ```sql
   CREATE USER nodemore WITH PASSWORD 'MyDbPass123';
   CREATE DATABASE nodemore_lms OWNER nodemore;
   ```
2. Backend: open `backend/run-local.ps1`, set your DB password, then:
   ```powershell
   cd backend
   powershell -ExecutionPolicy Bypass -File .\run-local.ps1
   ```
   Tables are created automatically. Wait for `Started NodemoreLmsApplication`.
3. Frontend (second window):
   ```powershell
   cd frontend
   pnpm install
   pnpm dev
   ```
4. Open http://localhost:5173 and sign in as `admin@nodemore.local` / `Admin@12345`.

In this mode verification codes and every e-mail are **printed in the backend window** (no email
server), Redis and rate limiting are off, and API docs are at http://localhost:8080/swagger-ui.html.
Live classes work only if you also run `livekit-server --dev` (attendance is not recorded locally).
The `local` profile uses public dev secrets: never use it on a real server.

## 2c. Lessons from YouTube

A lesson can be an uploaded video **or** an unlisted YouTube link. The thumbnail comes from YouTube
automatically, and each lesson can carry its own lecture-notes file and description. The video must be
**Unlisted** (not Private) with embedding allowed. Unlisted links are hidden from search, but anyone who
has the link can watch, so upload the video instead for paid content you need fully protected.

## 2d. Live classes on Zoom, Google Meet or Microsoft Teams (free)

When scheduling a live class the teacher pastes a meeting link from their own (free) Zoom, Meet or
Teams account; the last link is remembered. Students see a **Join** button 15 minutes before the start
and are redirected straight to the meeting. The link is only revealed to enrolled students whose fee is
paid. The app records who clicked Join; the teacher marks Present / Absent in **Attendance** because an
outside meeting can't report who actually stayed. The built-in LiveKit room is optional: it only appears
when `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` are set.

## 3. Languages: English, Sinhala, Tamil

Everything the user sees is translated: pages, buttons, validation, errors, notifications,
emails, dates, numbers and currency.

- **Frontend text**: `frontend/src/i18n/locales/en.json`, `si.json`, `ta.json`.
- **Server errors and emails**: `backend/src/main/resources/messages.properties`, `messages_si.properties`, `messages_ta.properties`.
- **Notifications** store only a type and values (class name, date…). The sentence is built when
  displayed, so switching language instantly re-translates old notifications too.
- Each user's language is saved to their account and used for their emails.

### Adding a new feature or text later

1. Use a key in code: `t('myFeature.title')`.
2. Add `"myFeature": { "title": "…" }` to **all three** JSON files.
3. Run `pnpm i18n:check`.

Translations cannot silently break:

- **Frontend**: `pnpm i18n:check` runs automatically as part of every `pnpm build` and in the Docker build. It fails if:
  - any language is missing a key the others have;
  - a `{{placeholder}}` is missing in Sinhala or Tamil;
  - the code uses a key that doesn't exist.
- **Backend**: the test `MessagesConsistencyTest` fails the Maven build if the three message files differ.
- **At runtime**: a missing key falls back to English, never to a blank.

## 4. Production checklist

1. **HTTPS**: put the stack behind a TLS proxy (Caddy, Nginx, Cloudflare). Then set:
   - `PUBLIC_URL=https://…`
   - `COOKIE_SECURE=true`
2. **Secrets**: unique random values for:
   - `JWT_SECRET`
   - `STORAGE_SIGNING_SECRET`
   - `DB_PASSWORD`
   - `LIVEKIT_API_SECRET`
   - `ADMIN_PASSWORD`
3. **Email**: point `SMTP_*` at a transactional provider (Amazon SES, Brevo, Mailgun, …) and remove the `mailpit` service.
4. **File storage (Cloudflare R2)**:
   - Create a bucket and an API token, then set `STORAGE_PROVIDER=s3` and the `S3_*` values.
   - Add a CORS rule on the bucket so browsers can upload directly. Allowed origin: your `PUBLIC_URL`. Methods: `PUT, GET, HEAD`. Headers: `Content-Type`.
   - The bucket stays private; every file is served through signed links that expire.
5. **Live classes**: LiveKit needs public UDP ports and its own TLS address.
   - Easiest: **LiveKit Cloud**. Set:
     - `LIVEKIT_PUBLIC_URL=wss://<project>.livekit.cloud`
     - its key and secret
     - in the LiveKit Cloud dashboard, a webhook to `https://your-domain/api/live/webhook`
   - Self-hosting: follow LiveKit's deployment guide. Set `LIVEKIT_NODE_IP` to the server's public IP, open UDP 50000–50060 and TCP 7881, and serve 7880 behind `wss://`.
6. **Payments**: students pay by bank slip (teacher approves) or cash. Teacher packages are activated by the Super Admin (Admin → Users → Give plan) after the teacher contacts WhatsApp 071 924 7009.
7. **Backups**: schedule `pg_dump` of the `pgdata` volume daily and test a restore. Back up the `uploads` volume too if using local storage.
8. **Monitoring**: `/actuator/health` returns UP/DOWN for uptime checks.

## 5. Security built in

- **Passwords and accounts**:
  - Argon2id password hashing.
  - Email verification with 6-digit codes (expire in 15 minutes, 5 attempts).
  - Account lockout after 5 failed sign-ins.
  - Timing-safe sign-in, so attackers can't tell which emails are registered.
- **Sessions**:
  - 15-minute access tokens kept in memory, not in browser storage.
  - Refresh tokens in an `HttpOnly`, `SameSite=Strict` cookie, rotated on every use.
  - If a refresh token is reused, that whole login session is revoked.
  - Changing or resetting a password signs out every device.
- **Data separation**: every class-scoped request goes through `AccessService`.
  - Teachers can only touch their own classes.
  - Students only see classes they're enrolled in, and only after paying when a fee applies.
  - Other tenants' IDs return 404, so they can't be probed.
  - File keys are prefixed with the owner's ID and checked on every attach.
- **Files**:
  - Private storage with links that expire.
  - File types and sizes checked on an allow-list.
  - Downloads are served with `nosniff`, and path traversal is blocked.
- **Payments**: bank slips need teacher approval; slips are private files with expiring links.
- **Live attendance**: in the built-in room it comes from LiveKit server webhooks, verified by signature. For Zoom/Meet/Teams links the teacher confirms it.
- **Platform**:
  - Redis rate limiting: 20/min per IP on auth, 600/min per IP elsewhere.
  - Security headers and a CSP in nginx.
  - An audit log of security events, viewable in **Admin → Security & logs**.

## 6. Scaling notes (1,000+ users)

One backend container comfortably serves a few thousand active students. Database queries are
indexed and paged, lists are batched (no N+1 queries), and video and files never pass through the API
when R2 is used. To scale out, run more `backend` replicas behind the proxy. Keep
`APP_JOBS_ENABLED=true` on exactly one replica (reminders and clean-up jobs) and `false` on the
others. Live-class capacity depends on your LiveKit server size; LiveKit Cloud scales automatically.

## 7. Before go-live: test these flows

- **Registration**: teacher and student sign-up → email code → dashboard; forgot and reset password.
- **Classes**: create → publish → student joins (open and approval modes); class seat limit; plan limits.
- **Live classes**: teacher starts → student joins → chat and screen share → teacher ends → attendance shown.
- **Lessons**: upload a large video; student watches; progress and completion are recorded.
- **Notes**: preview-only vs downloadable.
- **Assignments**: assignment with attachment → submission → grading → student sees marks.
- **Quizzes**: timed quiz with auto-submit at zero and the results view.
- **Payments**:
  - Monthly fee lock → bank slip → teacher approves → content unlocks.
  - Cash entry by the teacher.
- **Admin**: suspend a user (they're signed out) → reactivate; edit plans; reply to support tickets.
- **Languages**: switch to Sinhala and Tamil on every page, including emails.
- **Data separation**: with two teacher accounts, confirm neither can open the other's class URLs.
