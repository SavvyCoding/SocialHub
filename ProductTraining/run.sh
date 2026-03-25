#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Building product training image..."
docker build -t social-platform-training "$SCRIPT_DIR"

echo "==> Step 1: Recording feature demos..."
docker run --rm --name sp_training_record \
  --network openfang-1_default \
  -e BASE_URL=http://social_platform_web:3000 \
  -v "$SCRIPT_DIR/output:/app/output" \
  social-platform-training \
  npx playwright test || true

echo ""
echo "==> Step 2: Generating voice narration..."
docker run --rm --name sp_training_tts \
  -v "$SCRIPT_DIR/output:/app/output" \
  -v "$SCRIPT_DIR/scripts:/app/scripts" \
  social-platform-training \
  python3 scripts/generate-audio.py

echo ""
echo "==> Step 3: Combining video + audio..."
docker run --rm --name sp_training_combine \
  -v "$SCRIPT_DIR/output:/app/output" \
  -v "$SCRIPT_DIR/scripts:/app/scripts" \
  social-platform-training \
  bash scripts/combine-with-audio.sh

echo ""
echo "==> Done! Output in: $SCRIPT_DIR/output/"
echo "    Final video: output/SocialHub-Product-Training.webm"
