import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const dashboardDir = path.join(distDir, 'dashboard');
const appsSrcDir = path.join(dashboardDir, 'apps');
const appsDestDir = path.join(distDir, 'apps');
const thumbsSrcDir = path.join(dashboardDir, 'app-thumbnails');
const thumbsDestDir = path.join(distDir, 'app-thumbnails');

console.log('Starting post-build script...');

if (!fs.existsSync(dashboardDir)) {
  console.error('Error: dist/dashboard does not exist. Build failed?');
  process.exit(1);
}

// Ensure apps destination directory exists (or parent)
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Move apps from dist/dashboard/apps to dist/apps
if (fs.existsSync(appsSrcDir)) {
  console.log(`Moving apps from ${appsSrcDir} to ${appsDestDir}...`);
  // fs.renameSync handles directory moves on same filesystem
  // If destination exists, we might need to remove it first or merge.
  // Since we use emptyOutDir: true for dashboard, dist/apps might be stale if we don't clean dist.
  // But vite only cleans dist/dashboard.
  // So we should probably clean dist/apps if it exists.

  if (fs.existsSync(appsDestDir)) {
    console.log('Cleaning existing dist/apps...');
    fs.rmSync(appsDestDir, { recursive: true, force: true });
  }

  fs.renameSync(appsSrcDir, appsDestDir);
} else {
  console.log('Warning: apps directory not found in dashboard dist. (Did you put apps in public?)');
}

// Move thumbnails from dist/dashboard/app-thumbnails to dist/app-thumbnails
if (fs.existsSync(thumbsSrcDir)) {
  console.log(`Moving thumbnails from ${thumbsSrcDir} to ${thumbsDestDir}...`);
  if (fs.existsSync(thumbsDestDir)) {
    console.log('Cleaning existing dist/app-thumbnails...');
    fs.rmSync(thumbsDestDir, { recursive: true, force: true });
  }
  fs.renameSync(thumbsSrcDir, thumbsDestDir);
} else {
  console.log('Warning: app-thumbnails directory not found in dashboard dist.');
}

// Create redirect index.html at root dist
const redirectHtml = `<!DOCTYPE html>
<style>
  body { font-family: system-ui, sans-serif; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .container { text-align: center; padding: 20px; }
  a { color: #22d3ee; }
  button { margin-top: 20px; padding: 10px 20px; background: #22d3ee; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
  button:hover { background: #06b6d4; }
</style>
<script>
  // Helper to repair the app state
  async function repairApp() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
          console.log('Unregistered SW:', registration);
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
        console.log('Cleared caches');
      }
      // Force reload to dashboard
      window.location.href = '/Numo-Mathetrainer/dashboard/?t=' + Date.now();
    } catch (e) {
      alert('Error during repair: ' + e);
    }
  }

  // Logic to handle direction or error detection
  var path = window.location.pathname;
  if (!path.endsWith('/')) path += '/';
  
  // ERROR DETECTED: This file (root redirector) is being served at /dashboard/
  if (path.indexOf('/dashboard/') > -1) {
    console.warn('Redirect loop detected/prevented: Already at ' + path);
    // Wait for DOM
    window.onload = function() {
        document.getElementById('status').innerText = 'App-Cache Fehler erkannt';
        document.getElementById('msg').innerText = 'Dein Gerät hat eine alte oder falsche Version der App gespeichert. Bitte klicke auf "Reparieren", um das Problem zu lösen.';
        document.getElementById('repair-btn').style.display = 'inline-block';
        document.getElementById('manual-link').style.display = 'none';
    };
  } else {
    // Normal redirect
    window.location.replace(path + "dashboard/" + window.location.search + window.location.hash);
  }
</script>
<noscript>
  <meta http-equiv="refresh" content="0; url=/Numo-Mathetrainer/dashboard/">
</noscript>
</head>
<body>
<div class="container">
  <h1 id="status">Lade Dashboard...</h1>
  <p id="msg">Du wirst weitergeleitet.</p>
  <p id="manual-link">Falls nichts passiert: <a href="/Numo-Mathetrainer/dashboard/">Hier klicken</a></p>
  <button id="repair-btn" onclick="repairApp()" style="display:none">App Reparieren</button>
</div>
</body>
</html>`;

console.log('Creating redirect index.html...');
fs.writeFileSync(path.join(distDir, 'index.html'), redirectHtml);

console.log('Post-build script completed successfully.');
