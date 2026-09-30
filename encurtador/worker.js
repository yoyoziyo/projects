const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const LIFETIME_MS = 10 * 60 * 1000;
const CODE_PATTERN = /^[A-Za-z0-9]{3}$/;

function response(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function randomCode() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length]).join('');
}

export class Links {
  constructor(state) { this.state = state; }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (request.method === 'POST' && path === '/create') {
      let input;
      try { input = await request.json(); } catch { return response('JSON inválido', 400); }
      if (typeof input.url !== 'string' || input.url.length > 2048) return response('URL inválida', 400);
      let destination;
      try { destination = new URL(input.url); } catch { return response('URL inválida', 400); }
      if (!['http:', 'https:'].includes(destination.protocol)) return response('URL inválida', 400);
      return this.state.blockConcurrencyWhile(async () => {
        const now = Date.now();
        for (let attempt = 0; attempt < 40; attempt++) {
          const code = randomCode();
          const key = `link:${code}`;
          const existing = await this.state.storage.get(key);
          if (existing && existing.expiresAt > now) continue;
          const expiresAt = now + LIFETIME_MS;
          await this.state.storage.put(key, { url: destination.href, expiresAt });
          await this.scheduleNextAlarm(expiresAt);
          return response(JSON.stringify({ code, expiresAt }), 201, { 'Content-Type': 'application/json; charset=utf-8' });
        }
        return response('Sem códigos disponíveis', 503);
      });
    }
    if (request.method === 'GET' && path.startsWith('/resolve/')) {
      const code = path.slice('/resolve/'.length);
      if (!CODE_PATTERN.test(code)) return response('', 404);
      const key = `link:${code}`;
      const link = await this.state.storage.get(key);
      if (!link) return response('', 404);
      if (Date.now() >= link.expiresAt) {
        await this.state.storage.delete(key);
        return response('', 404);
      }
      return response(link.url, 200);
    }
    return response('', 404);
  }

  async scheduleNextAlarm(expiresAt) {
    const current = await this.state.storage.getAlarm();
    if (current === null || expiresAt < current) await this.state.storage.setAlarm(expiresAt);
  }

  async alarm() {
    const now = Date.now();
    let next = null;
    const entries = await this.state.storage.list({ prefix: 'link:' });
    for (const [key, link] of entries) {
      if (link.expiresAt <= now) await this.state.storage.delete(key);
      else next = next === null ? link.expiresAt : Math.min(next, link.expiresAt);
    }
    if (next !== null) await this.state.storage.setAlarm(next);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const origin = request.headers.get('Origin');
    const allowed = origin === 'https://yoites.com' || origin === 'https://www.yoites.com';
    const cors = { 'Access-Control-Allow-Origin': allowed ? origin : 'https://yoites.com', 'Vary': 'Origin' };
    if (request.method === 'OPTIONS') {
      if (!allowed) return response('', 403);
      return response('', 204, { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    }
    if (path === '/create' && request.method === 'POST') {
      if (!allowed) return response('', 403, cors);
      const type = request.headers.get('Content-Type') || '';
      if (!type.toLowerCase().startsWith('application/json')) return response(JSON.stringify({ error: 'Envie uma URL válida.' }), 415, { ...cors, 'Content-Type': 'application/json' });
      const body = await request.text();
      if (body.length > 4096) return response(JSON.stringify({ error: 'Link muito longo.' }), 413, { ...cors, 'Content-Type': 'application/json' });
      const stub = env.LINKS.getByName('yoites-links');
      const created = await stub.fetch(new Request(new URL('/create', url.origin), { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }));
      if (!created.ok) return response(JSON.stringify({ error: created.status === 503 ? 'Tente novamente em instantes.' : 'Digite um link HTTP ou HTTPS válido.' }), created.status, { ...cors, 'Content-Type': 'application/json' });
      return response(await created.text(), 201, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
    }
    const match = path.match(/^\/resolve\/([A-Za-z0-9]{3})$/);
    if (match && request.method === 'GET' && allowed) {
      const stub = env.LINKS.getByName('yoites-links');
      const resolved = await stub.fetch(new URL('/resolve/' + match[1], url.origin));
      if (!resolved.ok) return response('', 404, cors);
      return response(JSON.stringify({ url: await resolved.text() }), 200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
    }
    return response('', 404);
  }
};
