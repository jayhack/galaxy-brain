#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const liveServerCli = path.join(root, 'node_modules', 'live-server', 'live-server.js');

const child = spawn(process.execPath, [liveServerCli, 'docs', '--port=8080'], {
  cwd: root,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
