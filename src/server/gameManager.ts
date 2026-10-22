import { Server, Socket } from 'socket.io';
import {
  ALLOWED_EMOJIS,
  AnswerMode,
  Category,
  ClientToServerEvents,
  FinalPlayerSummary,
  GameOverPayload,
  PlayerRoundResult,
  PublicPlayer,
  PublicRoomState,
  RoomSettings,
  RoundRevealPayload,
  RoundStartPayload,
  ServerToClientEvents,
  TotalRoundsOption,
} from '../shared/types.js';
import {
  buildChoicesForTrack,
  FALLBACK_TRACKS,
  getCategoryPool,
  pickTracksForRoom,
} from './deezer.js';
import { QueuedPlayer } from './matchmaking.js';
import { calculateScore, isFuzzyAnswerMatch, sanitizeNickname } from './scoring.js';
import { PlayerSession, RoomData, StateStore } from './store.js';

const AVATAR_COLORS = [
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#3B82F6', // blue
  '#A855F7', // purple
];

const ROUND_PRELOAD_MS = 600;
const ROUND_DURATION_MS = 20000;
const REVEAL_DURATION_MS = 5000;
const QUICK_MATCH_START_DELAY_MS = 3000;
const RECONNECT_GRACE_MS = 60000;
const ROOM_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export class GameManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private store: StateStore;
  private roomTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>(); // key: playerId
  private lastRevealPayloads = new Map<string, RoundRevealPayload>(); // key: roomCode
  private lastGameOverPayloads = new Map<string, GameOverPayload>(); // key: roomCode
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    store: StateStore
  ) {
    this.io = io;
    this.store = store;
    this.cleanupInterval = setInterval(() => {
      void this.cleanupStaleRooms();
    }, 60000);
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private async createUniqueRoomCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = this.generateRoomCode();
      const existing = await this.store.getRoom(code);
      if (!existing) return code;
    }
    return this.generateRoomCode();
  }

  private pickAvatarColor(index: number): string {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  }

  public toPublicPlayer(p: PlayerSession): PublicPlayer {
    return {
      playerId: p.playerId,
      nickname: p.nickname,
      avatarColor: p.avatarColor,
      isHost: p.isHost,
      isReady: p.isReady,
      connected: p.connected,
      score: p.score,
      streak: p.streak,
      maxStreak: p.maxStreak,
      correctCount: p.correctCount,
      fastestTimeMs: p.fastestTimeMs,
      hasAnsweredCurrentRound: p.currentAnswer !== null,
    };
  }

  public toPublicRoomState(room: RoomData): PublicRoomState {
    return {
      code: room.code,
      isQuickMatch: room.isQuickMatch,
      phase: room.phase,
      settings: room.settings,
      players: Array.from(room.players.values()).map((p) => this.toPublicPlayer(p)),
      currentRound: room.currentRound,
      totalRounds: room.settings.totalRounds,
      startingEndsAt: room.startingEndsAt,
    };
  }

  public async broadcastRoomState(room: RoomData): Promise<void> {
    room.lastActivityAt = Date.now();
    await this.store.saveRoom(room);
    this.io.to(room.code).emit('room_state', this.toPublicRoomState(room));
  }

  public async createPrivateRoom(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    playerId: string,
    rawNickname: string,
    partialSettings?: Partial<RoomSettings>
  ): Promise<RoomData> {
    await this.leaveCurrentRoomIfAny(socket, playerId);

    const code = await this.createUniqueRoomCode();
    const nickname = sanitizeNickname(rawNickname);

    const settings: RoomSettings = {
      category: this.validateCategory(partialSettings?.category),
      totalRounds: this.validateTotalRounds(partialSettings?.totalRounds),
      answerMode: this.validateAnswerMode(partialSettings?.answerMode),
    };

    const hostSession: PlayerSession = {
      playerId,
      socketId: socket.id,
      nickname,
      avatarColor: this.pickAvatarColor(0),
      isHost: true,
      isReady: true,
      connected: true,
      disconnectedAt: null,
      score: 0,
      streak: 0,
      maxStreak: 0,
      correctCount: 0,
      fastestTimeMs: null,
      currentAnswer: null,
    };

    const room: RoomData = {
      code,
      isQuickMatch: false,
      phase: 'lobby',
      settings,
      players: new Map([[playerId, hostSession]]),
      usedTrackIds: new Set(),
      roundTracks: [],
      currentRound: 0,
      currentTrack: null,
      currentChoices: [],
      roundStartAt: 0,
      roundEndAt: 0,
      startingEndsAt: null,
      correctAnswersThisRound: 0,
      audioErrorPlayers: new Set(),
      lastActivityAt: Date.now(),
    };

    await this.store.saveRoom(room);
    await this.store.setPlayerRoomCode(playerId, code);
    await socket.join(code);
    await this.broadcastRoomState(room);
    return room;
  }

  public async createQuickMatchRoom(
    category: Category,
    matchedPlayers: QueuedPlayer[]
  ): Promise<RoomData | null> {
    if (matchedPlayers.length === 0) return null;

    const code = await this.createUniqueRoomCode();
    const playersMap = new Map<string, PlayerSession>();

    for (let i = 0; i < matchedPlayers.length; i++) {
      const mp = matchedPlayers[i];
      const session: PlayerSession = {
        playerId: mp.playerId,
        socketId: mp.socketId,
        nickname: sanitizeNickname(mp.nickname),
        avatarColor: this.pickAvatarColor(i),
        isHost: i === 0,
        isReady: true,
        connected: true,
        disconnectedAt: null,
        score: 0,
        streak: 0,
        maxStreak: 0,
        correctCount: 0,
        fastestTimeMs: null,
        currentAnswer: null,
      };
      playersMap.set(mp.playerId, session);
      await this.store.setPlayerRoomCode(mp.playerId, code);

      const sock = this.io.sockets.sockets.get(mp.socketId);
      if (sock) {
        await sock.join(code);
      }
    }

    const startingEndsAt = Date.now() + QUICK_MATCH_START_DELAY_MS;
    const room: RoomData = {
      code,
      isQuickMatch: true,
      phase: 'starting',
      settings: {
        category,
        totalRounds: 10,
        answerMode: 'choice',
      },
      players: playersMap,
      usedTrackIds: new Set(),
      roundTracks: [],
      currentRound: 0,
      currentTrack: null,
      currentChoices: [],
      roundStartAt: 0,
      roundEndAt: 0,
      startingEndsAt,
      correctAnswersThisRound: 0,
      audioErrorPlayers: new Set(),
      lastActivityAt: Date.now(),
    };

    await this.store.saveRoom(room);
    await this.broadcastRoomState(room);

    // Pre-fetch tracks and start game automatically after 3s countdown
    const timer = setTimeout(() => {
      void this.beginMatchRounds(code);
    }, QUICK_MATCH_START_DELAY_MS);
    this.setRoomTimer(code, timer);

    return room;
  }

  public async joinRoomByCode(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    playerId: string,
    rawNickname: string,
    rawCode: string
  ): Promise<void> {
    const code = (rawCode || '').trim().toUpperCase();
    const room = await this.store.getRoom(code);
    if (!room) {
      socket.emit('toast', { type: 'error', message: `ไม่พบห้องรหัส "${code}"` });
      return;
    }

    // If player is already in this room, treat as reconnect
    if (room.players.has(playerId)) {
      await this.reconnectPlayer(socket, playerId, rawNickname);
      return;
    }

    if (room.phase !== 'lobby') {
      socket.emit('toast', {
        type: 'error',
        message: 'ห้องนี้เริ่มเกมไปแล้ว ไม่สามารถเข้าร่วมกลางคันได้',
      });
      return;
    }

    if (room.players.size >= 12) {
      socket.emit('toast', { type: 'error', message: 'ห้องนี้เต็มแล้ว (สูงสุด 12 คน)' });
      return;
    }

    await this.leaveCurrentRoomIfAny(socket, playerId);

    const nickname = sanitizeNickname(rawNickname);
    const session: PlayerSession = {
      playerId,
      socketId: socket.id,
      nickname,
      avatarColor: this.pickAvatarColor(room.players.size),
      isHost: room.players.size === 0,
      isReady: true,
      connected: true,
      disconnectedAt: null,
      score: 0,
      streak: 0,
      maxStreak: 0,
      correctCount: 0,
      fastestTimeMs: null,
      currentAnswer: null,
    };

    room.players.set(playerId, session);
    await this.store.setPlayerRoomCode(playerId, code);
    await socket.join(code);
    await this.broadcastRoomState(room);
  }

  public async reconnectPlayer(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    playerId: string,
    rawNickname?: string
  ): Promise<boolean> {
    if (!playerId || typeof playerId !== 'string') return false;
    const code = await this.store.getPlayerRoomCode(playerId);
    if (!code) return false;

    const room = await this.store.getRoom(code);
    if (!room) {
      await this.store.deletePlayerRoomCode(playerId);
      return false;
    }

    const session = room.players.get(playerId);
    if (!session) {
      await this.store.deletePlayerRoomCode(playerId);
      return false;
    }

    // Clear pending disconnect grace timer
    this.clearDisconnectTimer(playerId);

    session.socketId = socket.id;
    session.connected = true;
    session.disconnectedAt = null;
    if (rawNickname && rawNickname.trim()) {
      session.nickname = sanitizeNickname(rawNickname);
    }

    await socket.join(room.code);
    await this.broadcastRoomState(room);

    // Send active phase payload so client immediately resumes the exact screen & timer
    if (room.phase === 'playing' && room.currentTrack) {
      const payload: RoundStartPayload = {
        round: room.currentRound,
        totalRounds: room.settings.totalRounds,
        mode: room.settings.answerMode,
        previewUrl: room.currentTrack.preview,
        startAtServerTime: room.roundStartAt,
        endAtServerTime: room.roundEndAt,
        choices: room.settings.answerMode === 'choice' ? room.currentChoices : undefined,
      };
      socket.emit('round_start', payload);
    } else if (room.phase === 'reveal') {
      const revealPayload = this.lastRevealPayloads.get(room.code);
      if (revealPayload) {
        socket.emit('round_reveal', revealPayload);
      }
    } else if (room.phase === 'finished') {
      const gameOverPayload = this.lastGameOverPayloads.get(room.code);
      if (gameOverPayload) {
        socket.emit('game_over', gameOverPayload);
      }
    }

    socket.emit('toast', {
      type: 'info',
      message: `กลับเข้าห้อง ${room.code} สำเร็จ!`,
    });
    return true;
  }

  public async handleDisconnect(socketId: string, playerId?: string): Promise<void> {
    let resolvedPlayerId = playerId;
    let targetRoom: RoomData | undefined;

    if (resolvedPlayerId) {
      const code = await this.store.getPlayerRoomCode(resolvedPlayerId);
      if (code) targetRoom = await this.store.getRoom(code);
    }

    if (!targetRoom) {
      const rooms = await this.store.listRooms();
      for (const r of rooms) {
        for (const p of r.players.values()) {
          if (p.socketId === socketId) {
            targetRoom = r;
            resolvedPlayerId = p.playerId;
            break;
          }
        }
        if (targetRoom) break;
      }
    }

    if (!targetRoom || !resolvedPlayerId) return;
    const session = targetRoom.players.get(resolvedPlayerId);
    if (!session || session.socketId !== socketId) return;

    session.connected = false;
    session.disconnectedAt = Date.now();
    await this.broadcastRoomState(targetRoom);

    // If during active round all remaining connected players have answered, end round early
    if (targetRoom.phase === 'playing') {
      this.checkIfAllConnectedAnswered(targetRoom);
    }

    // Start 60-second reconnect grace timer
    this.clearDisconnectTimer(resolvedPlayerId);
    const timer = setTimeout(() => {
      void this.removeExpiredDisconnectedPlayer(targetRoom!.code, resolvedPlayerId!);
    }, RECONNECT_GRACE_MS);
    this.disconnectTimers.set(resolvedPlayerId, timer);
  }

  private async removeExpiredDisconnectedPlayer(
    code: string,
    playerId: string
  ): Promise<void> {
    this.disconnectTimers.delete(playerId);
    const room = await this.store.getRoom(code);
    if (!room) return;
    const session = room.players.get(playerId);
    if (!session || session.connected) return;

    await this.removePlayerFromRoom(room, playerId, 'หลุดการเชื่อมต่อเกิน 60 วินาที');
  }

  public async leaveCurrentRoomIfAny(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    playerId: string
  ): Promise<void> {
    this.clearDisconnectTimer(playerId);
    const code = await this.store.getPlayerRoomCode(playerId);
    if (!code) return;
    socket.leave(code);
    const room = await this.store.getRoom(code);
    if (!room) {
      await this.store.deletePlayerRoomCode(playerId);
      return;
    }
    await this.removePlayerFromRoom(room, playerId, 'ออกจากห้อง');
  }

  private async removePlayerFromRoom(
    room: RoomData,
    playerId: string,
    reason: string
  ): Promise<void> {
    const removed = room.players.get(playerId);
    if (!removed) return;

    room.players.delete(playerId);
    await this.store.deletePlayerRoomCode(playerId);

    if (room.players.size === 0) {
      this.clearRoomTimer(room.code);
      this.lastRevealPayloads.delete(room.code);
      this.lastGameOverPayloads.delete(room.code);
      await this.store.deleteRoom(room.code);
      return;
    }

    // Host transfer if the host left
    if (removed.isHost) {
      const nextHost =
        Array.from(room.players.values()).find((p) => p.connected) ||
        Array.from(room.players.values())[0];
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.isReady = true;
        this.io.to(room.code).emit('toast', {
          type: 'info',
          message: `${removed.nickname} ${reason} — โอนสิทธิ์หัวหน้าห้องให้ ${nextHost.nickname}`,
        });
      }
    }

    // Edge case: only 1 player remains in an active multiplayer game and everyone else left permanently
    if (
      (room.phase === 'playing' || room.phase === 'reveal' || room.phase === 'starting') &&
      room.players.size === 1
    ) {
      this.io.to(room.code).emit('toast', {
        type: 'warning',
        message: 'ผู้เล่นคนอื่นออกจากห้องหมดแล้ว จบเกมและสรุปผลคะแนน',
      });
      await this.finishGame(room);
      return;
    }

    await this.broadcastRoomState(room);

    if (room.phase === 'playing') {
      this.checkIfAllConnectedAnswered(room);
    }
  }

  public async toggleReady(playerId: string): Promise<void> {
    const room = await this.getRoomForPlayer(playerId);
    if (!room || room.phase !== 'lobby') return;
    const p = room.players.get(playerId);
    if (!p) return;
    p.isReady = !p.isReady;
    await this.broadcastRoomState(room);
  }

  public async updateSettings(
    playerId: string,
    partial: Partial<RoomSettings>
  ): Promise<void> {
    const room = await this.getRoomForPlayer(playerId);
    if (!room || room.phase !== 'lobby') return;
    const p = room.players.get(playerId);
    if (!p || !p.isHost) return;

    if (partial.category) {
      room.settings.category = this.validateCategory(partial.category);
    }
    if (partial.totalRounds) {
      room.settings.totalRounds = this.validateTotalRounds(partial.totalRounds);
    }
    if (partial.answerMode) {
      room.settings.answerMode = this.validateAnswerMode(partial.answerMode);
    }

    await this.broadcastRoomState(room);
  }

  public async startGameByHost(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    playerId: string
  ): Promise<void> {
    const room = await this.getRoomForPlayer(playerId);
    if (!room || room.phase !== 'lobby') return;
    const p = room.players.get(playerId);
    if (!p || !p.isHost) {
      socket.emit('toast', { type: 'error', message: 'เฉพาะหัวหน้าห้องเท่านั้นที่กดเริ่มเกมได้' });
      return;
    }

    room.phase = 'starting';
    room.startingEndsAt = Date.now() + 2000;
    await this.broadcastRoomState(room);

    const timer = setTimeout(() => {
      void this.beginMatchRounds(room.code);
    }, 2000);
    this.setRoomTimer(room.code, timer);
  }

  private async beginMatchRounds(code: string): Promise<void> {
    const room = await this.store.getRoom(code);
    if (!room) return;

    // Reset player stats for new match
    for (const p of room.players.values()) {
      p.score = 0;
      p.streak = 0;
      p.maxStreak = 0;
      p.correctCount = 0;
      p.fastestTimeMs = null;
      p.currentAnswer = null;
    }

    const { selected } = await pickTracksForRoom(
      room.settings.category,
      room.settings.totalRounds,
      room.usedTrackIds,
      this.store
    );

    room.roundTracks = selected;
    room.currentRound = 0;
    room.startingEndsAt = null;
    this.lastRevealPayloads.delete(room.code);
    this.lastGameOverPayloads.delete(room.code);

    await this.startNextRound(room.code);
  }

  private async startNextRound(code: string): Promise<void> {
    const room = await this.store.getRoom(code);
    if (!room) return;

    this.clearRoomTimer(code);

    if (room.currentRound >= room.settings.totalRounds || room.roundTracks.length === 0) {
      await this.finishGame(room);
      return;
    }

    const track = room.roundTracks[room.currentRound];
    if (!track) {
      await this.finishGame(room);
      return;
    }

    room.currentRound += 1;
    room.phase = 'playing';
    room.currentTrack = track;
    room.correctAnswersThisRound = 0;
    room.audioErrorPlayers.clear();

    for (const p of room.players.values()) {
      p.currentAnswer = null;
    }

    const fullPool = await getCategoryPool(room.settings.category, this.store);
    room.currentChoices =
      room.settings.answerMode === 'choice'
        ? buildChoicesForTrack(track, fullPool)
        : [];

    const now = Date.now();
    room.roundStartAt = now + ROUND_PRELOAD_MS;
    room.roundEndAt = room.roundStartAt + ROUND_DURATION_MS;

    await this.broadcastRoomState(room);

    const payload: RoundStartPayload = {
      round: room.currentRound,
      totalRounds: room.settings.totalRounds,
      mode: room.settings.answerMode,
      previewUrl: track.preview,
      startAtServerTime: room.roundStartAt,
      endAtServerTime: room.roundEndAt,
      choices: room.settings.answerMode === 'choice' ? room.currentChoices : undefined,
    };

    this.io.to(room.code).emit('round_start', payload);

    const timer = setTimeout(() => {
      void this.revealRound(room.code);
    }, ROUND_PRELOAD_MS + ROUND_DURATION_MS);
    this.setRoomTimer(room.code, timer);
  }

  public async submitAnswer(playerId: string, rawAnswer: unknown): Promise<void> {
    if (typeof rawAnswer !== 'string') return;
    const answer = rawAnswer.trim().slice(0, 120);
    if (!answer) return;

    const room = await this.getRoomForPlayer(playerId);
    if (!room || room.phase !== 'playing' || !room.currentTrack) return;

    const player = room.players.get(playerId);
    if (!player || player.currentAnswer !== null) return; // Can only answer once per round

    const serverNow = Date.now();
    if (serverNow > room.roundEndAt + 500) return; // Ignore late submissions

    const elapsedMs = Math.max(
      0,
      Math.min(ROUND_DURATION_MS, serverNow - room.roundStartAt)
    );

    const track = room.currentTrack;
    let isCorrect = false;

    if (room.settings.answerMode === 'choice') {
      const expectedChoice = `${track.title} — ${track.artist}`;
      isCorrect =
        answer === expectedChoice || isFuzzyAnswerMatch(answer.split(' — ')[0], track);
    } else {
      isCorrect = isFuzzyAnswerMatch(answer, track);
    }

    let correctOrder: number | null = null;
    if (isCorrect) {
      room.correctAnswersThisRound += 1;
      correctOrder = room.correctAnswersThisRound;
      player.streak += 1;
      if (player.streak > player.maxStreak) {
        player.maxStreak = player.streak;
      }
      player.correctCount += 1;
      if (player.fastestTimeMs === null || elapsedMs < player.fastestTimeMs) {
        player.fastestTimeMs = elapsedMs;
      }
    } else {
      player.streak = 0;
    }

    const scoreParts = calculateScore({
      correct: isCorrect,
      elapsedMs,
      roundDurationMs: ROUND_DURATION_MS,
      correctOrder: correctOrder ?? 0,
      newStreak: player.streak,
    });

    player.score += scoreParts.pointsEarned;
    player.currentAnswer = {
      submittedAnswer: answer,
      answeredAtServerTime: serverNow,
      timeMs: elapsedMs,
      correct: isCorrect,
      pointsEarned: scoreParts.pointsEarned,
      baseSpeedPoints: scoreParts.baseSpeedPoints,
      firstOrderBonus: scoreParts.firstOrderBonus,
      streakBonus: scoreParts.streakBonus,
      correctOrder,
    };

    await this.store.saveRoom(room);

    // Notify everyone that this player has answered (without revealing their answer or score yet!)
    this.io.to(room.code).emit('player_answered', {
      playerId: player.playerId,
      answeredAtServerTime: serverNow,
    });

    this.checkIfAllConnectedAnswered(room);
  }

  private checkIfAllConnectedAnswered(room: RoomData): void {
    if (room.phase !== 'playing') return;
    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.connected);
    if (
      connectedPlayers.length > 0 &&
      connectedPlayers.every((p) => p.currentAnswer !== null)
    ) {
      // Everyone has answered! End round in 700ms so the game feels responsive
      const timer = setTimeout(() => {
        void this.revealRound(room.code);
      }, 700);
      this.setRoomTimer(room.code, timer);
    }
  }

  public async handleAudioError(playerId: string, round: number): Promise<void> {
    const room = await this.getRoomForPlayer(playerId);
    if (!room || room.phase !== 'playing' || room.currentRound !== round) return;

    room.audioErrorPlayers.add(playerId);
    const connectedCount = Array.from(room.players.values()).filter((p) => p.connected).length;

    if (room.audioErrorPlayers.size >= Math.max(1, Math.ceil(connectedCount / 2))) {
      // Replace broken track with a guaranteed working fallback track and restart this round
      const replacement =
        FALLBACK_TRACKS.find((t) => !room.usedTrackIds.has(t.id)) || FALLBACK_TRACKS[0];
      room.usedTrackIds.add(replacement.id);
      room.roundTracks[room.currentRound - 1] = replacement;
      room.currentRound -= 1;

      this.io.to(room.code).emit('toast', {
        type: 'warning',
        message: 'เพลงโหลดไม่สำเร็จ ระบบทำการเปลี่ยนเพลงในรอบนี้ให้อัตโนมัติ',
      });
      await this.startNextRound(room.code);
    }
  }

  private async revealRound(code: string): Promise<void> {
    const room = await this.store.getRoom(code);
    if (!room || room.phase !== 'playing' || !room.currentTrack) return;

    this.clearRoomTimer(code);
    room.phase = 'reveal';

    const results: PlayerRoundResult[] = [];
    for (const p of room.players.values()) {
      if (!p.currentAnswer) {
        // Player did not answer in time -> streak resets to 0
        p.streak = 0;
        results.push({
          playerId: p.playerId,
          nickname: p.nickname,
          correct: false,
          submittedAnswer: null,
          timeMs: null,
          pointsEarned: 0,
          baseSpeedPoints: 0,
          firstOrderBonus: 0,
          streakBonus: 0,
          correctOrder: null,
          totalScore: p.score,
          streak: 0,
        });
      } else {
        results.push({
          playerId: p.playerId,
          nickname: p.nickname,
          correct: p.currentAnswer.correct,
          submittedAnswer: p.currentAnswer.submittedAnswer,
          timeMs: p.currentAnswer.timeMs,
          pointsEarned: p.currentAnswer.pointsEarned,
          baseSpeedPoints: p.currentAnswer.baseSpeedPoints,
          firstOrderBonus: p.currentAnswer.firstOrderBonus,
          streakBonus: p.currentAnswer.streakBonus,
          correctOrder: p.currentAnswer.correctOrder,
          totalScore: p.score,
          streak: p.streak,
        });
      }
    }

    const sortedLeaderboard = Array.from(room.players.values())
      .map((p) => this.toPublicPlayer(p))
      .sort((a, b) => b.score - a.score);

    const nextRoundAtServerTime = Date.now() + REVEAL_DURATION_MS;
    const revealPayload: RoundRevealPayload = {
      round: room.currentRound,
      totalRounds: room.settings.totalRounds,
      track: {
        id: room.currentTrack.id,
        title: room.currentTrack.title,
        artist: room.currentTrack.artist,
        cover: room.currentTrack.cover,
        preview: room.currentTrack.preview,
      },
      results,
      leaderboard: sortedLeaderboard,
      nextRoundAtServerTime,
    };

    this.lastRevealPayloads.set(room.code, revealPayload);
    await this.broadcastRoomState(room);
    this.io.to(room.code).emit('round_reveal', revealPayload);

    const timer = setTimeout(() => {
      void this.startNextRound(room.code);
    }, REVEAL_DURATION_MS);
    this.setRoomTimer(room.code, timer);
  }

  private async finishGame(room: RoomData): Promise<void> {
    this.clearRoomTimer(room.code);
    room.phase = 'finished';
    room.currentTrack = null;

    const sorted = Array.from(room.players.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      return (a.fastestTimeMs ?? 99999) - (b.fastestTimeMs ?? 99999);
    });

    const standings: FinalPlayerSummary[] = sorted.map((p, idx) => ({
      rank: idx + 1,
      playerId: p.playerId,
      nickname: p.nickname,
      avatarColor: p.avatarColor,
      score: p.score,
      correctCount: p.correctCount,
      totalRounds: room.settings.totalRounds,
      fastestTimeMs: p.fastestTimeMs,
      maxStreak: p.maxStreak,
    }));

    const payload: GameOverPayload = {
      code: room.code,
      totalRounds: room.settings.totalRounds,
      standings,
    };

    this.lastGameOverPayloads.set(room.code, payload);
    await this.broadcastRoomState(room);
    this.io.to(room.code).emit('game_over', payload);
  }

  public async playAgain(playerId: string): Promise<void> {
    const room = await this.getRoomForPlayer(playerId);
    if (!room || room.phase !== 'finished') return;

    this.clearRoomTimer(room.code);
    room.phase = 'lobby';
    room.currentRound = 0;
    room.currentTrack = null;
    room.startingEndsAt = null;
    for (const p of room.players.values()) {
      p.isReady = true;
      p.currentAnswer = null;
    }

    await this.broadcastRoomState(room);
  }

  public async sendEmoji(playerId: string, rawEmoji: unknown): Promise<void> {
    if (typeof rawEmoji !== 'string') return;
    if (!(ALLOWED_EMOJIS as readonly string[]).includes(rawEmoji)) return;

    const room = await this.getRoomForPlayer(playerId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;

    this.io.to(room.code).emit('emoji_reaction', {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playerId: player.playerId,
      nickname: player.nickname,
      emoji: rawEmoji,
    });
  }

  private async getRoomForPlayer(playerId: string): Promise<RoomData | undefined> {
    const code = await this.store.getPlayerRoomCode(playerId);
    if (!code) return undefined;
    return this.store.getRoom(code);
  }

  private setRoomTimer(code: string, timer: ReturnType<typeof setTimeout>): void {
    this.clearRoomTimer(code);
    this.roomTimers.set(code, timer);
  }

  private clearRoomTimer(code: string): void {
    const existing = this.roomTimers.get(code);
    if (existing) {
      clearTimeout(existing);
      this.roomTimers.delete(code);
    }
  }

  private clearDisconnectTimer(playerId: string): void {
    const existing = this.disconnectTimers.get(playerId);
    if (existing) {
      clearTimeout(existing);
      this.disconnectTimers.delete(playerId);
    }
  }

  private validateCategory(cat: unknown): Category {
    const valid: Category[] = ['thai', 'inter', 'kpop', 'retro', 'mixed'];
    return valid.includes(cat as Category) ? (cat as Category) : 'thai';
  }

  private validateTotalRounds(rounds: unknown): TotalRoundsOption {
    const valid: TotalRoundsOption[] = [5, 10, 15];
    return valid.includes(rounds as TotalRoundsOption)
      ? (rounds as TotalRoundsOption)
      : 10;
  }

  private validateAnswerMode(mode: unknown): AnswerMode {
    return mode === 'type' ? 'type' : 'choice';
  }

  private async cleanupStaleRooms(): Promise<void> {
    const now = Date.now();
    const rooms = await this.store.listRooms();
    for (const room of rooms) {
      const anyConnected = Array.from(room.players.values()).some((p) => p.connected);
      if (!anyConnected && now - room.lastActivityAt > RECONNECT_GRACE_MS + 10000) {
        this.clearRoomTimer(room.code);
        for (const pid of room.players.keys()) {
          await this.store.deletePlayerRoomCode(pid);
        }
        await this.store.deleteRoom(room.code);
      } else if (now - room.lastActivityAt > ROOM_IDLE_TIMEOUT_MS) {
        this.io.to(room.code).emit('room_closed', {
          reason: 'ห้องไม่มีความเคลื่อนไหวนานเกินไป ระบบปิดห้องอัตโนมัติ',
        });
        this.clearRoomTimer(room.code);
        for (const pid of room.players.keys()) {
          await this.store.deletePlayerRoomCode(pid);
        }
        await this.store.deleteRoom(room.code);
      }
    }
  }

  public dispose(): void {
    clearInterval(this.cleanupInterval);
    for (const t of this.roomTimers.values()) clearTimeout(t);
    for (const t of this.disconnectTimers.values()) clearTimeout(t);
    this.roomTimers.clear();
    this.disconnectTimers.clear();
  }
}
