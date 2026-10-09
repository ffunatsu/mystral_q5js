const HOST = "127.0.0.1";
const PORT = 3333;

function oscString(value) {
    const bytes = new TextEncoder().encode(value);
    const paddedLength = Math.ceil((bytes.length + 1) / 4) * 4;
    const result = new Uint8Array(paddedLength);
    result.set(bytes);
    return result;
}

function oscMessage(address, value) {
    const addressBytes = oscString(address);
    const typeBytes = oscString(",i");
    const result = new Uint8Array(addressBytes.length + typeBytes.length + 4);
    result.set(addressBytes, 0);
    result.set(typeBytes, addressBytes.length);
    new DataView(result.buffer).setInt32(addressBytes.length + typeBytes.length, value, false);
    return result;
}

const socket = new UDPSocket();
socket.onerror = (error) => console.error("UDP error:", error.message);

await socket.send(oscMessage("/oscAddress", 200), {
    address: HOST,
    port: PORT,
});

socket.close();
console.log(`OSC sent to ${HOST}:${PORT}, /oscAddress 200`);