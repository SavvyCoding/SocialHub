FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Install ffmpeg and Python for TTS
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Install edge-tts in a venv
RUN python3 -m venv /opt/tts && \
    /opt/tts/bin/pip install edge-tts
ENV PATH="/opt/tts/bin:$PATH"

WORKDIR /app

# Install Playwright dependencies
COPY package.json ./
RUN npm install

# Copy config and scripts
COPY playwright.config.ts ./
COPY demos/ ./demos/
COPY scripts/ ./scripts/

RUN chmod +x scripts/combine-with-audio.sh
RUN mkdir -p output/raw-videos output/audio output/segments

CMD ["bash", "-c", "npx playwright test && python3 scripts/generate-audio.py && bash scripts/combine-with-audio.sh"]
