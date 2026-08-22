# Progress Log — PRD_INFRA.md

One line (or short block) per completed check. Do not mark a task done here unless its
check in `PRD_INFRA.md` actually ran against the real app and passed.

## Checklist

- [x] Task 1: `/classify` accepts browser-recorded (webm) audio
- [ ] Task 2: Fisheries placeholder data professional pass
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

## Definition of done

All 3 tasks checked off above, each with its check actually run and passed. When true,
write `ALL_TASKS_COMPLETE` to this file and stop.
