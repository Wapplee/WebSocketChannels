const { WebSocketServer } = require('ws');
const https = require('https');

const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });

console.log(`Relay server active on port ${port}`);

wss.on('connection', (ws, req) => {
  // Extract room name from URL path, removing leading "/" and query params
  // e.g. "/room_123" -> "room_123"
  const rawPath = req.url.split('?')[0];
  const room = rawPath.replace(/^\/+/, '') || 'default';

  ws.room = room;
  console.log(`[+] Client connected to room: ${ws.room}`);

  ws.on('message', (message) => {
    const payload = message.toString();

    // Relay the message to all clients connected to the EXACT same room
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1 && client.room === ws.room) {
        client.send(payload);
      }
    });
  });

  ws.on('close', () => {
    console.log(`[-] Client disconnected from room: ${ws.room}`);
  });
});

// Keep Render free tier awake
const RENDER_APP_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_APP_URL) {
  setInterval(() => {
    https.get(RENDER_APP_URL, (res) => {
      console.log(`[Keep-Alive] Ping status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('[Keep-Alive] Error:', err.message);
    });
  }, 10 * 60 * 1000);
}
