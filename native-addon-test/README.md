# Mystral Native addon test

Minimal test for building a C++ Node.js addon with `node-gyp` and loading it in Node.js and Mystral Native.

## Run

Run these commands in this directory.

```powershell
npm install
npm run build
npm run test:node
npm run test:mystral
```

`test:node` verifies loading in Node.js. `test:mystral` checks Mystral Native compatibility.
