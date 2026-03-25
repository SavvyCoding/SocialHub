#!/usr/bin/env python3
"""Generate TTS audio for each narration segment using edge-tts."""

import asyncio
import json
import os
import edge_tts

VOICE = "en-US-AriaNeural"
RATE = "-5%"
OUTPUT_DIR = "/app/output/audio"

async def generate_audio(segment):
    seg_id = segment["id"]
    text = segment["text"]
    output_path = os.path.join(OUTPUT_DIR, f"{seg_id}-narration.mp3")

    print(f"  Generating audio for segment {seg_id}: {segment['title']}")
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(output_path)
    print(f"  Saved: {output_path}")

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open("/app/scripts/narrations.json") as f:
        narrations = json.load(f)

    print(f"Generating {len(narrations)} audio segments with voice: {VOICE}")
    for segment in narrations:
        await generate_audio(segment)
    print("All audio segments generated.")

if __name__ == "__main__":
    asyncio.run(main())
