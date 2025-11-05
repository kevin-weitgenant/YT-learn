const fs = require("fs")
const path = require("path")

const fixManifest = () => {
  const prodDir = path.join(__dirname, "../build/chrome-mv3-prod")
  const devDir = path.join(__dirname, "../build/chrome-mv3-dev")

  let targetDir

  if (fs.existsSync(prodDir)) {
    targetDir = prodDir
    console.log("✓ Production build detected")
  } else if (fs.existsSync(devDir)) {
    targetDir = devDir
    console.log("✓ Development build detected")
  } else {
    console.error("Error: No build directory found.")
    return
  }

  const manifestFile = path.join(targetDir, "manifest.json")

  try {
    // Read the manifest file
    const content = fs.readFileSync(manifestFile, "utf8")
    const manifest = JSON.parse(content)

    // Remove the side_panel field entirely
    if (manifest.side_panel) {
      delete manifest.side_panel
      console.log("✓ Removed side_panel from manifest.json")
    }

    // Write the modified manifest back
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), "utf8")
  } catch (error) {
    console.error(`Error processing manifest ${manifestFile}:`, error)
  }
}

module.exports = fixManifest

// Allow running directly
if (require.main === module) {
  fixManifest()
}

