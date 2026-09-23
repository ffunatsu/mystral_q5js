const writer = new globalThis.SharedMemoryWriter('mystral-shm', 65535, true);
writer.writeString('hello from mystral shared memory');
console.log('[SharedMemory writer] wrote message');
writer.close();
