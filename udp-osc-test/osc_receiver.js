const HOST = "0.0.0.0";
const PORT = 3333;

function readOscString(data, offset) {
    let end = offset;
    while (end < data.length && data[end] !== 0) end++;
    if (end === data.length) throw new Error("Invalid OSC string");

    const value = new TextDecoder().decode(data.subarray(offset, end));
    return {
        value,
        nextOffset: Math.ceil((end + 1) / 4) * 4,
    };
}

function parseOscMessage(data) {
    const address = readOscString(data, 0);
    const types = readOscString(data, address.nextOffset);
    if (types.value !== ",i" || types.nextOffset + 4 > data.length) {
        throw new Error(`Unsupported OSC type tag: ${types.value}`);
    }

    return {
        address: address.value,
        value: new DataView(data.buffer, data.byteOffset, data.byteLength)
            .getInt32(types.nextOffset, false),
    };
}

const socket = new UDPSocket();
socket.onerror = (error) => console.error("UDP error:", error.message);
socket.onmessage = ({ data, address, port }) => {
    try {
        const message = parseOscMessage(data);
        console.log(`OSC from ${address}:${port}, ${message.address} ${message.value}`);
    } catch (error) {
        console.error(`Invalid packet from ${address}:${port}:`, error.message);
    }
};

await socket.bind({ address: HOST, port: PORT });
console.log(`Listening for OSC on ${HOST}:${PORT}`);