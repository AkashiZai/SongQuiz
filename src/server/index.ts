import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import {
  Category,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../shared/types.js';
import { generateFallbackWav, getTtsAudioBuffer } from './deezer.js';
import { GameManager } from './gameManager.js';
import { MatchmakingQueue } from './matchmaking.js';
import { sanitizeNickname } from './scoring.js';
import { InMemoryStateStore } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 8000,
  });

  const store = new InMemoryStateStore();
  const gameManager = new GameManager(io, store);

  const matchmaking = new MatchmakingQueue({
    onQueueUpdated: (_category, players, status) => {
      for (const p of players) {
        io.to(p.socketId).emit('queue_update', status);
      }
    },
    onMatchReady: async (category, matchedPlayers) => {
      for (const p of matchedPlayers) {
        io.to(p.socketId).emit('queue_update', {
          inQueue: false,
          category,
          playersCount: matchedPlayers.length,
          minPlayers: 2,
          maxPlayers: 8,
          countdownEndsAt: null,
        });
      }
      await gameManager.createQuickMatchRoom(category, matchedPlayers);
    },
  });

  // Healthcheck endpoint for Render / Railway / Fly.io
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Offline / fallback synthesized audio preview
  app.get('/api/fallback-audio/:id', (req, res) => {
    const wav = generateFallbackWav(req.params.id || 'default');
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(wav);
  });

  // AI Siri / Google TTS spoken lyrics audio stream
  app.get('/api/tts-audio/:id', async (req, res) => {
    const { buffer, mime } = await getTtsAudioBuffer(req.params.id || 'tts-1');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  });

  // Safe proxy for Deezer 30s audio preview to prevent browser CORS issues
  app.get('/api/audio', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    try {
      const parsed = new URL(rawUrl);
      const isAllowedHost =
        parsed.protocol === 'https:' &&
        (parsed.hostname.endsWith('.dzcdn.net') || parsed.hostname.endsWith('.deezer.com'));

      if (!isAllowedHost) {
        res.status(400).send('Invalid preview host');
        return;
      }

      const upstream = await fetch(parsed.toString());
      if (!upstream.ok || !upstream.body) {
        throw new Error(`Upstream status ${upstream.status}`);
      }

      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') || 'audio/mpeg'
      );
      res.setHeader('Cache-Control', 'public, max-age=600');
      const arrayBuf = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch {
      // Fallback to synthesized WAV if Deezer CDN preview fails
      const wav = generateFallbackWav(rawUrl || 'fallback');
      res.setHeader('Content-Type', 'audio/wav');
      res.send(wav);
    }
  });

  // Per-socket sliding window rate limiter
  const RATE_WINDOW_MS = 5000;
  const MAX_EVENTS_PER_WINDOW = 30;

  io.on('connection', (socket) => {
    let boundPlayerId: string | undefined;
    let eventCount = 0;
    let windowStart = Date.now();

    const checkRateLimit = (): boolean => {
      const now = Date.now();
      if (now - windowStart > RATE_WINDOW_MS) {
        windowStart = now;
        eventCount = 0;
      }
      eventCount += 1;
      if (eventCount > MAX_EVENTS_PER_WINDOW) {
        socket.emit('toast', {
          type: 'warning',
          message: 'คุณส่งคำสั่งเร็วเกินไป กรุณารอสักครู่',
        });
        return false;
      }
      return true;
    };

    const validatePlayerId = (id: unknown): string | null => {
      if (typeof id !== 'string') return null;
      const trimmed = id.trim();
      if (trimmed.length < 4 || trimmed.length > 64) return null;
      return trimmed;
    };

    socket.on('sync_time', (payload) => {
      if (!checkRateLimit()) return;
      const clientSentAt =
        typeof payload?.clientSentAt === 'number' ? payload.clientSentAt : Date.now();
      socket.emit('time_synced', {
        clientSentAt,
        serverTime: Date.now(),
      });
    });

    socket.on('reconnect_player', async (payload) => {
      if (!checkRateLimit()) return;
      const pid = validatePlayerId(payload?.playerId);
      if (!pid) return;
      boundPlayerId = pid;
      await gameManager.reconnectPlayer(socket, pid, payload?.nickname);
    });

    socket.on('join_queue', async (payload) => {
      if (!checkRateLimit()) return;
      const pid = validatePlayerId(payload?.playerId);
      if (!pid) return;
      boundPlayerId = pid;

      await gameManager.leaveCurrentRoomIfAny(socket, pid);

      const validCats: Category[] = ['thai', 'tts', 'inter', 'kpop', 'retro', 'mixed'];
      const category: Category = validCats.includes(payload?.category)
        ? payload.category
        : 'thai';

      matchmaking.enqueue({
        playerId: pid,
        socketId: socket.id,
        nickname: sanitizeNickname(payload?.nickname),
        category,
      });
    });

    socket.on('leave_queue', () => {
      if (!checkRateLimit()) return;
      if (boundPlayerId) {
        matchmaking.removeByPlayerId(boundPlayerId);
      } else {
        matchmaking.removeBySocketId(socket.id);
      }
      socket.emit('queue_update', {
        inQueue: false,
        category: 'thai',
        playersCount: 0,
        minPlayers: 2,
        maxPlayers: 8,
        countdownEndsAt: null,
      });
    });

    socket.on('create_room', async (payload) => {
      if (!checkRateLimit()) return;
      const pid = validatePlayerId(payload?.playerId);
      if (!pid) return;
      boundPlayerId = pid;
      matchmaking.removeByPlayerId(pid);
      await gameManager.createPrivateRoom(
        socket,
        pid,
        payload?.nickname,
        payload?.settings
      );
    });

    socket.on('join_room', async (payload) => {
      if (!checkRateLimit()) return;
      const pid = validatePlayerId(payload?.playerId);
      if (!pid) return;
      boundPlayerId = pid;
      matchmaking.removeByPlayerId(pid);
      await gameManager.joinRoomByCode(
        socket,
        pid,
        payload?.nickname,
        payload?.code
      );
    });

    socket.on('leave_room', async () => {
      if (!checkRateLimit()) return;
      if (!boundPlayerId) return;
      await gameManager.leaveCurrentRoomIfAny(socket, boundPlayerId);
    });

    socket.on('toggle_ready', async () => {
      if (!checkRateLimit()) return;
      if (!boundPlayerId) return;
      await gameManager.toggleReady(boundPlayerId);
    });

    socket.on('update_settings', async (payload) => {
      if (!checkRateLimit()) return;
      if (!boundPlayerId || !payload) return;
      await gameManager.updateSettings(boundPlayerId, payload);
    });

    socket.on('start_game', async () => {
      if (!checkRateLimit()) return;
      if (!boundPlayerId) return;
      await gameManager.startGameByHost(socket, boundPlayerId);
    });

    socket.on('submit_answer', async (payload) => {
      if (!checkRateLimit()) return;
      if (!boundPlayerId) return;
      await gameManager.submitAnswer(boundPlayerId, payload?.answer);
    });

    socket.on('audio_error', async (payload) => {
      if (!checkRateLimit()) return;
      if (!boundPlayerId || typeof payload?.round !== 'number') return;
      await gameManager.handleAudioError(boundPlayerId, payload.round);
    });

    socket.on('send_emoji', async (payload) => {
      if (!checkRateLimit()) return;
      if (!boundPlayerId) return;
      await gameManager.sendEmoji(boundPlayerId, payload?.emoji);
    });

    socket.on('play_again', async () => {
      if (!checkRateLimit()) return;
      if (!boundPlayerId) return;
      await gameManager.playAgain(boundPlayerId);
    });

    socket.on('disconnect', () => {
      matchmaking.removeBySocketId(socket.id);
      void gameManager.handleDisconnect(socket.id, boundPlayerId);
    });
  });

  if (!isProd) {
    const fs = await import('fs/promises');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/socket.io')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = await fs.readFile(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const clientDist = path.resolve(__dirname, '../../client');
    app.use(express.static(clientDist));
    app.get('*splat', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 Music Guess Party Server running at http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
