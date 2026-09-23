# Mystral WebSocket test

Tests Mystral Native's native `WebSocket` client API (`ws://` only, no TLS/`wss://`).

## Run

Run these commands in this directory.

```powershell
npm install
npm run server
```

Then in another terminal:

```powershell
npm run test:mystral
```

The Node.js `ws` server echoes back whatever the Mystral client sends.
