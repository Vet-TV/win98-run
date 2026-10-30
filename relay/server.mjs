import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

// Two modes:
// - Local (default, no RELAY_SECRET): binds 127.0.0.1, no token. Run on your
//   own PC; the VM uses your connection. See README.md.
// - Hosted (RELAY_SECRET set): the win98-run Plus private relay. Every
//   WebSocket upgrade must carry a short-lived token minted by
//   /api/relay-access (Plus subscribers only). See DEPLOY.md.
const port = Number(process.env.PORT || 12345);
const host = process.env.LISTEN_HOST || '127.0.0.1';
const RELAY_SECRET = process.env.RELAY_SECRET || '';
const hosted = !!RELAY_SECRET;

export function verifyRelayToken(token, secret) {
  if (!token || !secret) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.uid || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.uid;
  } catch { return null; }
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(hosted
    ? 'win98-run private relay is running (Plus). Connect a VM from https://win98run.app'
    : 'win98-run local relay is running. Point the VM network at wisp://127.0.0.1:' + port);
});

server.on('upgrade', (req, socket, head) => {
  if (hosted) {
    // Token arrives as the first path segment (/<token>/) — see relay-access.
    // A ?token= query is also accepted for manual testing.
    let token = null;
    try {
      const u = new URL(req.url, 'http://relay');
      token = u.searchParams.get('token') || u.pathname.split('/').filter(Boolean)[0] || null;
    } catch { /* reject below */ }
    const uid = verifyRelayToken(token, RELAY_SECRET);
    if (!uid) {
      console.log('[relay] rejected connection without a valid Plus token from', req.socket.remoteAddress);
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    console.log('[relay] Plus VM connected (user', uid + ') from', req.socket.remoteAddress);
  } else {
    console.log('[relay] VM connected from', req.socket.remoteAddress);
  }
  wisp.routeRequest(req, socket, head);
});

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  server.listen(port, host, () => {
    if (hosted) {
      console.log(`win98-run PRIVATE relay listening on ${host}:${port} (Plus token required)`);
      console.log('Expected public address: wss://relay.win98run.app via reverse proxy (see DEPLOY.md).');
    } else {
      console.log(`win98-run relay listening on wisp://127.0.0.1:${port}`);
      console.log('In the VM window choose Network: "Internet via my own PC relay", then boot.');
      console.log('Traffic from the guest leaves through this PC. Press Ctrl+C to stop.');
    }
  });
}

export default server;
