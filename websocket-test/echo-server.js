import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3334 });
console.log('[echo-server] listening on ws://127.0.0.1:3334');

wss.on('connection', (socket) => {
  console.log('[echo-server] client connected');
  socket.on('message', (data, isBinary) => {
    console.log('[echo-server] received:', isBinary ? data : data.toString());
    socket.send(data, { binary: isBinary });
  });
  socket.on('close', () => console.log('[echo-server] client disconnected'));
});
