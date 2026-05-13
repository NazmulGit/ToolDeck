// Single-binary entry point. `bun build --compile` bundles this into
// tooldeck.exe. It boots the regular server (which now also serves the
// embedded UI bundle) and then launches the user's browser.
//
// Env knobs:
//   PORT, HOST           — override the bind address (defaults match dev)
//   TOOLDECK_NO_OPEN=1   — skip auto-opening the browser (useful for tests)

import { spawn } from 'node:child_process';

process.env.PORT = process.env.PORT || '4317';
process.env.HOST = process.env.HOST || '127.0.0.1';

await import('./index.js');

const url = `http://${process.env.HOST}:${process.env.PORT}/`;
const skipOpen = process.env.TOOLDECK_NO_OPEN === '1';

if (skipOpen) {
  console.log(`[tooldeck.exe] running at ${url} (auto-open disabled)`);
} else {
  console.log(`[tooldeck.exe] opening ${url} …`);
  setTimeout(() => {
    try {
      if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      } else if (process.platform === 'darwin') {
        spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
      }
    } catch (err) {
      console.warn('[tooldeck.exe] could not auto-open browser:', err);
      console.warn('[tooldeck.exe] open the URL above manually.');
    }
  }, 700);
}
