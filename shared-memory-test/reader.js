const reader = new globalThis.SharedMemoryReader('mystral-shm', 65535, true);

setTimeout(() => {
  const value = reader.readString();
  console.log('[SharedMemory reader] read:', value);
  reader.close();
}, 50);
