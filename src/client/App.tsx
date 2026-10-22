import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Category,
  ClientToServerEvents,
  EmojiReactionPayload,
  GameOverPayload,
  PublicRoomState,
  QueueStatusPayload,
  RoomSettings,
  RoundRevealPayload,
  RoundStartPayload,
  ServerToClientEvents,
  ToastPayload,
} from '../shared/types';
import { GameView } from './components/GameView';
import { HomeView } from './components/HomeView';
import { LobbyView } from './components/LobbyView';
import { ResultView } from './components/ResultView';

const PLAYER_ID_KEY = 'music_guess_player_id';
const NICKNAME_KEY = 'music_guess_nickname';
const VOLUME_KEY = 'music_guess_volume';

function getOrCreatePlayerId(): string {
  let pid = localStorage.getItem(PLAYER_ID_KEY);
  if (!pid || pid.length < 6) {
    pid = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PLAYER_ID_KEY, pid);
  }
  return pid;
}

function getInitialNickname(): string {
  return (
    localStorage.getItem(NICKNAME_KEY) ||
    `Player${Math.floor(100 + Math.random() * 900)}`
  );
}

function getInitialRoomCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('room');
  return code ? code.trim().toUpperCase().slice(0, 5) : '';
}

const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, '') || '';

export default function App() {
  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [nickname, setNickname] = useState<string>(() => getInitialNickname());
  const [selectedCategory, setSelectedCategory] = useState<Category>('thai');
  const [initialJoinCode] = useState<string>(() => getInitialRoomCodeFromUrl());

  const [connected, setConnected] = useState(false);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [queueStatus, setQueueStatus] = useState<QueueStatusPayload | null>(null);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [roundPayload, setRoundPayload] = useState<RoundStartPayload | null>(null);
  const [revealPayload, setRevealPayload] = useState<RoundRevealPayload | null>(null);
  const [gameOverPayload, setGameOverPayload] = useState<GameOverPayload | null>(null);

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [volume, setVolume] = useState<number>(() => {
    const saved = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 0.8;
  });

  const [toasts, setToasts] = useState<Array<ToastPayload & { id: string }>>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<
    Array<EmojiReactionPayload & { leftPct: number }>
  >([]);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(
    null
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playScheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverOffsetRef = useRef<number>(0);

  const addToast = useCallback((toast: ToastPayload) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    localStorage.setItem(NICKNAME_KEY, nickname);
  }, [nickname]);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const unlockAudio = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.005;
        osc.frequency.value = 440;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      }
      if (audioRef.current) {
        audioRef.current.muted = false;
        audioRef.current.volume = volume;
        if (audioRef.current.src && audioRef.current.paused) {
          audioRef.current
            .play()
            .then(() => setIsAudioPlaying(true))
            .catch(() => {});
        }
      }
      setAudioUnlocked(true);
    } catch {
      setAudioUnlocked(true);
    }
  }, [volume]);

  const playRoundPreview = useCallback(
    (payload: RoundStartPayload) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (playScheduleTimerRef.current) {
        clearTimeout(playScheduleTimerRef.current);
        playScheduleTimerRef.current = null;
      }

      audio.pause();
      audio.src = payload.previewUrl.startsWith('/')
        ? `${SERVER_URL}${payload.previewUrl}`
        : payload.previewUrl;
      audio.volume = volume;
      audio.load();

      const serverNow = Date.now() + serverOffsetRef.current;
      const delayMs = payload.startAtServerTime - serverNow;

      const startPlayback = () => {
        const currentServerNow = Date.now() + serverOffsetRef.current;
        const seekSec = Math.max(
          0,
          Math.min(25, (currentServerNow - payload.startAtServerTime) / 1000)
        );
        try {
          if (seekSec > 0.4) {
            audio.currentTime = seekSec;
          }
        } catch {
          // Ignore seek before metadata loaded
        }
        audio
          .play()
          .then(() => {
            setIsAudioPlaying(true);
            setAudioUnlocked(true);
          })
          .catch(() => {
            setIsAudioPlaying(false);
          });
      };

      if (delayMs > 40) {
        playScheduleTimerRef.current = setTimeout(startPlayback, delayMs);
      } else {
        startPlayback();
      }
    },
    [volume]
  );

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      SERVER_URL || undefined,
      {
        transports: ['websocket', 'polling'],
      }
    );
    socketRef.current = socket;

    const syncClock = () => {
      socket.emit('sync_time', { clientSentAt: Date.now() });
    };

    socket.on('connect', () => {
      setConnected(true);
      syncClock();
      socket.emit('reconnect_player', {
        playerId,
        nickname: localStorage.getItem(NICKNAME_KEY) || undefined,
      });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('time_synced', ({ clientSentAt, serverTime }) => {
      const now = Date.now();
      const rtt = now - clientSentAt;
      const estimatedServerNow = serverTime + rtt / 2;
      const offset = estimatedServerNow - now;
      serverOffsetRef.current = offset;
      setServerTimeOffset(offset);
    });

    socket.on('queue_update', (status) => {
      setQueueStatus(status.inQueue ? status : null);
    });

    socket.on('room_state', (state) => {
      setQueueStatus(null);
      setRoom(state);
      if (state.phase === 'lobby' || state.phase === 'starting') {
        setRoundPayload(null);
        setRevealPayload(null);
        setGameOverPayload(null);
        if (audioRef.current) {
          audioRef.current.pause();
          setIsAudioPlaying(false);
        }
      }
    });

    socket.on('round_start', (payload) => {
      setRevealPayload(null);
      setRoundPayload(payload);
      playRoundPreview(payload);
    });

    socket.on('player_answered', ({ playerId: answeredId }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.playerId === answeredId ? { ...p, hasAnsweredCurrentRound: true } : p
          ),
        };
      });
    });

    socket.on('round_reveal', (payload) => {
      setRevealPayload(payload);
    });

    socket.on('game_over', (payload) => {
      setGameOverPayload(payload);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      }
    });

    socket.on('emoji_reaction', (reaction) => {
      const leftPct = 18 + Math.floor(Math.random() * 64);
      setFloatingEmojis((prev) => [...prev.slice(-10), { ...reaction, leftPct }]);
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== reaction.id));
      }, 2200);
    });

    socket.on('toast', (toast) => {
      addToast(toast);
    });

    socket.on('room_closed', ({ reason }) => {
      addToast({ type: 'warning', message: reason });
      setRoom(null);
      setRoundPayload(null);
      setRevealPayload(null);
      setGameOverPayload(null);
    });

    const syncInterval = setInterval(syncClock, 15000);

    return () => {
      clearInterval(syncInterval);
      if (playScheduleTimerRef.current) {
        clearTimeout(playScheduleTimerRef.current);
      }
      socket.disconnect();
    };
  }, [playerId, addToast, playRoundPreview]);

  const handleJoinQueue = () => {
    socketRef.current?.emit('join_queue', {
      playerId,
      nickname,
      category: selectedCategory,
    });
  };

  const handleLeaveQueue = () => {
    socketRef.current?.emit('leave_queue');
    setQueueStatus(null);
  };

  const handleCreateRoom = () => {
    socketRef.current?.emit('create_room', {
      playerId,
      nickname,
      settings: { category: selectedCategory },
    });
  };

  const handleJoinRoom = (code: string) => {
    socketRef.current?.emit('join_room', {
      playerId,
      nickname,
      code,
    });
  };

  const handleLeaveRoom = () => {
    socketRef.current?.emit('leave_room');
    if (audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
    setRoom(null);
    setRoundPayload(null);
    setRevealPayload(null);
    setGameOverPayload(null);
    if (window.location.search.includes('room=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleToggleReady = () => {
    socketRef.current?.emit('toggle_ready');
  };

  const handleUpdateSettings = (partial: Partial<RoomSettings>) => {
    socketRef.current?.emit('update_settings', partial);
  };

  const handleStartGame = () => {
    unlockAudio();
    socketRef.current?.emit('start_game');
  };

  const handleSubmitAnswer = (answer: string) => {
    socketRef.current?.emit('submit_answer', { answer });
  };

  const handleSendEmoji = (emoji: string) => {
    socketRef.current?.emit('send_emoji', { emoji });
  };

  const handlePlayAgain = () => {
    socketRef.current?.emit('play_again');
  };

  const handleRetryPlayAudio = () => {
    unlockAudio();
    if (roundPayload) {
      playRoundPreview(roundPayload);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#f4f4f6] flex flex-col">
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => setIsAudioPlaying(true)}
        onPause={() => setIsAudioPlaying(false)}
        onEnded={() => setIsAudioPlaying(false)}
        onError={() => {
          setIsAudioPlaying(false);
          if (room?.phase === 'playing' && roundPayload) {
            socketRef.current?.emit('audio_error', { round: roundPayload.round });
          }
        }}
      />

      {/* Minimal Top Bar */}
      <header className="w-full border-b border-[#1c1e24] bg-[#0a0a0c]/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
              }`}
              title={connected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}
            />
            <span className="font-bold text-sm tracking-tight text-white">
              ทายเพลง
            </span>
            {room && (
              <span className="text-xs font-mono text-zinc-400 bg-[#16181d] border border-[#262932] px-2 py-0.5 rounded">
                #{room.code}
              </span>
            )}
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-2.5">
            {!audioUnlocked && (
              <button
                type="button"
                onClick={unlockAudio}
                className="text-xs font-medium px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition cursor-pointer"
              >
                แตะเพื่อเปิดเสียง
              </button>
            )}
            <div className="flex items-center gap-2 bg-[#14151a] border border-[#23252e] px-2.5 py-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  setVolume((v) => (v > 0 ? 0 : 0.8));
                }}
                className="text-zinc-400 hover:text-white transition cursor-pointer"
                aria-label="เปิดหรือปิดเสียง"
              >
                {volume === 0 ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => {
                  unlockAudio();
                  setVolume(Number(e.target.value));
                }}
                aria-label="ระดับเสียง"
                className="w-16 sm:w-20 accent-emerald-500 cursor-pointer h-1 bg-zinc-800 rounded"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Toasts */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 space-y-1.5 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3.5 py-2 rounded-lg border text-xs font-medium shadow-lg text-center ${
              t.type === 'error'
                ? 'bg-[#1f1215] border-rose-500/40 text-rose-200'
                : t.type === 'warning'
                ? 'bg-[#1f1a12] border-amber-500/40 text-amber-200'
                : 'bg-[#16181e] border-zinc-700 text-zinc-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Floating Emojis */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            className="absolute bottom-14 animate-float-emoji flex flex-col items-center gap-0.5"
            style={{ left: `${item.leftPct}%` }}
          >
            <span className="text-3xl">{item.emoji}</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#14151a]/90 text-zinc-300 border border-zinc-800">
              {item.nickname}
            </span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {!room ? (
          <HomeView
            nickname={nickname}
            setNickname={setNickname}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            queueStatus={queueStatus}
            serverTimeOffset={serverTimeOffset}
            initialJoinCode={initialJoinCode}
            onJoinQueue={handleJoinQueue}
            onLeaveQueue={handleLeaveQueue}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            audioUnlocked={audioUnlocked}
            onUnlockAudio={unlockAudio}
          />
        ) : room.phase === 'lobby' || room.phase === 'starting' ? (
          <LobbyView
            room={room}
            playerId={playerId}
            onToggleReady={handleToggleReady}
            onUpdateSettings={handleUpdateSettings}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
            onSendEmoji={handleSendEmoji}
          />
        ) : room.phase === 'playing' || room.phase === 'reveal' ? (
          <GameView
            room={room}
            playerId={playerId}
            roundPayload={roundPayload}
            revealPayload={revealPayload}
            serverTimeOffset={serverTimeOffset}
            isAudioPlaying={isAudioPlaying}
            onRetryPlayAudio={handleRetryPlayAudio}
            onSubmitAnswer={handleSubmitAnswer}
            onSendEmoji={handleSendEmoji}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : (
          <ResultView
            room={room}
            gameOver={gameOverPayload}
            playerId={playerId}
            onPlayAgain={handlePlayAgain}
            onLeaveRoom={handleLeaveRoom}
            onSendEmoji={handleSendEmoji}
          />
        )}
      </main>
    </div>
  );
}
