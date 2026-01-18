#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Building backend executable for Tauri...\n');

const backendDir = path.resolve(__dirname, '../../backend');
const buildScript = path.join(backendDir, 'build-executable.sh');

// Check if backend directory exists
if (!fs.existsSync(backendDir)) {
  console.error('❌ Backend directory not found at:', backendDir);
  process.exit(1);
}

// Check if build script exists
if (!fs.existsSync(buildScript)) {
  console.error('❌ Build script not found at:', buildScript);
  process.exit(1);
}

try {
  // Execute the build script
  execSync(`bash "${buildScript}"`, {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('\n✅ Backend build completed successfully!');
} catch (error) {
  console.error('\n❌ Backend build failed!');
  process.exit(1);
}
