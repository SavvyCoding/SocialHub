FROM mcr.microsoft.com/playwright:v1.52.0-noble

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /tests

COPY package.json ./
RUN npm install

COPY playwright.config.ts ./
COPY tests/ ./tests/
COPY scripts/ ./scripts/

RUN mkdir -p results/screenshots results/artifacts results/html

CMD ["npx", "playwright", "test"]
