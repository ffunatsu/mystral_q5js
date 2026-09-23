import { Client } from 'node-osc';

const client = new Client('127.0.0.1', 3333);
await client.send('/oscAddress', 200);
await client.close();
console.log("OSC sent to 127.0.0.1:3333, /oscAddress 200")