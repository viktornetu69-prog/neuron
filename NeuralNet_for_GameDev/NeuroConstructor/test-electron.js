// Simple test script to verify Electron works
const { exec } = require('child_process');
const path = require('path');

const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron.cmd');
const appPath = __dirname;

console.log('Starting Electron...');
console.log('Electron path:', electronPath);
console.log('App path:', appPath);

const electronApp = exec(`"${electronPath}" "${appPath}"`);

electronApp.stdout.on('data', (data) => {
  console.log(`Electron stdout: ${data}`);
});

electronApp.stderr.on('data', (data) => {
  console.error(`Electron stderr: ${data}`);
});

electronApp.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
});
