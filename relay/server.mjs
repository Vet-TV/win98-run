import http from 'node:http';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

const port = Number(process.env.PORT || 12345);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('win98-run local relay is running. Point the VM network at wisp://127.0.0.1:' + port);
});

server.on('upgrade', (req, socket, head) => {
  console.log('[relay] VM connected from', req.socket.remoteAddress);
  wisp.routeRequest(req, socket, head);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`win98-run relay listening on wisp://127.0.0.1:${port}`);
  console.log('In the VM window choose Network: "Internet via my own PC relay", then boot.');
  console.log('Traffic from the guest leaves through this PC. Press Ctrl+C to stop.');
});
