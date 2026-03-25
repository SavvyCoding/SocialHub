#!/usr/bin/env bash
set -euo pipefail

RAW_DIR="/app/output/raw-videos"
AUDIO_DIR="/app/output/audio"
SEGMENTS_DIR="/app/output/segments"
FINAL_DIR="/app/output"

mkdir -p "$SEGMENTS_DIR"

echo "==> Finding video files..."
# Map demo number to video file
VIDEOS=()
for i in 01 02 03 04 05 06 07 08 09 10; do
  # Find the video.webm in the artifact directory matching this demo number
  VIDEO_FILE=$(find "$RAW_DIR" -path "*${i}-*" -name "video.webm" 2>/dev/null | head -1)
  if [ -n "$VIDEO_FILE" ]; then
    VIDEOS+=("$i:$VIDEO_FILE")
    echo "  Segment $i: $VIDEO_FILE"
  else
    echo "  Segment $i: NOT FOUND (skipping)"
  fi
done

echo ""
echo "==> Merging video + audio for each segment..."
CONCAT_LIST="$FINAL_DIR/concat-list.txt"
> "$CONCAT_LIST"

for entry in "${VIDEOS[@]}"; do
  ID="${entry%%:*}"
  VIDEO="${entry#*:}"
  AUDIO="$AUDIO_DIR/${ID}-narration.mp3"
  OUTPUT="$SEGMENTS_DIR/${ID}-segment.webm"

  if [ ! -f "$AUDIO" ]; then
    echo "  No audio for segment $ID, using video only"
    cp "$VIDEO" "$OUTPUT"
  else
    echo "  Merging segment $ID..."
    # Get video duration
    VID_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$VIDEO" 2>/dev/null || echo "30")
    AUD_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$AUDIO" 2>/dev/null || echo "30")

    # Use the longer duration as target
    # Overlay audio on video, pad video if audio is longer
    ffmpeg -y -i "$VIDEO" -i "$AUDIO" \
      -c:v libvpx -crf 20 -b:v 1M \
      -c:a libopus -b:a 128k \
      -shortest \
      -map 0:v:0 -map 1:a:0 \
      "$OUTPUT" 2>/dev/null || {
        echo "    ffmpeg merge failed for $ID, using video only"
        cp "$VIDEO" "$OUTPUT"
      }
  fi

  echo "file '$OUTPUT'" >> "$CONCAT_LIST"
done

echo ""
echo "==> Combining all segments into final video..."
ffmpeg -y -f concat -safe 0 -i "$CONCAT_LIST" \
  -c:v libvpx -crf 20 -b:v 1M \
  -c:a libopus -b:a 128k \
  "$FINAL_DIR/SocialHub-Product-Training.webm" 2>/dev/null || {
    echo "Re-encode concat failed, trying copy..."
    ffmpeg -y -f concat -safe 0 -i "$CONCAT_LIST" -c copy \
      "$FINAL_DIR/SocialHub-Product-Training.webm" 2>/dev/null
  }

echo ""
echo "==> Product training video complete!"
echo "    Output: $FINAL_DIR/SocialHub-Product-Training.webm"
ls -lh "$FINAL_DIR/SocialHub-Product-Training.webm"
