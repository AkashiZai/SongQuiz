import {
  Category,
  RoomPhase,
  RoomSettings,
  TrackItem,
} from '../shared/types.js';

export interface PlayerSession {
  playerId: string;
  socketId: string;
  nickname: string;
  avatarColor: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  disconnectedAt: number | null;
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  fastestTimeMs: number | null;
  currentAnswer: {
    submittedAnswer: string;
    answeredAtServerTime: number;
    timeMs: number;
    correct: boolean;
    pointsEarned: number;
    baseSpeedPoints: number;
    firstOrderBonus: number;
    streakBonus: number;
    correctOrder: number | null;
  } | null;
}

export interface RoomData {
  code: string;
  isQuickMatch: boolean;
  phase: RoomPhase;
  settings: RoomSettings;
  players: Map<string, PlayerSession>; // key: playerId
  usedTrackIds: Set<string>;
  roundTracks: TrackItem[];
  currentRound: number;
  currentTrack: TrackItem | null;
  currentChoices: string[];
  roundStartAt: number;
  roundEndAt: number;
  startingEndsAt: number | null;
  correctAnswersThisRound: number;
  audioErrorPlayers: Set<string>;
  lastActivityAt: number;
}

/**
 * StateStore abstraction layer so the backing store can be swapped
 * from in-memory to Redis without rewriting game/room business logic.
 */
export interface StateStore {
  getRoom(code: string): Promise<RoomData | undefined>;
  saveRoom(room: RoomData): Promise<void>;
  deleteRoom(code: string): Promise<void>;
  listRooms(): Promise<RoomData[]>;

  getPlayerRoomCode(playerId: string): Promise<string | undefined>;
  setPlayerRoomCode(playerId: string, code: string): Promise<void>;
  deletePlayerRoomCode(playerId: string): Promise<void>;

  getCachedTracks(category: Category): Promise<TrackItem[] | null>;
  setCachedTracks(category: Category, tracks: TrackItem[], ttlMs: number): Promise<void>;
}

// ponytail: in-memory implementation first; swap with RedisStateStore implementing StateStore when scaling horizontally
export class InMemoryStateStore implements StateStore {
  private rooms = new Map<string, RoomData>();
  private playerRoomMap = new Map<string, string>();
  private trackCache = new Map<Category, { tracks: TrackItem[]; expiresAt: number }>();

  async getRoom(code: string): Promise<RoomData | undefined> {
    return this.rooms.get(code.toUpperCase());
  }

  async saveRoom(room: RoomData): Promise<void> {
    this.rooms.set(room.code.toUpperCase(), room);
  }

  async deleteRoom(code: string): Promise<void> {
    this.rooms.delete(code.toUpperCase());
  }

  async listRooms(): Promise<RoomData[]> {
    return Array.from(this.rooms.values());
  }

  async getPlayerRoomCode(playerId: string): Promise<string | undefined> {
    return this.playerRoomMap.get(playerId);
  }

  async setPlayerRoomCode(playerId: string, code: string): Promise<void> {
    this.playerRoomMap.set(playerId, code.toUpperCase());
  }

  async deletePlayerRoomCode(playerId: string): Promise<void> {
    this.playerRoomMap.delete(playerId);
  }

  async getCachedTracks(category: Category): Promise<TrackItem[] | null> {
    const entry = this.trackCache.get(category);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.trackCache.delete(category);
      return null;
    }
    return entry.tracks;
  }

  async setCachedTracks(category: Category, tracks: TrackItem[], ttlMs: number): Promise<void> {
    this.trackCache.set(category, {
      tracks,
      expiresAt: Date.now() + ttlMs,
    });
  }
}
