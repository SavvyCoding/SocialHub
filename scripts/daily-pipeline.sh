#!/usr/bin/env bash
# Daily autonomous feature pipeline
# Invokes Claude Code CLI with full auto-approve and the pipeline prompt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROMPT_FILE="$SCRIPT_DIR/daily-pipeline-prompt.txt"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/pipeline-$(date +%Y-%m-%d).log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "========================================"
echo " Daily Feature Pipeline — $(date)"
echo "========================================"
echo "Project: $PROJECT_ROOT"
echo "Log:     $LOG_FILE"
echo ""

# Verify Docker stack is running before starting
echo "Checking Docker containers..."
REQUIRED_CONTAINERS=("social_platform_web" "social_platform_worker" "social_platform_db" "social_platform_redis")
ALL_RUNNING=true
for container in "${REQUIRED_CONTAINERS[@]}"; do
  STATUS=$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || echo "false")
  if [ "$STATUS" != "true" ]; then
    echo "ERROR: Container $container is not running."
    ALL_RUNNING=false
  fi
done

if [ "$ALL_RUNNING" = "false" ]; then
  echo ""
  echo "Starting Docker stack..."
  cd "$PROJECT_ROOT"
  ./deployment/deploy.sh up
  echo "Waiting 20 seconds for services to be ready..."
  sleep 20
fi

echo "Docker stack is ready. Starting Claude pipeline..."
echo ""

# Run Claude Code in autonomous mode
# --dangerously-skip-permissions: auto-approve all tool calls
# -p / --print: non-interactive, run to completion
cd "$PROJECT_ROOT"
/c/Users/digvi/.local/bin/claude.exe --dangerously-skip-permissions --output-format stream-json --verbose -p "$(cat "$PROMPT_FILE")" 2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "========================================"
echo " Pipeline finished at $(date)"
echo " Exit code: $EXIT_CODE"
echo " Log saved: $LOG_FILE"
echo "========================================"

exit $EXIT_CODE
