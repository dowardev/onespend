Electron usage and build instructions

This document explains how to run the Electron app in development and how to create production builds using the Electron configuration that was added to package.json.

Prerequisites
- Node.js 18+
- pnpm or npm/yarn (commands below use pnpm but npm is equivalent: replace pnpm with npm run)
- If you build Windows installers on Linux (Fedora): wine, nsis (makensis), mono-devel and optionally wine.i686

Install dependencies
- pnpm install

Development
- Dev with Vite (port 5173) + Electron:
  pnpm run electron:dev
  This runs Vite and then launches Electron pointing at http://localhost:5173.

- Attach to Ionic dev server (port 8100):
  Start Ionic in a separate terminal: pnpm start (or ionic s)
  Then run:
  pnpm run electron:attach-ionic
  Or run both together:
  pnpm run electron:dev-ionic

Production builds
- Build icons (from public/PuntoClick.png) and production build + electron-builder:
  pnpm run electron:build
  This will run the icons generator, run the frontend build, and then electron-builder to create installers in the output directory.

Notes for cross-platform builds
- Linux AppImage (default target) is supported.
- To produce Windows NSIS installers from a Linux machine (Fedora) you can install wine and makensis.
- The package.json includes a "build" configuration for electron-builder with targets for Linux (AppImage, rpm) and Windows (nsis). Adjust those targets in package.json if you need other formats.

Troubleshooting
- If Electron binary download fails when using pnpm, run:
  pnpm approve-builds electron
  pnpm rebuild electron

- If icons are missing, ensure public/PuntoClick.png exists and then run:
  pnpm run icons

- If you run into Windows cross-build issues, verify toolchain versions:
  wine --version
  makensis -VERSION
  mono --version

Files changed
- package.json: added electron scripts and devDependencies + electron-builder "build" configuration.

This file was created to document how to run and build the desktop Electron application for this project.

