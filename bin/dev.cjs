#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const httpServerCli = path.join(root, 'node_modules', 'http-server', 'bin', 'http-server');

const child = spawn(process.execPath, [httpServerCli, 'docs', '-p', '8080', '-o'], {
  cwd: root,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
