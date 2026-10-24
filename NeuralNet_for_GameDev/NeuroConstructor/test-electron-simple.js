const { exec } = require('child_process');
const path = require('path');

const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron.cmd');
const appPath = __dirname;
const mainFile = path.join(appPath, 'electron', 'main-simple.js');

console.log('Starting Electron with simplified main.js...');
console.log('Electron path:', electronPath);
console.log('Main file:', mainFile);

const electronApp = exec(`"${electronPath}" "${mainFile}"`);

electronApp.stdout.on('data', (data) => {
  console.log(`Electron stdout: ${data}`);
});

electronApp.stderr.on('data', (data) => {
  console.error(`Electron stderr: ${data}`);
});

electronApp.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
});
