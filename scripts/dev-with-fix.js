const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("🚀 Starting Nano Tutor development server...\n")

// Function to fix the manifest
const fixManifest = (manifestPath) => {
  try {
    if (!fs.existsSync(manifestPath)) {
      return
    }

    const content = fs.readFileSync(manifestPath, "utf8")
    const manifest = JSON.parse(content)

    // Remove the side_panel field if it exists
    if (manifest.side_panel) {
      delete manifest.side_panel
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8")
      console.log("✓ Removed side_panel from manifest.json")
    }
  } catch (error) {
    // Ignore errors during dev (file might be mid-write or being rebuilt)
  }
}

// Start the Plasmo dev server
const devProcess = spawn("pnpm", ["with-env", "plasmo", "dev"], {
  stdio: "inherit",
  shell: true,
  cwd: path.join(__dirname, "..")
})

// Setup manifest watching
const manifestPath = path.join(__dirname, "../build/chrome-mv3-dev/manifest.json")
const manifestDir = path.dirname(manifestPath)
let watcher = null
let buildDirCheck = null

// Wait for build directory to be created, then watch the manifest
buildDirCheck = setInterval(() => {
  if (fs.existsSync(manifestDir)) {
    clearInterval(buildDirCheck)
    buildDirCheck = null

    console.log("📁 Watching for manifest changes...\n")

    // Watch the build directory for manifest changes
    watcher = fs.watch(manifestDir, (eventType, filename) => {
      if (filename === "manifest.json") {
        // Small delay to ensure file write is complete
        setTimeout(() => fixManifest(manifestPath), 100)
      }
    })

    // Fix immediately if manifest already exists
    if (fs.existsSync(manifestPath)) {
      setTimeout(() => fixManifest(manifestPath), 100)
    }
  }
}, 500)

// Handle process exit
devProcess.on("exit", (code) => {
  if (buildDirCheck) clearInterval(buildDirCheck)
  if (watcher) watcher.close()

  if (code !== 0) {
    console.error(`\n❌ Dev server exited with code ${code}`)
  }
  process.exit(code)
})

// Handle errors
devProcess.on("error", (error) => {
  if (buildDirCheck) clearInterval(buildDirCheck)
  if (watcher) watcher.close()

  console.error("❌ Failed to start dev server:", error)
  process.exit(1)
})

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n\n🛑 Stopping dev server...")

  if (buildDirCheck) clearInterval(buildDirCheck)
  if (watcher) watcher.close()

  devProcess.kill("SIGINT")
})

process.on("SIGTERM", () => {
  if (buildDirCheck) clearInterval(buildDirCheck)
  if (watcher) watcher.close()

  devProcess.kill("SIGTERM")
  process.exit(0)
})
