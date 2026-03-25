#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Building test image..."
docker build -t social-platform-tests "$SCRIPT_DIR"

echo "==> Running tests against http://social_platform_web:3000..."
docker run --rm \
  --name social_platform_tests \
  --network openfang-1_default \
  -e BASE_URL=http://social_platform_web:3000 \
  -v "$SCRIPT_DIR/results:/tests/results" \
  social-platform-tests \
  npx playwright test || true

echo "==> Combining video recordings..."
docker run --rm \
  --name social_platform_combine \
  -v "$SCRIPT_DIR/results:/tests/results" \
  social-platform-tests \
  node scripts/combine-videos.mjs || echo "Video combine skipped (may need ffmpeg)"

echo ""
echo "==> Test results saved to: $SCRIPT_DIR/results/"
echo "    - Screenshots: results/screenshots/"
echo "    - Videos:      results/artifacts/"
echo "    - Combined:    results/combined-test-recording.webm"
echo "    - HTML Report: results/html/"
