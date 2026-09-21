# AGENTS.md — DoSJE Monitoring App

Read this file at the start of every session and apply these rules throughout.

## Project
A monitoring/inspection platform for DoSJE government schemes: live CCTV feed (demo), random video-call verification between inspector and official, real-time dashboard, mobile inspection module, geo-tagged reports, AI-based fund/beneficiary anomaly detection, and blockchain-secured (hash-chained) inspection reports.

## Tech Stack
- Backend: Django + Django REST Framework
- Database: PostgreSQL
- Auth: Django Auth + JWT (djangorestframework-simplejwt)
- Frontend: HTML + Tailwind CSS + JS, PWA for inspector
- Real-time: Django Channels
- Maps: Leaflet.js + OpenStreetMap
- Charts: Chart.js
- AI: Gemini API (fund/beneficiary anomaly detection, classification)
- Computer Vision: OpenCV + YOLO (attendance/anomaly)
- Video Call: Jitsi Meet External API (meet.jit.si)
- CCTV demo: MediaMTX (RTSP relay) + FFmpeg / phone IP Webcam as source
- Notifications: Firebase Cloud Messaging
- File storage: Django Media / Cloudinary

## Apps & Ownership
- `accounts` — Division, User, NGO (Member 1)
- `projects` — Project, Beneficiary, PurposeItem (Member 1)
- `inspections` — Inspection, InspectionAssignment (Member 1)
- `reports` — InspectionReport, Evidence, Anomaly, ReportBlock (Member 1, hooks to Member 2/3 for AI/CV)

See `database.md`, `backend.md`, `frontend.md` for full specs.

## Rules
1. **Role-based access is mandatory everywhere.** Roles: `super_admin`, `official`, `inspector`, `ngo`. Every queryset must be filtered by `division` FK (official/inspector) or `ngo` FK (ngo role) — never return unfiltered data across roles.
2. **No public self-signup.** Accounts are created by admin via Django admin panel only, for this prototype.
3. **Random assignment must be truly random**, not the first/nearest official — use `.order_by('?')` or `random.choice()` over available officials in the division, to prevent predictable pairing.
4. **Jitsi room names must be unpredictable** — format `dosje-{assignment_id}-{uuid4().hex[:8]}`, never a guessable ID alone.
5. **VC join must always be an explicit user action** (button click) — never auto-join a call or auto-request camera/mic permissions.
6. **VC join is time-windowed** — only allowed within the scheduled inspection window (e.g. ±30 min); reject outside it with a 403.
7. **Blockchain hash-chain applies only to `InspectionReport`.** On report finalize: compute `report_hash` (SHA-256 of the full report JSON — findings, fund numbers, beneficiary counts, purpose checklist, anomaly flags), then create a `ReportBlock` linking to the previous block's `block_hash`. Never allow editing a finalized report without creating a new block.
8. **Fund and beneficiary fields always carry both a claimed and a verified value** (e.g. `fund_utilized_claimed` vs `fund_utilized_verified`) — never collapse these into one field, the mismatch is the core anti-corruption signal.
9. **Before running migrations or altering existing models, show the plan first** and wait for confirmation.
10. **Never hardcode secrets** (API keys, DB credentials) — use `.env` / `django-environ`.
11. Keep views/functions short and single-purpose; prefer serializer-level validation over view-level.
12. When uncertain about intent, ask rather than guessing.
