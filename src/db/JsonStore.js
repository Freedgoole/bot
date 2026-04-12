const fs = require('fs').promises;
const path = require('path');

class JsonStore {
  constructor(filename = 'data.json') {
    this.filepath = path.join(process.cwd(), 'data', filename);
  }

  async ensureDir() {
    const dir = path.dirname(this.filepath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async read() {
    try {
      await this.ensureDir();
      const data = await fs.readFile(this.filepath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async write(data) {
    await this.ensureDir();
    await fs.writeFile(this.filepath, JSON.stringify(data, null, 2));
  }

  async get(key) {
    const data = await this.read();
    return data[key];
  }

  async set(key, value) {
    const data = await this.read();
    data[key] = value;
    await this.write(data);
  }

  async push(key, item) {
    const data = await this.read();
    if (!data[key]) data[key] = [];
    data[key].push(item);
    await this.write(data);
  }

  async getRecent(key, count = 10) {
    const data = await this.read();
    const arr = data[key] || [];
    return arr.slice(-count);
  }

  async filterByDate(key, days = 7) {
    const data = await this.read();
    const arr = data[key] || [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return arr.filter(item => new Date(item.date).getTime() > cutoff);
  }
}

module.exports = JsonStore;
