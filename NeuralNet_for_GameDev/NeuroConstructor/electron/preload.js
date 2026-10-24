const { contextBridge, ipcRenderer } = require('electron');

// Безопасный API для Renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // Plugin Manager
  registerPlugin: (plugin) => ipcRenderer.invoke('plugin:register', plugin),
  reloadPlugin: (pluginPath) => ipcRenderer.invoke('plugin:reload', pluginPath),
  listPlugins: () => ipcRenderer.invoke('plugin:list'),

  // File System (безопасный доступ к plugins/)
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),

  // Process Management
  startProcess: (command, args, cwd) => ipcRenderer.invoke('process:start', command, args, cwd),
  stopProcess: (pid) => ipcRenderer.invoke('process:stop', pid),

  // API Calls (к Python бэкенду)
  apiCall: (endpoint, data) => ipcRenderer.invoke('api:call', endpoint, data),

  // Event Listeners (от Main Process)
  onPluginUpdate: (callback) => {
    ipcRenderer.on('plugin:update', (event, data) => callback(data));
  },
  onLogMessage: (callback) => {
    ipcRenderer.on('log-message', (event, data) => callback(data));
  },
});
