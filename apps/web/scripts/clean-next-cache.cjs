const fs = require('fs');
const net = require('net');
const path = require('path');

const root = process.cwd();
const force = process.argv.includes('--force');

function assertInsideRoot(target) {
  const resolved = path.resolve(root, target);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to remove outside project root: ${resolved}`);
  }
  return resolved;
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.setTimeout(700, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function readLock(targetPath) {
  const lockPath = path.join(targetPath, '.cryptodrive-dev.lock');
  if (!fs.existsSync(lockPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

function getTargetNames() {
  const names = new Set(['.next']);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && /^\.next-dev(?:-\d+)?$/.test(entry.name)) {
      names.add(entry.name);
    }
  }
  return [...names];
}

async function main() {
  const targets = getTargetNames();
  const blocked = [];

  for (const target of targets) {
    const resolved = assertInsideRoot(target);
    if (!fs.existsSync(resolved)) continue;

    const lock = readLock(resolved);
    if (!force && lock?.pid && isProcessAlive(lock.pid)) {
      blocked.push(`${target} is in use by dev process ${lock.pid}`);
      continue;
    }

    const portMatch = target.match(/^\.next-dev-(\d+)$/);
    if (!force && portMatch && (await isPortOpen(Number(portMatch[1])))) {
      blocked.push(`${target} appears active on port ${portMatch[1]}`);
    }
  }

  if (blocked.length > 0) {
    throw new Error(
      [
        'Refusing to delete an active Next.js dev cache.',
        ...blocked.map((message) => `- ${message}`),
        'Stop the frontend dev server first, or run: npm.cmd run clean -- --force',
      ].join('\n'),
    );
  }

  for (const target of targets) {
    const resolved = assertInsideRoot(target);
    fs.rmSync(resolved, { recursive: true, force: true });
    console.log(`Removed ${target}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
