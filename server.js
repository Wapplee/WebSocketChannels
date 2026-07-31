const { WebSocketServer } = require('ws');
const https = require('https');

const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });

console.log(`Relay server running on port ${port}`);

wss.on('connection', (ws) => {
  // Default channel until client subscribes
  ws.channel = null;

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());

      // 1. ACTION: JOIN / SUBSCRIBE TO A CHANNEL
      if (data.action === 'subscribe') {
        ws.channel = data.channel;
        console.log(`[+] Client subscribed to channel: ${ws.channel}`);
        return;
      }

      // 2. ACTION: PUBLISH SCRIPT TO A CHANNEL
      if (data.action === 'publish') {
        const targetChannel = data.channel;
        const scriptPayload = data.script;

        // Relay ONLY to clients on the exact same channel (excluding the sender)
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1 && client.channel === targetChannel) {
            client.send(JSON.stringify({
              channel: targetChannel,
              script: scriptPayload
            }));
          }
        });
      }
    } catch (err) {
      console.error('Invalid JSON payload received:', rawData.toString());
    }
  });

  ws.on('close', () => {
    if (ws.channel) {
      console.log(`[-] Client disconnected from channel: ${ws.channel}`);
    }
  });
});

// SELF-PING KEEP-ALIVE: Prevents Render free tier idle sleep
const RENDER_APP_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_APP_URL) {
  setInterval(() => {
    https.get(RENDER_APP_URL, (res) => {
      console.log(`[Keep-Alive] Pinged app, status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('[Keep-Alive] Error:', err.message);
    });
  }, 10 * 60 * 1000);
}
