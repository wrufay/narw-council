# PRD: Infra Fixes — Classify Audio Format, Fisheries Placeholder Polish, History Persistence

## Goal
Three independent, scoped fixes across backend and frontend. Each has its own pass/fail
check — work through them in order, do not mark a task complete unless its check actually
passes against the real running app (not assumed).

## Context
- Backend: FastAPI + scikit-learn, `POST /classify` (see `main.py`, `classifier.py`).
  Verified and deployment-ready per `PRD.md` / `progress.md` (already `ALL_TASKS_COMPLETE`) —
  do not reopen or re-litigate anything in that PRD. This file is new, separate work on top
  of a working baseline.
- Frontend: React + Vite in `frontend/`, dark "research instrument" UI (`STYLE.md`), a
  desktop-style tool window (`ToolDesktop.jsx`) with Classify/Council/Map/History panels.
- **Heads up**: another Claude Code session may be working in this same frontend
  concurrently. Check `git status`/recent commits before editing shared files
  (`App.jsx`, `RecordScreen.jsx`, `HistoryScreen.jsx`), and prefer small, frequent commits
  over big rewrites so collisions are easy to resolve.

## Absolute rules — read before touching anything
- **Backend stays stateless, no database.** `CLAUDE.md` locks this explicitly. Task 3
  (History) must be solved entirely client-side (`localStorage`) — never add a DB, a
  persistence service, or any backend endpoint that stores classification history.
- **Fisheries data stays fake.** `CLAUDE.md` locks "no real notification/contact
  infrastructure of any kind." Task 2 makes the placeholder data *look* more professional
  and complete — it must never become, reference, or link to a real NOAA/DFO registry or
  real contact info. If in doubt, keep it obviously fictional (invented org names, no real
  phone numbers/emails/addresses that could be mistaken for real ones).
- **Do not touch the classifier method.** No CNN, no architecture change, no retraining.
  Task 1 is purely about getting audio bytes into a format `librosa`/`soundfile` can read —
  the classification logic itself does not change.
- **No emoji in any UI.** Matches the rest of the app (see recent map-marker fix) — use
  inline SVG for any new icon.

## Task 1 — `/classify` rejects browser-recorded audio
**Problem** (confirmed, real, reproduced): the frontend's `MediaRecorder` records
`audio/webm`. `classifier.py`'s `librosa.load(io.BytesIO(audio_bytes), ...)` fails on it —
`soundfile` can't parse webm and there's no working fallback, so every *recorded* clip
(as opposed to uploaded file) currently 422s with "Format not recognised." Uploaded
files in formats `soundfile` already supports (wav, flac, ogg) work fine today — don't
break those.

- [ ] Reproduce first: `curl -X POST http://localhost:8000/classify -F "audio=@<a real .webm file>"` and confirm the exact current failure.
- [ ] Fix server-side: transcode incoming audio bytes to WAV via `ffmpeg` (already present on this machine at `/opt/homebrew/bin/ffmpeg`; confirm it'll also be available on the Render deploy target — document however this is resolved) before handing to `librosa`/`soundfile`. Prefer a subprocess call or a small, well-known library over hand-rolling container parsing.
- [ ] Update `requirements.txt` / deployment notes if a new Python dependency is added (e.g. `ffmpeg-python`, `pydub`) — pin the version.
- [ ] Confirm existing supported formats (wav at minimum) still work unchanged after the fix.
- **Check:** record a real clip through the actual frontend UI (mic → Record → Upload flow, not a curl fake), classify it, and confirm a valid JSON verdict comes back — no 422, no format error. Also re-run the 3-clip curl check from `progress.md` Task 7 to confirm no regression on already-working formats.

## Task 2 — Fisheries placeholder data, professional pass
**Problem**: `frontend/src/data/fisheries.js` is a short, obviously-placeholder array
(6 entries, no contact fields, comment says so outright). Map markers already dropped the
emoji (done in a prior session) and use muted tier colors — this task is about the *data*
and any remaining rough edges in how it's presented, not a redesign of the map itself.

- [ ] Expand/polish the fisheries list so it reads like a real regional fleet registry — plausible org names, a few more entries for a fuller-looking map, consistent formatting. Keep every entry clearly fictional (do not reuse real co-op/harbor names verbatim from a real registry).
- [ ] If the legend/popup/notify-receipt UI shows fishery info, review it for anything that reads as a placeholder rather than real data (e.g. Lorem-ipsum-style names, inconsistent formatting) and clean it up.
- [ ] Confirm no emoji and no bright/saturated accent colors crept in anywhere in this data or its rendering — stay within the locked palette (`STYLE.md`).
- **Check:** load `/run/map`, visually confirm the fisheries markers + legend + (if present) any notify-receipt text reads as a coherent, professional, obviously-fictional dataset — not sparse or template-y.

## Task 3 — History survives a page reload
**Problem**: `history` in `App.jsx` is `useState([])` — in-memory only. Reload the page
mid-session and it's gone. Per the explicit decision for this task: **no backend change** —
persist via `localStorage` only.

- [ ] Persist the `history` array to `localStorage` on every update (guard reads/writes in try/catch — private browsing / storage-disabled must not crash the app, just silently not persist, same pattern already used for the tool's dark/light theme toggle in `ToolDesktop.jsx`).
- [ ] Rehydrate `history` from `localStorage` on load (dates need to deserialize back to real `Date` objects — they're stored as JSON, `timestamp` will come back as a string).
- [ ] Confirm the existing folder-grid History UI (grouped by date, drill-in to a day's clips) still works unchanged against rehydrated data — this is a persistence fix, not a UI change.
- **Check:** classify a clip, confirm it shows in History, reload the page, confirm the same entry is still there with the same data (tier, score, timestamp, location).

## Definition of done
All 3 tasks checked off above with their checks actually run and passed (not assumed).
Log progress to `progress_infra.md` (one entry per task, same style as `progress.md`) —
commit after each task individually, message referencing the task number. If a check fails
after 2-3 genuine attempts, stop and log it clearly instead of looping on it indefinitely.
