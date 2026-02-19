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
<html>
<head>
<meta charset="utf-8">
<title>Redirecting...</title>
<script>
  // More robust redirect for Safari/iPad
  var path = window.location.pathname;
  if (!path.endsWith('/')) path += '/';
  
  // Prevent infinite loop if we are already at /dashboard/ or subpath
  if (path.indexOf('/dashboard/') > -1) {
    console.warn('Redirect loop detected/prevented: Already at ' + path);
  } else {
    window.location.replace(path + "dashboard/" + window.location.search + window.location.hash);
  }
</script>
<noscript>
  <meta http-equiv="refresh" content="0; url=./dashboard/">
</noscript>
</head>
<body>
<p>Redirecting to <a href="./dashboard/">dashboard</a>...</p>
</body>
</html>`;

console.log('Creating redirect index.html...');
fs.writeFileSync(path.join(distDir, 'index.html'), redirectHtml);

console.log('Post-build script completed successfully.');
