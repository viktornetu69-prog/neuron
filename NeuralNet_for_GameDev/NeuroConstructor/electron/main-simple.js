const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  console.log('Creating window...');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload-simple.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the Vite dev server
  win.loadURL('http://localhost:3000');
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
