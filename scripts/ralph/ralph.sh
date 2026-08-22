#!/usr/bin/env bash
# Ralph Wiggum loop: repeatedly invokes Claude Code non-interactively to
# work through a PRD file one task at a time, using a progress file as
# the only state carried between iterations (each `claude -p` call is a
# fresh process with no memory of prior iterations).
#
# Exits when the progress file contains the literal DONE_STRING, or when
# MAX_ITERATIONS is hit - whichever comes first.
#
# Usage: ralph.sh [PRD_FILE] [PROGRESS_FILE] [DONE_STRING] [MAX_ITERATIONS]
# Defaults match the original verify/deploy PRD:
#   ralph.sh PRD.md progress.md ALL_TASKS_COMPLETE 15
# For the sweep PRD:
#   ralph.sh PRD_SWEEP.md progress_sweep.md SWEEP_COMPLETE 15
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PRD_FILE="$REPO_DIR/${1:-PRD.md}"
PROGRESS_FILE="$REPO_DIR/${2:-progress.md}"
DONE_STRING="${3:-ALL_TASKS_COMPLETE}"
MAX_ITERATIONS="${4:-15}"
PRD_BASENAME="$(basename "$PRD_FILE")"
PROGRESS_BASENAME="$(basename "$PROGRESS_FILE")"

if [[ ! -f "$PRD_FILE" ]]; then
  echo "ERROR: $PRD_BASENAME not found at $PRD_FILE" >&2
  exit 1
fi
if [[ ! -f "$PROGRESS_FILE" ]]; then
  echo "ERROR: $PROGRESS_BASENAME not found at $PROGRESS_FILE - create it before starting the loop." >&2
  exit 1
fi

PROMPT=$(cat <<PROMPT_EOF
You are working through $PRD_BASENAME in this repo, one task per iteration, following the ground rules in CLAUDE.md exactly.

At the start of this iteration:
1. Read $PRD_BASENAME and $PROGRESS_BASENAME fresh - do not rely on any memory of previous iterations.
2. If $PROGRESS_BASENAME already contains the literal string $DONE_STRING, do nothing else and stop immediately.
3. Otherwise, find the first task in $PRD_BASENAME whose checklist items are not yet marked complete in $PROGRESS_BASENAME.
4. Do the work that task describes.
5. Run the Check stated for that task for real - do not assume or fabricate the result.
6. Only if the check genuinely passes: mark the task complete in $PROGRESS_BASENAME (checklist plus a dated one-line log entry summarizing what was done), then git commit referencing the task.
7. If the check does not pass after 2-3 genuine attempts, stop working on it, log the failure clearly in $PROGRESS_BASENAME under that task (what was tried, what failed), and do not mark it complete.
8. If you hit something outside your ability to verify (for example, it requires a real account or dashboard you do not have), stop and log that clearly in $PROGRESS_BASENAME rather than guessing or faking a result.
9. Stay strictly inside the scope stated in $PRD_BASENAME. Do not touch anything listed under Out of scope.
10. Never fabricate numbers, metrics, or check results.

When every task in the $PRD_BASENAME checklist is genuinely complete (all checks passed for real) and the definition of done in $PRD_BASENAME is fully satisfied - write the literal string $DONE_STRING into $PROGRESS_BASENAME and stop.
PROMPT_EOF
)

for ((i = 1; i <= MAX_ITERATIONS; i++)); do
  echo "=============================================="
  echo "Ralph loop ($PRD_BASENAME) - iteration $i / $MAX_ITERATIONS"
  echo "=============================================="

  if grep -q "$DONE_STRING" "$PROGRESS_FILE"; then
    echo "$PROGRESS_BASENAME already contains $DONE_STRING - stopping before iteration $i."
    exit 0
  fi

  (cd "$REPO_DIR" && claude -p "$PROMPT" --dangerously-skip-permissions)

  if grep -q "$DONE_STRING" "$PROGRESS_FILE"; then
    echo "Iteration $i: $PROGRESS_BASENAME now contains $DONE_STRING. Done."
    exit 0
  fi

  LAST_LOG_LINE=$(grep '^- \*\*' "$PROGRESS_FILE" | tail -1 || true)
  echo "Iteration $i summary: ${LAST_LOG_LINE:-no log entry found}"
done

echo "Hit iteration cap ($MAX_ITERATIONS) without $DONE_STRING. Stopping - see $PROGRESS_BASENAME for status."
exit 2
