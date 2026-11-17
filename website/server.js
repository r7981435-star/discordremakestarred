const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MC_SERVER = 'notdonutsmp.sadhost.com';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain'
};

// Simple cache for server status
let cachedStatus = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15000; // 15 seconds

function fetchMCStatus(callback) {
  const now = Date.now();
  if (cachedStatus && (now - lastFetchTime < CACHE_DURATION)) {
    return callback(null, cachedStatus);
  }

  const url = `https://api.mcsrvstat.us/3/${MC_SERVER}`;
  const request = https.get(url, { headers: { 'User-Agent': 'NotDonutSMP-Website/1.0' }, timeout: 5000 }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        cachedStatus = parsed;
        lastFetchTime = Date.now();
        callback(null, parsed);
      } catch (err) {
        callback(err, null);
      }
    });
  });

  request.on('error', (err) => {
    // If mcsrvstat fails, try fallback
    https.get(`https://api.mcstatus.io/v2/status/java/${MC_SERVER}`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          cachedStatus = {
            online: parsed.online,
            players: {
              online: parsed.players?.online || 0,
              max: parsed.players?.max || 0
            }
          };
          lastFetchTime = Date.now();
          callback(null, cachedStatus);
        } catch (e) {
          callback(e, null);
        }
      });
    }).on('error', (e) => callback(e, null));
  });

  request.on('timeout', () => {
    request.destroy();
    callback(new Error('Request timeout'), null);
  });
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // API route for live server status
  if (reqPath === '/api/status') {
    fetchMCStatus((err, status) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      if (err || !status) {
        res.end(JSON.stringify({ online: false, players: { online: 0, max: 0 } }));
      } else {
        res.end(JSON.stringify(status));
      }
    });
    return;
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Not Donut SMP server running at http://localhost:${PORT}`);
});
