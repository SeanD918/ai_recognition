const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const service = process.argv[2];

if (!service) {
  console.error('Please specify a service (gender-ai, animal-ai, flower-ai, hand-ai)');
  process.exit(1);
}

const services = {
  'gender-ai': { dir: 'ai_models/gender-ai', port: '8000' },
  'animal-ai': { dir: 'ai_models/animal-ai', port: '8001' },
  'flower-ai': { dir: 'ai_models/flower-ai', port: '8002' },
  'hand-ai': { dir: 'ai_models/hand-ai', port: '8003' },
};

const config = services[service];
if (!config) {
  console.error(`Unknown service: ${service}`);
  process.exit(1);
}

const rootDir = path.resolve(__dirname);
const serviceDir = path.join(rootDir, config.dir);

// Find the python executable in the virtual environment
const isWindows = process.platform === 'win32';
const venvPython = isWindows
  ? path.join(rootDir, '.venv', 'Scripts', 'python.exe')
  : path.join(rootDir, '.venv', 'bin', 'python');

const pythonExe = fs.existsSync(venvPython) ? venvPython : 'python';

console.log(`🚀 Starting ${service} using ${pythonExe} on port ${config.port}...`);

const child = spawn(
  pythonExe,
  ['-m', 'uvicorn', 'app.api:app', '--host', '0.0.0.0', '--port', config.port, '--reload'],
  {
    cwd: serviceDir,
    stdio: 'inherit',
    shell: true,
  }
);

child.on('error', (err) => {
  console.error(`❌ Failed to start service ${service}:`, err);
});

child.on('close', (code) => {
  console.log(`ℹ️ Service ${service} exited with code ${code}`);
});
