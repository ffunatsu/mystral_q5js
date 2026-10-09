const ws = new WebSocket('ws://127.0.0.1:3334');

ws.onopen = () => {
  console.log('[client] open, sending message');
  ws.send('hello from mystral');
};

ws.onmessage = (event) => {
  const text = new TextDecoder().decode(event.data);
  console.log('[client] received:', text);
  ws.close();
};

ws.onerror = (event) => {
  console.error('[client] error:', event.message);
};

ws.onclose = (event) => {
  console.log('[client] closed, code:', event.code);
  process.exit(0);
};
