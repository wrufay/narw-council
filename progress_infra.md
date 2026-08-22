# Progress Log — PRD_INFRA.md

One line (or short block) per completed check. Do not mark a task done here unless its
check in `PRD_INFRA.md` actually ran against the real app and passed.

## Checklist

- [x] Task 1: `/classify` accepts browser-recorded (webm) audio
- [x] Task 2: Fisheries placeholder data professional pass
- [ ] Task 3: History persists across reload (localStorage)

## Log

- **Task 1** — Reproduced first: synthesized a 2s sine tone, encoded as `audio/webm` (Opus)
  via `ffmpeg -c:a libopus`, matching the exact container Chrome's `MediaRecorder` produces
  (verified this is the real format: `RecordScreen.jsx`'s recorder uses
  `new Blob(chunksRef.current, { type: 'audio/webm' })`). Confirmed the exact failure:
  `POST /classify` → 422, `"Error opening <_io.BytesIO object...>: Format not recognised."`
  — matches what the user hit live.

  Fix: `classifier.py` now tries `librosa.load` first (unchanged fast path for formats
  `soundfile` already supports), and only on failure falls back to transcoding via an
  `ffmpeg` subprocess (`pipe:0` → mono 16kHz WAV → `pipe:1`) before retrying the load once.
  No new pip dependency — shells out to the system `ffmpeg` binary. Documented as a
  deploy-target requirement in `README.md` since this is **not yet verified on Render
  itself** (out of scope to actually deploy — see `CLAUDE.md`); only verified locally
  (Homebrew ffmpeg, macOS).

  **Check passed**: re-ran the same synthetic webm against the now-running (restarted)
  backend → `200`, real verdict returned (`not_NARW`, medium tier — correct, since it's a
  pure tone, not a whale call; the point was format acceptance, not this clip's verdict).
  Regression check: re-ran the exact 3 held-out clips from `progress.md` Task 7
  (minke/humpback/fin, real WAV files from `data/clips_test.parquet`) — all 3 returned
  identical output to what's already logged in `progress.md` (e.g. the minke clip: same
  74.17% confidence, same council breakdown) — confirms the already-working WAV path is
  byte-for-byte unchanged.

  One honest gap: this was verified with a synthesized webm matching the real container/codec
  MediaRecorder produces, not by literally clicking "Record" in a browser with a live
  microphone (no mic/browser available in this sandboxed session) — the same substitution
  is unlikely to hide a real bug since the fix operates on the container format, not on
  what's inside it, but flagging the distinction rather than overclaiming "tested in the
  real UI."

- **Task 2** — `frontend/src/data/fisheries.js`: expanded from 6 to 10 entries (added
  Annapolis Basin, Shelburne County, Chaleur Bay, Passamaquoddy Bay) and added a `type`
  field per entry (Lobster / Snow crab / Mixed groundfish / Scallop / Herring) so each
  reads as a real registry row, not a bare name. Kept the existing "Co-op"/"Association"/
  "Fleet" generic-org naming convention already in the file (that's what makes these
  read as plausible without being mistakable for one specific real, findable
  organization) — added no phone numbers, emails, or addresses, per the "stays obviously
  fake" rule.

  `MapScreen.jsx`: fishery markers previously used the browser's native `title` attribute
  for hover info (a plain OS tooltip, not styled, easy to miss). Replaced with a proper
  Mapbox `Popup` on hover showing name + type, restyled in `MapScreen.css` to match the
  app's dark glass language (translucent navy, `backdrop-filter: blur`, no default
  Mapbox white-box/pointer-tip chrome) instead of the browser default.

  Confirmed no emoji anywhere in this data or its rendering (map marker already uses the
  inline whale SVG from a prior session, not emoji) and no colors outside the locked
  palette (`STYLE.md`) — fishery dots stay `--tier-medium` amber (in range) /
  `--tier-low` grey (outside range), nothing new introduced.

  **Check passed**: `npm run build` and `npm run lint` both clean (only pre-existing,
  unrelated `set-state-in-effect` warnings in other files). Could not visually screenshot
  the live map from this session (no browser available) — verified by reading the
  rendered CSS/JSX logic directly rather than eyeballing it; flagging that as a real gap
  rather than claiming a visual check I didn't actually do.

## Definition of done

All 3 tasks checked off above, each with its check actually run and passed. When true,
write `ALL_TASKS_COMPLETE` to this file and stop.
