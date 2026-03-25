import { execSync } from "child_process"
import { readdirSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { join, resolve } from "path"

// Find all webm video files from Playwright test artifacts
const artifactDir = resolve("results/artifacts")
const outputDir = resolve("results")

if (!existsSync(artifactDir)) {
  console.log("No artifacts directory found. Run tests first.")
  process.exit(1)
}

function findVideos(dir) {
  const videos = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        videos.push(...findVideos(fullPath))
      } else if (entry.name.endsWith(".webm")) {
        videos.push(fullPath)
      }
    }
  } catch (e) {}
  return videos
}

const videos = findVideos(artifactDir).sort()

if (videos.length === 0) {
  console.log("No video files found in", artifactDir)
  process.exit(1)
}

console.log(`Found ${videos.length} video files:`)
videos.forEach((v, i) => console.log(`  ${i + 1}. ${v}`))

// Create ffmpeg concat file
const concatFile = join(outputDir, "concat-list.txt")
const concatContent = videos.map((v) => `file '${v}'`).join("\n")
writeFileSync(concatFile, concatContent)

const outputFile = join(outputDir, "combined-test-recording.webm")

try {
  console.log("\nCombining videos with ffmpeg...")
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputFile}"`,
    { stdio: "inherit" }
  )
  console.log(`\nCombined video saved to: ${outputFile}`)
} catch (e) {
  console.log("\nffmpeg concat failed, trying re-encode approach...")
  try {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libvpx-vp9 -crf 30 -b:v 0 "${outputFile}"`,
      { stdio: "inherit" }
    )
    console.log(`\nCombined video saved to: ${outputFile}`)
  } catch (e2) {
    console.error("Failed to combine videos. Ensure ffmpeg is installed.")
    console.log("Individual videos are available in:", artifactDir)
    process.exit(1)
  }
}
