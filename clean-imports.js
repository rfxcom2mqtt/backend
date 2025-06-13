#!/usr/bin/env node

/**
 * Script to clean up imports in TypeScript files
 * This script runs ESLint with the --fix option to automatically fix import issues
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const srcDir = path.join(__dirname, 'src');
const fileExtensions = ['.ts', '.tsx'];
const excludeDirs = ['node_modules', 'dist'];

console.log('🧹 Starting import cleanup...');

try {
  // Run ESLint with --fix option on all TypeScript files
  console.log('Running ESLint to fix imports...');
  
  // Use the flat config format with ESLint
  const eslintCommand = 'npx eslint --fix "src/**/*.{ts,tsx}" --config eslint.config.js';
  console.log(`Executing: ${eslintCommand}`);
  
  const output = execSync(eslintCommand, { encoding: 'utf8' });
  console.log(output || '✅ ESLint completed successfully');
  
  console.log('🎉 Import cleanup completed successfully!');
} catch (error) {
  console.error('❌ Error during import cleanup:');
  console.error(error.message);
  
  // Still show the stdout which contains useful information about what was fixed
  if (error.stdout) {
    console.log('\nESLint output:');
    console.log(error.stdout);
  }
  
  process.exit(1);
}
