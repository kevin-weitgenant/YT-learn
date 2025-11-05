#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Running postinstall script...');

// Function to safely read and write file with replacements
function replaceInFile(filePath, searchValue, replaceValue) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: File not found - ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(searchValue, replaceValue);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// 1. Remove dist files from @huggingface/transformers
console.log('\n1. Removing dist files from @huggingface/transformers...');
const distPath = path.join(__dirname, '../node_modules/@huggingface/transformers/dist');
if (fs.existsSync(distPath)) {
  try {
    const files = fs.readdirSync(distPath);
    const filesToRemove = files.filter(file => 
      file.endsWith('.js') || 
      file.endsWith('.cjs') || 
      file.endsWith('.mjs') || 
      file.endsWith('.map')
    );
    
    filesToRemove.forEach(file => {
      const filePath = path.join(distPath, file);
      fs.unlinkSync(filePath);
      console.log(`✓ Removed: ${file}`);
    });
    
    if (filesToRemove.length === 0) {
      console.log('  No files to remove');
    }
  } catch (error) {
    console.error('Error removing dist files:', error.message);
  }
} else {
  console.log('  Dist directory not found (skipping)');
}

// 2. Patch package.json exports to use src instead of dist
console.log('\n2. Patching transformers package.json exports...');
const pkgJsonPath = path.join(__dirname, '../node_modules/@huggingface/transformers/package.json');
try {
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  // Update exports to point to src files instead of dist
  if (pkgJson.exports) {
    pkgJson.exports = {
      "node": {
        "import": {
          "types": "./types/transformers.d.ts",
          "default": "./src/transformers.js"
        },
        "require": {
          "types": "./types/transformers.d.ts",
          "default": "./src/transformers.js"
        }
      },
      "default": {
        "types": "./types/transformers.d.ts",
        "default": "./src/transformers.js"
      }
    };

    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2), 'utf8');
    console.log(`✓ Updated: ${pkgJsonPath}`);
  }
} catch (error) {
  console.error(`Error patching package.json:`, error.message);
}

// 3. Patch env.js to set IS_BROWSER_ENV = true
console.log('\n3. Patching transformers env.js...');
const envJsPath = path.join(__dirname, '../node_modules/@huggingface/transformers/src/env.js');
try {
  const content = fs.readFileSync(envJsPath, 'utf8');

  // Only patch if not already patched (check for the specific patched line)
  if (!content.includes('const IS_BROWSER_ENV = true;')) {
    replaceInFile(
      envJsPath,
      /^const IS_BROWSER_ENV = typeof window.*$/m,
      '// const IS_BROWSER_ENV = typeof window !== "undefined" && typeof window.document !== "undefined";\nconst IS_BROWSER_ENV = true;'
    );
  } else {
    console.log('  Already patched (skipping)');
  }
} catch (error) {
  console.error('Error checking env.js:', error.message);
}

// 4. Remove MathJax CDN URLs from better-react-mathjax
console.log('\n4. Removing MathJax CDN URLs...');
const mathJaxFiles = [
  'node_modules/better-react-mathjax/MathJaxContext/MathJaxContext.js',
  'node_modules/better-react-mathjax/esm/MathJaxContext/MathJaxContext.js'
];

mathJaxFiles.forEach(relativePath => {
  const filePath = path.join(__dirname, '..', relativePath);
  
  // Replace both MathJax CDN URLs
  replaceInFile(
    filePath,
    /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/mathjax\/2\.7\.9\/MathJax\.js\?config=TeX-MML-AM_CHTML/g,
    ''
  );
  
  replaceInFile(
    filePath,
    /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/mathjax\/3\.2\.2\/es5\/tex-mml-chtml\.js/g,
    ''
  );
});

console.log('\n✓ Postinstall script completed successfully!');

