const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const PluginManager = require('./plugin-manager');

let mainWindow;
let pythonProcess;
let pluginManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    titleBarStyle: 'hiddenInset',
  });

  // Загружаем Vite dev server в dev режиме, или сборку в prod
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.show();
}

function startPythonBackend() {
  const backendPath = path.join(__dirname, '..', 'backend', 'main.py');
  const pythonPath = process.env.PYTHON_PATH || 'python';

  pythonProcess = spawn(pythonPath, [backendPath], {
    cwd: path.join(__dirname, '..', 'backend'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }
}

// Инициализация PluginManager
pluginManager = new PluginManager();

// IPC Handlers: Plugin Manager
ipcMain.handle('plugin:register', async (event, plugin) => {
  return pluginManager.registerPlugin(plugin);
});

ipcMain.handle('plugin:reload', async (event, pluginPath) => {
  return pluginManager.reloadPlugin(pluginPath);
});

ipcMain.handle('plugin:list', async () => {
  return pluginManager.getPlugins();
});

// IPC Handlers: File System (безопасный доступ)
ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  const fs = require('fs').promises;
  const basePath = path.join(__dirname, '..', 'backend', 'plugins');
  const fullPath = path.resolve(basePath, filePath);
  
  // Проверка на выход за пределы директории
  if (!fullPath.startsWith(basePath)) {
    throw new Error('Access denied: file outside plugins directory');
  }
  
  await fs.writeFile(fullPath, content);
  return true;
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  const fs = require('fs').promises;
  const basePath = path.join(__dirname, '..', 'backend', 'plugins');
  const fullPath = path.resolve(basePath, filePath);
  
  if (!fullPath.startsWith(basePath)) {
    throw new Error('Access denied: file outside plugins directory');
  }
  
  return await fs.readFile(fullPath, 'utf-8');
});

// IPC Handlers: Process Management
ipcMain.handle('process:start', async (event, command, args = [], cwd = null) => {
  const processPath = cwd || path.join(__dirname, '..');
  const child = spawn(command, args, {
    cwd: processPath,
    stdio: 'inherit',
  });
  
  return { pid: child.pid, success: true };
});

ipcMain.handle('process:stop', async (event, pid) => {
  try {
    process.kill(pid);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handlers: Python Backend Communication
ipcMain.handle('api:call', async (event, endpoint, data = {}) => {
  try {
    const http = require('http');
    const options = {
      hostname: '127.0.0.1',
      port: 8000,
      path: endpoint,
      method: data.method ? data.method : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data.body) {
        req.write(JSON.stringify(data.body));
      }
      req.end();
    });
  } catch (error) {
    throw error;
  }
});

// Опциональный запуск Python бэкенда
// Если бэкенд уже запущен, можно пропустить этот шаг
function shouldStartPythonBackend() {
  // Проверка: если окружение development, предполагаем что бэкенд запущен отдельно
  return process.env.NODE_ENV !== 'development';
}
app.whenReady().then(() => {
  if (shouldStartPythonBackend()) {
    startPythonBackend();
  } else {
    console.log('Development mode: Using existing Python backend');
  }
  createWindow();
});

app.on('window-all-closed', () => {
  stopPythonBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopPythonBackend();
});

module.exports = { createWindow, startPythonBackend, stopPythonBackend };
