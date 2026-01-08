// Ping/TPS Always Commands
// Provides global /ping and /tps commands regardless of server support

module.exports = (api) => {
  api.metadata({
    name: 'pingtps',
    displayName: 'Ping & TPS',
    prefix: '§bPT',
    version: '1.0.0',
    author: 'imWorldy, modified by kevquit',
    description: 'Direct Hypixel ping + Original TPS estimation.'
  });

  try {
    const plugin = new PingTpsPlugin(api);
    plugin.register();
    return plugin;
  } catch (e) {}
};

class PingTpsPlugin {
  constructor(api) {
    this.api = api;
    this.prefix = this.api.getPrefix ? this.api.getPrefix() : '§bPT';

    // REVERTED: Original TPS variables
    this.lastAge = null;
    this.lastTs = null;
    this.samples = [];
    this.maxSamples = 20;

    this.unsubscribers = [];
  }

  register() {
    // REVERTED: Original world_time listener for TPS
    this.unsubscribers.push(
      this.api.on('world_time', (event) => {
        try {
          const now = Date.now();
          const age = this._normalizeTickValue(event.age);
          if (age === null) return;

          if (this.lastAge !== null && this.lastTs !== null) {
            const dAge = age - this.lastAge; // ticks (bigint)
            const dMs = now - this.lastTs; // ms
            if (dAge > 0n && dMs > 0) {
              const ticks = Number(dAge);
              if (Number.isFinite(ticks)) {
                const tps = Math.max(0, Math.min(20, ticks / (dMs / 1000)));
                this.samples.push(tps);
                if (this.samples.length > this.maxSamples) this.samples.shift();
              }
            }
          }
          this.lastAge = age;
          this.lastTs = now;
        } catch (err) {
          this.api.debugLog && this.api.debugLog(`TPS calc error: ${err.message}`);
        }
      })
    );

    this.unsubscribers.push(
      this.api.intercept('packet:client:chat', async (evt) => {
        try {
          const raw = (evt.data?.message || '').trim();
          if (!raw.startsWith('/')) return;

          const base = raw.split(/\s+/)[0].toLowerCase();
          if (base !== '/ping' && base !== '/tps') return;

          evt.cancel();

          if (base === '/ping') {
            await this.handlePing();
          } else if (base === '/tps') {
            this.handleTps();
          }
        } catch (err) {
          this.api.chat(`${this.prefix} §cError: ${err.message}`);
        }
      })
    );
  }

  // REVERTED: Original normalization logic for BigInt/Longs
  _normalizeTickValue(raw) {
    try {
      if (typeof raw === 'bigint') return raw;
      if (typeof raw === 'number' && Number.isFinite(raw)) return BigInt(Math.round(raw));
      if (raw && typeof raw === 'object') {
        if (typeof raw.toBigInt === 'function') return raw.toBigInt();
        if (typeof raw.toNumber === 'function') {
          const num = raw.toNumber();
          if (Number.isFinite(num)) return BigInt(num);
        }
        if (Array.isArray(raw) && raw.length === 2) {
          const hi = BigInt(Math.trunc(raw[0]));
          const lo = BigInt(raw[1] >>> 0);
          return (hi << 32n) + lo;
        }
        if ('high' in raw && 'low' in raw) {
          const hi = BigInt(Math.trunc(raw.high));
          const lo = BigInt(raw.low >>> 0);
          return (hi << 32n) + lo;
        }
      }
    } catch (_) {}
    return null;
  }

  // KEEPING: Working direct fetch ping logic
  async handlePing() {
    const start = Date.now();
    try {
      await fetch('https://hypixel.net', { method: 'HEAD', mode: 'no-cors', cache: 'no-cache' });
      const ms = Date.now() - start;
      this._emitPing(ms);
    } catch (e) {
      this.api.chat(`${this.prefix} §cError: §7Could not reach Hypixel.`);
    }
  }

  _emitPing(ms) {
    let color = '§a'; // Green
    if (ms >= 80)  color = '§e'; // Yellow
    if (ms >= 150) color = '§6'; // Gold
    if (ms >= 220) color = '§c'; // Red
    if (ms >= 300) color = '§4'; // Dark Red (Critical)

    this.api.chat(`${this.prefix} §7Hypixel Latency: ${color}${ms}ms`);
  }

  // REVERTED: Original TPS display logic
  handleTps() {
    if (!this.samples.length) {
      this.api.chat(`${this.prefix} §7TPS: §8calculating... (move around for a few seconds)`);
      return;
    }
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const tps = Math.min(20, Math.max(0, avg));
    const tpsFixed = tps.toFixed(2);
    const color = tps >= 19.5 ? '§a' : tps >= 18 ? '§e' : '§c';
    this.api.chat(`${this.prefix} §7TPS: ${color}${tpsFixed}`);
  }

  disable() {
    for (const off of this.unsubscribers) {
      try { if (typeof off === 'function') off(); } catch (_) {}
    }
    this.unsubscribers = [];
  }
}
