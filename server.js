import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server listening on ws://localhost:${PORT}`);
console.log(`Ollama: ${OLLAMA_URL}, model: ${OLLAMA_MODEL}`);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (data) => {
    let prompt;
    try {
      const msg = JSON.parse(data.toString());
      prompt = typeof msg === 'string' ? msg : msg.prompt;
    } catch {
      prompt = data.toString();
    }

    if (!prompt) {
      ws.send(JSON.stringify({ error: 'No prompt provided' }));
      return;
    }

    console.log(`Prompt: ${prompt}`);

    let res;
    try {
      res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, prompt }),
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
          if (json.done) ws.send(JSON.stringify({ done: true }));
        } catch {
          // skip malformed lines
        }
      }
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});
