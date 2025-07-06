#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

console.log('🏗️  Building Architectural Space Analyzer for production...');

try {
  // Ensure directories exist
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
  }

  console.log('📦 Installing dependencies...');
  execSync('npm ci --only=production', { stdio: 'inherit' });

  console.log('🔨 Building client...');
  execSync('vite build --outDir dist/client', { stdio: 'inherit' });

  console.log('🔧 Building server...');
  execSync('tsc -p tsconfig.server.json', { stdio: 'inherit' });

  console.log('📋 Copying assets...');
  execSync('cp -r shared dist/', { stdio: 'inherit' });
  execSync('cp package*.json dist/', { stdio: 'inherit' });
  execSync('cp .env dist/ 2>/dev/null || true', { stdio: 'inherit' });

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}