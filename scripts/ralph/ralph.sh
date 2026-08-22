#!/usr/bin/env bash
# Ralph Wiggum loop: repeatedly invokes Claude Code non-interactively to
# work through PRD.md one task at a time, using progress.md as the only
# state carried between iterations (each `claude -p` call is a fresh
# process with no memory of prior iterations).
#
# Exits when progress.md contains the literal string ALL_TASKS_COMPLETE,
# or when MAX_ITERATIONS is hit - whichever comes first.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PRD_FILE="$REPO_DIR/PRD.md"
PROGRESS_FILE="$REPO_DIR/progress.md"
MAX_ITERATIONS=15

if [[ ! -f "$PRD_FILE" ]]; then
  echo "ERROR: PRD.md not found at $PRD_FILE" >&2
  exit 1
fi
if [[ ! -f "$PROGRESS_FILE" ]]; then
  echo "ERROR: progress.md not found at $PROGRESS_FILE - create it before starting the loop." >&2
  exit 1
fi

PROMPT=$(cat <<'PROMPT_EOF'
You are working through PRD.md in this repo, one task per iteration, following CLAUDE.md's ground rules exactly.

At the start of this iteration:
1. Read PRD.md and progress.md fresh - do not rely on any memory of previous iterations.
2. If progress.md already contains the literal string ALL_TASKS_COMPLETE, do nothing else and stop immediately.
3. Otherwise, find the first task in PRD.md whose checklist items are not yet marked complete in progress.md.
4. Do the work that task describes.
5. Run that task's stated "Check" for real - do not assume or fabricate the result.
6. Only if the check genuinely passes: mark the task complete in progress.md (checklist + a dated one-line log entry summarizing what was done), then git commit referencing the task number.
7. If the check does not pass after 2-3 genuine attempts, stop working on it, log the failure clearly in progress.md under that task (what was tried, what failed), and do not mark it complete.
8. If you hit something outside your ability to verify (e.g. it requires a real Render account/dashboard), stop and log that clearly in progress.md rather than guessing or faking a result.
9. Stay strictly inside PRD.md's stated scope. Do not touch anything listed under "Out of scope".
10. Never fabricate numbers, metrics, or check results.

When every task in PRD.md's checklist is genuinely complete (all checks passed for real), and outputs/verification_notes.md and outputs/final_metrics.md both exist with real content, and the endpoint has been verified locally - write the literal string ALL_TASKS_COMPLETE into progress.md and stop.
PROMPT_EOF
)

for ((i = 1; i <= MAX_ITERATIONS; i++)); do
  echo "=============================================="
  echo "Ralph loop - iteration $i / $MAX_ITERATIONS"
  echo "=============================================="

  if grep -q "ALL_TASKS_COMPLETE" "$PROGRESS_FILE"; then
    echo "progress.md already contains ALL_TASKS_COMPLETE - stopping before iteration $i."
    exit 0
  fi

  (cd "$REPO_DIR" && claude -p "$PROMPT" --dangerously-skip-permissions)

  if grep -q "ALL_TASKS_COMPLETE" "$PROGRESS_FILE"; then
    echo "Iteration $i: progress.md now contains ALL_TASKS_COMPLETE. Done."
    exit 0
  fi

  LAST_LOG_LINE=$(grep '^- \*\*' "$PROGRESS_FILE" | tail -1 || true)
  echo "Iteration $i summary: ${LAST_LOG_LINE:-no log entry found}"
done

echo "Hit iteration cap ($MAX_ITERATIONS) without ALL_TASKS_COMPLETE. Stopping - see progress.md for status."
exit 2
