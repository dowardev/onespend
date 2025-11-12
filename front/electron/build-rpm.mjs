#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

// Script Node que invoca build-rpm.sh desde la raíz del proyecto.
// Uso: node electron/build-rpm.mjs

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..'); // asumiendo carpeta electron/ dentro del repo
const scriptPath = path.resolve(projectRoot, 'build-rpm.sh');

console.log(`Invocando script: ${scriptPath}`);

// Execute the script with bash to avoid permission issues (no need for executable bit)
const child = spawn('bash', [scriptPath], { stdio: 'inherit', cwd: projectRoot });

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`El proceso terminó con la señal: ${signal}`);
    process.exit(1);
  }
  process.exit(code === 0 ? 0 : 1);
});

child.on('error', (err) => {
  console.error('Error al ejecutar el script:', err);
  process.exit(1);
});

