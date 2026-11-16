# NodeMor Academy: feature checklist against the proposal (v1.0)

Status: ✅ delivered in this release · ➕ added beyond the proposal · ⏭ planned for a later phase

## 5. Functional requirements

| Proposal item | Status | Where in the app |
|---|---|---|
| 5.1 Registration, email verification, login, forgot/reset password, logout | ✅ | Sign in / Get started pages |
| 5.1 Session management, role-based permissions, account status | ✅ | Automatic; admin can suspend/reactivate |
| 5.1 Teacher active immediately after verification (no admin approval) | ✅ | Verify page → teacher dashboard |
| 5.2 Teacher dashboard: students, classes, upcoming sessions, recent enrolments, payment summary, quick actions | ✅ | Teacher → Dashboard |
| 5.3 Class create/edit/archive/delete, publish/unpublish, fees, schedule, thumbnail, analytics | ✅ | Teacher → My classes → class |
| 5.4 Enrolment: open or approval mode, history, status, notifications | ✅ | Class → Students tab; Student → My classes |
| 5.5 Live classes: video, audio, screen share, scheduled sessions, attendance | ✅ | Zoom / Google Meet / Teams links (free) or built-in LiveKit room |
| 5.6 Recorded lessons: upload, order, availability, viewing permissions, progress | ✅ | Unlisted YouTube links or private uploads; resume and progress |
| 5.7 Notes: PDF/Word/PowerPoint/images, categories, preview, download permission | ✅ | Class → Notes tab |
| 5.8 Assignments: instructions, due date, attachments, submissions, feedback, marks | ✅ | Class → Assignments tab |
| 5.9 Quizzes: MCQ, true/false, scheduling, time limits, auto-grading, result history | ✅ | Class → Quizzes tab; Student → My results |
| 5.10 Attendance: history, reports, percentage, class summaries | ✅ | Class → Attendance tab, export to Excel |
| 5.11 Payments: class fees, verification, history, refunds, reports | ✅ | Bank slips approved by the teacher, cash; export to Excel. Teacher packages via WhatsApp + admin activation |
| 5.12 Notifications: email and in-app for all listed events | ✅ | Bell icon; emails in the user's language |

## 6. Super Admin panel

| Module | Status |
|---|---|
| Dashboard analytics, teacher and student management | ✅ |
| Class monitoring, enrolment monitoring | ✅ |
| Subscription management, payment management | ✅ |
| Platform settings, notification settings | ✅ (platform settings + each user's email preference) |
| Support management, audit logs, security monitoring | ✅ |

## Added beyond the proposal

| Feature | Why |
|---|---|
| ➕ English, Sinhala and Tamil everywhere (screens, errors, emails) | Sri Lankan audience |
| ➕ Class announcements with pinning and email | Teachers' most common daily need |
| ➕ "My results" page for students | One place for all marks |
| ➕ Each teacher's own bank account on the Fees page | Money goes straight to the teacher |
| ➕ Monthly fee locking per calendar month | How tuition classes are billed |
| ➕ Export to Excel (payments, attendance, students, results) | Reports for teachers |
| ➕ Back button, phone bottom navigation, skeleton loading | Easier to use on phones |
| ➕ Teacher plans with limits (classes, students, storage) | SaaS business model (section 17) |
| ➕ Class QR code + printable poster with mentor details | Easy sharing on posters and WhatsApp |
| ➕ In-person classes with rotating QR check-in | Real attendance for physical classes |
| ➕ WhatsApp and email contact everywhere (071 924 7009, nodemoracademy@gmail.com) | Fast support |

## Later phases (as listed in the proposal)

| Item | Phase |
|---|---|
| ⏭ Production deployment, domain, HTTPS, backups, monitoring | Deployment |
| ⏭ Android and iOS apps | Section 18 |
| ⏭ AI assistant, AI quizzes, AI summaries | Section 18 |
| ⏭ Certificates, discussion forums, gamification, parent dashboards, institute management | Section 18 |
