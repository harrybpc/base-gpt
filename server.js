import http from 'http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

console.log(`WebSocket server listening on ws://${HOST}:${PORT}`);
console.log(`Ollama: ${OLLAMA_URL}, default model: ${DEFAULT_MODEL}`);

// HTTP server handles /models, WebSocket handles everything else
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.url === '/model') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ model: DEFAULT_MODEL }));
    return;
  }

  if (req.method === 'GET' && req.url === '/models') {
    try {
      const r = await fetch(`${OLLAMA_URL}/api/tags`);
      const data = await r.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data.models.map(m => m.name)));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });
server.listen(PORT, HOST);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (data) => {
    let prompt, model;
    try {
      const msg = JSON.parse(data.toString());
      prompt = typeof msg === 'string' ? msg : msg.prompt;
      model  = msg.model || DEFAULT_MODEL;
    } catch {
      prompt = data.toString();
      model  = DEFAULT_MODEL;
    }

    if (!prompt) {
      ws.send(JSON.stringify({ error: 'No prompt provided' }));
      return;
    }

    console.log(`[${model}] ${prompt}`);

    let res;
    try {
      res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt }),
      });
    } catch (err) {
      ws.send(JSON.stringify({ error: `Failed to reach Ollama: ${err.message}` }));
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      ws.send(JSON.stringify({ error: `Ollama error ${res.status}: ${text}` }));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.response) ws.send(JSON.stringify({ token: json.response }));
          if (json.done)     ws.send(JSON.stringify({ done: true }));
        } catch { /* skip malformed lines */ }
      }
    }

    // Guarantee the client always gets unblocked
    ws.send(JSON.stringify({ done: true }));
  });

  ws.on('close', () => console.log('Client disconnected'));
});
