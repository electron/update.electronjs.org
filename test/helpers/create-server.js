const Updates = require("../../src/updates");

class MemoryCache {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    return this.data.get(key);
  }

  async set(key, value) {
    this.data.set(key, value);
  }
}

function createServer() {
  return new Promise((resolve) => {
    const updates = new Updates({ cache: new MemoryCache() });
    const server = updates.listen(() => {
      resolve({
        server,
        address: `http://localhost:${server.address().port}`,
      });
    });
  });
}

module.exports = {
  createServer,
};
