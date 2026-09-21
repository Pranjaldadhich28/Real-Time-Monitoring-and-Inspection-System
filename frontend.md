# frontend.md — DoSJE Monitoring App Frontend

Django templates + Tailwind CSS + vanilla JS. Inspector-facing part is a PWA. See `backend.md` for the endpoints these pages call.

## Shared
- `Login page` — role-agnostic, redirects to correct dashboard based on `role` in JWT response
- `Nav/sidebar` — items shown differ by role (see below)

## super_admin — Overview Dashboard
- Division-wise map (Leaflet.js) showing all active inspections
- Charts.js: challenges/inspections by division, anomaly trends, fund utilization overall
- Table: all divisions with drill-down link

## official — Division Dashboard
- List of NGOs/projects/inspectors in own division only
- "Schedule Inspection" form → calls `POST /api/inspections/`
- Pending VC calls — "Join Call" button (enabled only inside the time window, disabled state shows countdown/reason otherwise) → embeds Jitsi via `JitsiMeetExternalAPI`
- Reports inbox — list of submitted reports with anomaly flags highlighted (red badge if any Anomaly attached)
- Report detail view — shows claimed vs verified fund/beneficiary numbers side by side, "Verify Integrity" button → calls `GET /api/reports/{id}/verify/`, shows ✓ Verified / ✗ Tampered badge

## inspector — PWA (mobile-first)
- "My Assignments" list — today's/upcoming inspections
- Inspection detail — project info, purpose items checklist to verify on-site
- "Join Call" button — same Jitsi embed pattern, explicit click only, no auto-join
- Report submission form:
  - Findings text area
  - Per-PurposeItem: mark actual_status (done/partial/not_done)
  - Fund verified amount input
  - Beneficiary count verified (with option to mark specific claimed beneficiaries as "not found")
  - Evidence upload (photo/video) — auto-capture GPS geo_lat/geo_lng from device
  - "Finalize Report" — warns this is irreversible (hash-chained) before submit
- CCTV live view (demo) — `<video>` tag pointed at MediaMTX HLS URL, shown when relevant to the inspection

## ngo — Read-only Project View
- Own projects list, fund allocated vs claimed vs verified (once reports exist)
- Beneficiary list (as registered)
- Cannot see raw inspection reports, only status summaries

## Notification handling
- Firebase Cloud Messaging — in-app toast + badge count on nav for: new assignment, VC window open, anomaly flagged on own project (ngo sees a generic "under review" notice, not full anomaly detail)
