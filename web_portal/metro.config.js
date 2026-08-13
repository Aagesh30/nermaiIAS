const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const os = require('os');

const config = getDefaultConfig(__dirname);

// ─── 1. Persistent Filesystem Cache ─────────────────────────────────────────
// Store compiled module cache on disk so page reloads read from disk instead
// of recompiling all 2,500+ modules from scratch every time.
config.cacheVersion = '1.0';
config.cacheStores = [
  new FileStore({
    // Store cache in a dedicated folder inside .expo
    root: path.join(__dirname, '.expo', '.metro-cache'),
  }),
];

// ─── 2. Increase Max Workers ─────────────────────────────────────────────────
// Use more CPU cores to parallelize compilation during startup.
config.maxWorkers = Math.max(os.cpus().length - 1, 2);

// ─── 3. Disable Lazy Bundling ─────────────────────────────────────────────────
// Compile all routes upfront at startup so first-visit page loads are instant.
if (config.transformer) {
  config.transformer.lazy = false;
} else {
  config.transformer = { lazy: false };
}

module.exports = config;
