import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { createExpressApp } from './server/app';
import { initDatabase } from './server/db/database';
import { attachVoiceWebSocketGateway } from './server/speech/geminiClient';

async function startServer(): Promise<void> {
  initDatabase();

  const app = createExpressApp();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/voice' });
  attachVoiceWebSocketGateway(wss);

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ASHA Voice Register AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
