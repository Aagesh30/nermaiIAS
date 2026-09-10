const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
const fontsSrcDir = path.resolve(distDir, 'assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts');
const fontsDestDir = path.resolve(distDir, 'assets/fonts');

console.log('--- Copying Expo Vector Fonts out of node_modules ---');

if (fs.existsSync(fontsSrcDir)) {
  if (!fs.existsSync(fontsDestDir)) {
    fs.mkdirSync(fontsDestDir, { recursive: true });
  }

  const files = fs.readdirSync(fontsSrcDir);
  files.forEach(file => {
    const srcPath = path.join(fontsSrcDir, file);
    const destPath = path.join(fontsDestDir, file);
    fs.copyFileSync(srcPath, destPath);

    // Also create unhashed copy if it's hashed (e.g. Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf -> Ionicons.ttf)
    const match = file.match(/^([A-Za-z0-9_]+)\.[a-f0-9]{32}\.ttf$/i);
    if (match) {
      const baseName = match[1] + '.ttf';
      const unhashedDestPath = path.join(fontsDestDir, baseName);
      fs.copyFileSync(srcPath, unhashedDestPath);
    }
  });
  console.log(`Successfully copied ${files.length} font files to dist/assets/fonts`);
} else {
  console.log('Fonts directory not found in dist:', fontsSrcDir);
}

// Helper to recursively rewrite path strings in text files
function rewriteFontPathsInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteFontPathsInDir(fullPath);
    } else if (entry.isFile() && /\.(js|html|css|json)$/i.test(entry.name)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const targetPath = 'assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts';
      if (content.includes(targetPath)) {
        content = content.replaceAll(targetPath, 'assets/fonts');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Rewrote font asset paths in: ${path.relative(distDir, fullPath)}`);
      }
    }
  });
}

if (fs.existsSync(distDir)) {
  rewriteFontPathsInDir(distDir);
}

console.log('--- Font processing completed ---');
