'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, 'public');
const PORT = process.env.PORT || 8741;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(PUBLIC, urlPath);

  // security: prevent path traversal
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403); res.end('403 Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=300',
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const addrs = [];
  for (const iface of Object.values(nets)) {
    for (const a of iface) {
      if (a.family === 'IPv4' && !a.internal) addrs.push(a.address);
    }
  }
  console.log('\n🍽️  料理集ダッシュボード 起動中\n');
  console.log(`  ローカル:  http://localhost:${PORT}`);
  addrs.forEach(ip => console.log(`  LAN:       http://${ip}:${PORT}`));
  console.log('\nCtrl+C で停止\n');
});
