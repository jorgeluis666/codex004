import { spawn } from 'node:child_process';

const commands = [
  ['node', ['server/metricool-proxy.mjs']],
  ['npm.cmd', ['run', 'dev']],
];

const children = commands.map(([command, args]) =>
  spawn(command, args, {
    cwd: process.cwd(),
    shell: false,
    stdio: 'inherit',
  }),
);

function stopAll() {
  children.forEach((child) => {
    if (!child.killed) child.kill();
  });
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});

children.forEach((child) => {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
});
