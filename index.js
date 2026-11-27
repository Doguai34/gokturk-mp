export class Room {
  constructor(ctx, env) { this.ctx = ctx; }
  async fetch(req) {
    if (this.ctx.getWebSockets().length >= 16) return new Response('full', { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 600) return;
    if (!ws.deserializeAttachment()) {
      try { const j = JSON.parse(msg); if (j.id) ws.serializeAttachment({ id: String(j.id).slice(0, 12) }); } catch (e) {}
    }
    for (const o of this.ctx.getWebSockets()) if (o !== ws) { try { o.send(msg); } catch (e) {} }
  }
  webSocketClose(ws) {
    const a = ws.deserializeAttachment();
    if (a) for (const o of this.ctx.getWebSockets()) if (o !== ws) { try { o.send(JSON.stringify({ t: 'bye', id: a.id })); } catch (e) {} }
  }
  webSocketError(ws) { this.webSocketClose(ws); }
}
export default {
  async fetch(req, env) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('ok');
    const u = new URL(req.url);
    const n = (u.searchParams.get('r') || 'ist').replace(/[^a-z0-9-]/g, '').slice(0, 24);
    return env.ROOM.get(env.ROOM.idFromName(n)).fetch(req);
  }
};
