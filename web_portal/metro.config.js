const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const os = require('os');

const config = getDefaultConfig(__dirname);

// ─── 1. Persistent Filesystem Cache ─────────────────────────────────────────
config.cacheVersion = '1.2';
config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, '.expo', '.metro-cache'),
  }),
];

// ─── 2. Increase Max Workers ─────────────────────────────────────────────────
config.maxWorkers = Math.max(os.cpus().length - 1, 2);

// ─── 3. Disable Lazy Bundling ─────────────────────────────────────────────────
if (config.transformer) {
  config.transformer.lazy = false;
} else {
  config.transformer = { lazy: false };
}

// ─── 4. Module Aliases for @nermai/* & lucide-react-native ──────────────────
const extraNodeModules = {
  '@nermai/api': path.resolve(__dirname, 'lms/core/services.ts'),
  '@nermai/theme': path.resolve(__dirname, 'lms/core/theme.ts'),
  '@nermai/shared': path.resolve(__dirname, 'lms/core/shared/src/index.ts'),
  '@nermai/live-core': path.resolve(__dirname, 'lms/core/live-core/src/index.ts'),
  'lucide-react-native': path.resolve(__dirname, 'node_modules/lucide-react'),
};

config.resolver.extraNodeModules = extraNodeModules;

// ─── 5. Web-only package stubs for native Android/iOS builds ─────────────────
// These packages use browser APIs (window, document, IndexedDB) and must be
// stubbed out on native platforms to prevent Gradle compilation failures.
const WEB_ONLY_PACKAGES = [
  '@zoom/meetingsdk',
  'framer-motion',
  'react-pdf',
  'idb-keyval',
  'lucide-react',
  'react-router-dom',
  'tailwindcss',
  'autoprefixer',
  'postcss',
  'pdfjs-dist',
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lucide-react-native') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/lucide-react/dist/cjs/lucide-react.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === '@nermai/api' || moduleName.startsWith('@nermai/api/')) {
    return {
      filePath: path.resolve(__dirname, 'lms/core/services.ts'),
      type: 'sourceFile',
    };
  }
  if (moduleName === '@nermai/theme' || moduleName.startsWith('@nermai/theme/')) {
    return {
      filePath: path.resolve(__dirname, 'lms/core/theme.ts'),
      type: 'sourceFile',
    };
  }
  if (moduleName === '@nermai/shared') {
    return {
      filePath: path.resolve(__dirname, 'lms/core/shared/src/index.ts'),
      type: 'sourceFile',
    };
  }
  if (moduleName.startsWith('@nermai/shared/')) {
    const sub = moduleName.replace(/^@nermai\/shared\//, '');
    const target = path.resolve(__dirname, 'lms/core/shared', sub);
    return (originalResolveRequest || context.resolveRequest)(context, target, platform);
  }
  if (moduleName === '@nermai/live-core') {
    return {
      filePath: path.resolve(__dirname, 'lms/core/live-core/src/index.ts'),
      type: 'sourceFile',
    };
  }
  if (moduleName.startsWith('@nermai/live-core/')) {
    const sub = moduleName.replace(/^@nermai\/live-core\//, '');
    const target = path.resolve(__dirname, 'lms/core/live-core', sub);
    return (originalResolveRequest || context.resolveRequest)(context, target, platform);
  }

  // Stub web-only packages on native platforms to prevent Gradle build failures
  if (platform === 'android' || platform === 'ios') {
    const isWebOnly = WEB_ONLY_PACKAGES.some(
      (pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/')
    );
    if (isWebOnly) {
      return {
        filePath: path.resolve(__dirname, 'lms/stubs/web-only-stub.js'),
        type: 'sourceFile',
      };
    }
  }

  return (originalResolveRequest || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
