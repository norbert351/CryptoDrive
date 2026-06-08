const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const nextCli = require.resolve('next/dist/bin/next');
const root = process.cwd();
const args = process.argv.slice(2);

function parsePort() {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if ((arg === '--port' || arg === '-p') && args[index + 1]) {
      return Number(args[index + 1]);
    }
    if (arg.startsWith('--port=')) {
      return Number(arg.slice('--port='.length));
    }
    if (arg.startsWith('-p=')) {
      return Number(arg.slice('-p='.length));
    }
  }

  return Number(process.env.PORT || 3000);
}

function assertInsideRoot(target) {
  const resolved = path.resolve(root, target);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to use path outside project root: ${resolved}`);
  }
  return resolved;
}

function canBindPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      console.error(`Failed to check port ${port}:`, error.message);
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function main() {
  const port = parsePort();
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid Next dev port: ${port}`);
  }

  const distDir = process.env.NEXT_DIST_DIR || `.next-dev-${port}`;
  const resolvedDistDir = assertInsideRoot(distDir);
  const portAvailable = await canBindPort(port);

  if (!portAvailable) {
    console.error(
      `Port ${port} is already in use. Stop the existing frontend dev server before restarting.`,
    );
    process.exit(1);
  }

  fs.rmSync(resolvedDistDir, { recursive: true, force: true });
  fs.mkdirSync(resolvedDistDir, { recursive: true });

  const lockPath = path.join(resolvedDistDir, '.cryptodrive-dev.lock');
  fs.writeFileSync(
    lockPath,
    JSON.stringify(
      {
        pid: process.pid,
        port,
        distDir,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  const child = spawn(process.execPath, [nextCli, 'dev', ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      NEXT_DIST_DIR: distDir,
    },
  });

  const cleanup = () => {
    fs.rmSync(lockPath, { force: true });
  };

  child.on('error', (error) => {
    cleanup();
    console.error('Failed to start isolated Next dev server:', error);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    cleanup();
    if (signal) {
      process.exit(0);
      return;
    }
    process.exit(code ?? 0);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
