const wss = new WebSocketServer({ port: 3334 });
console.log('[echo-server] listening on ws://127.0.0.1:3334');

wss.on('connection', (socket) => {
  console.log('[echo-server] client connected');
  socket.on('message', (data) => {
    console.log('[echo-server] received:', new TextDecoder().decode(data));
    socket.send(data);
  });
  socket.on('close', () => console.log('[echo-server] client disconnected'));
});
