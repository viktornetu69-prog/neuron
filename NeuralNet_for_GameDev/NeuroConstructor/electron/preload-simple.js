const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  test: () => 'Hello from Electron!',
});
