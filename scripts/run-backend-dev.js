#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');

function hasCargoWatch() {
  const res = spawnSync('cargo', ['watch', '--version'], { stdio: 'ignore' });
  return res.status === 0;
}

function main() {
  const args = process.argv.slice(2);
  const qaMode = args.includes('--qa');
  const printOnly = args.includes('--print');

  // Default dev envs if not already set by the caller (pnpm scripts export these)
  process.env.DISABLE_WORKTREE_ORPHAN_CLEANUP =
    process.env.DISABLE_WORKTREE_ORPHAN_CLEANUP || '1';
  process.env.RUST_LOG = process.env.RUST_LOG || 'debug';

  const useWatch = hasCargoWatch();

  const cargoArgs = useWatch
    ? [
        'watch',
        '-w',
        'crates',
        '-x',
        `run --bin server${qaMode ? ' --features qa-mode' : ''}`,
      ]
    : [
        'run',
        '--bin',
        'server',
        ...(qaMode ? ['--features', 'qa-mode'] : []),
      ];

  if (printOnly) {
    console.log(`cargo ${cargoArgs.join(' ')}`);
    console.log(useWatch ? '(using cargo-watch)' : '(cargo-watch not found; running without watch)');
    return;
  }

  const child = spawn('cargo', cargoArgs, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => process.exit(code ?? 1));
  child.on('error', () => process.exit(1));
}

main();

