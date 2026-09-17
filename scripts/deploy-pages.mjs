import { execFileSync } from 'node:child_process';
import { log } from 'node:console';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const release = join(root, 'dist', 'index.html');
const committedRelease = join(root, 'index.html');

const git = (args, options = {}) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    ...options,
  });

const captureGit = (args) => git(args, { capture: true }).trim();

if (!existsSync(release)) {
  throw new Error(
    'dist/index.html is missing. Run the build before deploying.',
  );
}

const branch = captureGit(['branch', '--show-current']);
if (branch !== 'main') {
  throw new Error(
    `Deployments must run from main (currently on ${branch || 'detached HEAD'}).`,
  );
}

if (captureGit(['status', '--porcelain'])) {
  throw new Error('Commit or stash source changes before deploying.');
}

copyFileSync(release, committedRelease);
git(['add', 'index.html']);

try {
  git(['diff', '--cached', '--quiet']);
  log('The downloadable index.html already matches this build.');
} catch {
  git(['commit', '-m', 'Update downloadable build']);
  log('Updated the downloadable index.html on main.');
}

git(['push', 'origin', 'HEAD:main']);
const source = captureGit(['rev-parse', '--short', 'HEAD']);
const worktree = mkdtempSync(join(tmpdir(), 'pitch-tracker-pages-'));
const temporaryBranch = `pages-release-${process.pid}`;

let remoteBranchExists = false;
try {
  git(['ls-remote', '--exit-code', '--heads', 'origin', 'gh-pages'], {
    capture: true,
  });
  remoteBranchExists = true;
} catch {
  // The first deployment creates the branch.
}

try {
  if (remoteBranchExists) {
    git(['fetch', 'origin', 'gh-pages']);
    git(['worktree', 'add', '--detach', worktree, 'origin/gh-pages']);
  } else {
    git(['worktree', 'add', '--detach', worktree, 'HEAD']);
    git(['-C', worktree, 'switch', '--orphan', temporaryBranch]);
  }

  for (const entry of readdirSync(worktree)) {
    if (entry !== '.git')
      rmSync(join(worktree, entry), { recursive: true, force: true });
  }
  copyFileSync(committedRelease, join(worktree, 'index.html'));
  writeFileSync(join(worktree, '.nojekyll'), '');
  git(['-C', worktree, 'add', '--all']);

  try {
    git(['-C', worktree, 'diff', '--cached', '--quiet']);
    log('GitHub Pages already has this build.');
  } catch {
    git(['-C', worktree, 'commit', '-m', `Deploy ${source}`]);
    git(['-C', worktree, 'push', 'origin', 'HEAD:gh-pages']);
    log('Published dist/index.html to the gh-pages branch.');
  }
} finally {
  try {
    git(['worktree', 'remove', '--force', worktree]);
  } finally {
    if (!remoteBranchExists) {
      try {
        git(['branch', '--delete', '--force', temporaryBranch]);
      } catch {
        // Nothing to clean up if branch creation failed before the first commit.
      }
    }
  }
}
