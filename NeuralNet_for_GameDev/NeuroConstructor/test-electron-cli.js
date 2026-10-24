const { spawn } = require('child_process');
const path = require('path');

const electronPath = path.join(__dirname, 'node_modules', 'electron', 'cli.js');
const appPath = __dirname;
const mainFile = path.join(appPath, 'electron', 'main-simple.js');

console.log('Starting Electron via cli.js...');
console.log('Electron cli path:', electronPath);
console.log('Main file:', mainFile);

const electronApp = spawn('node', [electronPath, mainFile], {
  stdio: 'inherit',
});

electronApp.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
});
