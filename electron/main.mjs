import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Keep these defaults for security; enable if you need nodeIntegration
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || null;

  if (startUrl) {
    // Dev: load Vite dev server
    win.loadURL(startUrl).catch((err) => {
      console.error('Failed to load start URL:', err);
    });
    // Optionally open devtools in dev
    try {
      win.webContents.openDevTools({ mode: 'undocked' });
    } catch (e) {
      // ignore
    }
  } else {
    // Prod: load built index.html from dist
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexPath).catch((err) => {
      console.error('Failed to load index.html:', err);
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Basic uncaught exception reporting
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in main process:', err);
});

