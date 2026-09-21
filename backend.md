# backend.md — DoSJE Monitoring App Backend

Django + Django REST Framework. Auth via JWT (djangorestframework-simplejwt). See `database.md` for models this builds on.

## Auth
- `POST /api/auth/login/` → returns access + refresh JWT, includes `role` and `division` in response payload
- `POST /api/auth/refresh/`
- Custom permission classes per role:
  - `IsSuperAdmin`
  - `IsOfficialOfDivision` — object's `division` must match `request.user.division`
  - `IsAssignedInspector` — object's inspection must be in `request.user`'s assignments
  - `IsOwnerNGO` — object's `ngo` must match `request.user.ngo`
- No public registration endpoint — accounts created via Django admin only (per AGENTS.md rule 2)

## accounts app
- `GET /api/divisions/` (super_admin only)
- `GET /api/ngos/` (filtered by division for official, by self for ngo role)

## projects app
- `GET/POST /api/projects/` — role-filtered queryset
- `GET/PATCH /api/projects/{id}/` — includes `fund_allocated`, `fund_utilized_claimed`
- `GET/POST /api/projects/{id}/beneficiaries/`
- `GET/POST /api/projects/{id}/purpose-items/`

## inspections app
- `POST /api/inspections/` — official/super_admin creates, triggers random assignment
- On create: assignment logic picks `official = random.choice(available_officials_in_division)` and `inspector` (or inspector self-requests — decide based on team workflow), generates `jitsi_room_name`
- `GET /api/inspections/` — role-filtered (inspector sees own assignments only)
- `GET /api/inspections/{id}/vc-room/` — returns `jitsi_room_name` **only if** current time is within scheduled_time ± 30 min, else 403

## reports app
- `POST /api/reports/` — inspector submits (status=draft initially)
- `PATCH /api/reports/{id}/finalize/` — on finalize:
  1. Compute `report_hash` = SHA-256 of full report JSON (findings, fund_utilized_verified, beneficiary counts, purpose item statuses, anomaly list)
  2. Fetch last `ReportBlock` (by index), get its `block_hash` as `previous_hash` (or "0" if first)
  3. Compute `block_hash` = SHA-256(index + report_hash + previous_hash + timestamp)
  4. Create `ReportBlock`, mark report status="finalized" (immutable after this)
- `POST /api/reports/{id}/evidence/` — upload with geo_lat/geo_lng (from PWA GPS)
- `GET /api/reports/{id}/verify/` — recompute every block's hash from stored data and compare to stored `block_hash`/`previous_hash` chain; return `{"verified": true/false, "broken_at_index": null | int}`
- Anomaly creation: triggered automatically when report finalizes —
  - if `fund_utilized_claimed` (from Project) vs `fund_utilized_verified` differ beyond a threshold → Anomaly(type=fund_mismatch)
  - if `ghost_beneficiaries_count` > 0 → Anomaly(type=ghost_beneficiary)
  - CV/attendance anomalies come from Member 3's OpenCV/YOLO pipeline, written into the same Anomaly model

## AI integration (Gemini API)
- Called at report-finalize time (or async via Django Channels/Celery if time permits) to cross-check `findings` text against `PurposeItem` descriptions and flag inconsistencies as Anomaly entries
- Keep the prompt simple: pass purpose items + findings text, ask for a structured JSON verdict per item

## Real-time (Django Channels)
- WebSocket group per division — pushes live status updates (inspection started, report submitted, anomaly flagged) to official/super_admin dashboards

## CCTV demo endpoint
- No Django logic needed beyond serving the MediaMTX HLS URL to the frontend — MediaMTX runs as a separate process, backend just stores/returns the stream path per inspection if applicable

## Notifications
- Firebase Cloud Messaging triggered on: assignment created, VC window opening, report anomaly flagged
