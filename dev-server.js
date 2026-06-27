#!/usr/bin/env node
/**
 * Live-reload dev server for index.html
 * Uses SSE (Server-Sent Events) — no external dependencies.
 * Usage: node dev-server.js [port]
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = parseInt(process.argv[2] || '3000', 10);
const TARGET  = path.join(__dirname, 'index.html');
const SSE_URL = '/__livereload';

const INJECT = `
<script>
(function(){
  var src = new EventSource('${SSE_URL}');
  src.onmessage = function(){ location.reload(); };
  src.onerror   = function(){ src.close(); };
})();
</script>
</body>`;

// SSE clients
const clients = new Set();

function sendReload() {
  for (const res of clients) {
    try { res.write('data: reload\n\n'); } catch (_) {}
  }
}

// Watch file for changes (80ms debounce to avoid double-fires on save)
let debounce = null;
fs.watch(TARGET, () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    console.log(`[live] ${path.basename(TARGET)} changed — reloading...`);
    sendReload();
  }, 80);
});

const server = http.createServer((req, res) => {
  // SSE endpoint
  if (req.url === SSE_URL) {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // Serve index.html with injected reload snippet
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(TARGET, 'utf8', (err, html) => {
      if (err) { res.writeHead(500); res.end('Error reading file'); return; }
      const patched = html.replace('</body>', INJECT);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(patched);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('\n  Live preview -> http://localhost:' + PORT);
  console.log('  Watching: ' + TARGET);
  console.log('  Ctrl+C to stop\n');
});
