import { Category, QueueStatusPayload } from '../shared/types.js';

export interface QueuedPlayer {
  playerId: string;
  socketId: string;
  nickname: string;
  category: Category;
  joinedAt: number;
}

interface CategoryQueueBucket {
  players: Map<string, QueuedPlayer>; // key: playerId
  countdownEndsAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface MatchmakingCallbacks {
  onQueueUpdated: (category: Category, players: QueuedPlayer[], status: QueueStatusPayload) => void;
  onMatchReady: (category: Category, matchedPlayers: QueuedPlayer[]) => void | Promise<void>;
}

export class MatchmakingQueue {
  private buckets = new Map<Category, CategoryQueueBucket>();
  private playerCategory = new Map<string, Category>(); // playerId -> Category
  private readonly minPlayers: number;
  private readonly maxPlayers: number;
  private readonly countdownMs: number;
  private readonly callbacks: MatchmakingCallbacks;

  constructor(
    callbacks: MatchmakingCallbacks,
    options?: { minPlayers?: number; maxPlayers?: number; countdownMs?: number }
  ) {
    this.callbacks = callbacks;
    this.minPlayers = options?.minPlayers ?? 2;
    this.maxPlayers = options?.maxPlayers ?? 8;
    this.countdownMs = options?.countdownMs ?? 15000;

    const categories: Category[] = ['thai', 'tpop', 'tts', 'inter', 'kpop', 'retro', 'mixed'];
    for (const c of categories) {
      this.buckets.set(c, {
        players: new Map(),
        countdownEndsAt: null,
        timer: null,
      });
    }
  }

  public enqueue(player: Omit<QueuedPlayer, 'joinedAt'>): QueueStatusPayload {
    // Ensure player is removed from any previous queue first
    this.removeByPlayerId(player.playerId);

    const bucket = this.buckets.get(player.category)!;
    bucket.players.set(player.playerId, {
      ...player,
      joinedAt: Date.now(),
    });
    this.playerCategory.set(player.playerId, player.category);

    // Check if we reached maxPlayers (8) -> trigger match immediately
    if (bucket.players.size >= this.maxPlayers) {
      this.triggerMatch(player.category);
      return this.getStatus(player.category, false);
    }

    // If we reached minPlayers (2) and countdown hasn't started yet, start 15s countdown
    if (bucket.players.size >= this.minPlayers && bucket.timer === null) {
      bucket.countdownEndsAt = Date.now() + this.countdownMs;
      bucket.timer = setTimeout(() => {
        bucket.timer = null;
        bucket.countdownEndsAt = null;
        this.triggerMatch(player.category);
      }, this.countdownMs);
    }

    const status = this.getStatus(player.category, true);
    this.callbacks.onQueueUpdated(
      player.category,
      Array.from(bucket.players.values()),
      status
    );
    return status;
  }

  public removeByPlayerId(playerId: string): void {
    const category = this.playerCategory.get(playerId);
    if (!category) return;
    this.playerCategory.delete(playerId);

    const bucket = this.buckets.get(category);
    if (!bucket) return;

    bucket.players.delete(playerId);

    if (bucket.players.size < this.minPlayers && bucket.timer !== null) {
      clearTimeout(bucket.timer);
      bucket.timer = null;
      bucket.countdownEndsAt = null;
    }

    const status = this.getStatus(category, true);
    this.callbacks.onQueueUpdated(
      category,
      Array.from(bucket.players.values()),
      status
    );
  }

  public removeBySocketId(socketId: string): void {
    for (const bucket of this.buckets.values()) {
      for (const p of bucket.players.values()) {
        if (p.socketId === socketId) {
          this.removeByPlayerId(p.playerId);
          return;
        }
      }
    }
  }

  public getStatus(category: Category, inQueue = true): QueueStatusPayload {
    const bucket = this.buckets.get(category)!;
    return {
      inQueue,
      category,
      playersCount: bucket.players.size,
      minPlayers: this.minPlayers,
      maxPlayers: this.maxPlayers,
      countdownEndsAt: bucket.countdownEndsAt,
    };
  }

  private triggerMatch(category: Category): void {
    const bucket = this.buckets.get(category)!;
    if (bucket.timer !== null) {
      clearTimeout(bucket.timer);
      bucket.timer = null;
    }
    bucket.countdownEndsAt = null;

    if (bucket.players.size < this.minPlayers) {
      return;
    }

    const allQueued = Array.from(bucket.players.values());
    const matched = allQueued.slice(0, this.maxPlayers);

    for (const p of matched) {
      bucket.players.delete(p.playerId);
      this.playerCategory.delete(p.playerId);
    }

    // If remaining players in bucket still >= minPlayers, start a new countdown for them
    if (bucket.players.size >= this.minPlayers) {
      bucket.countdownEndsAt = Date.now() + this.countdownMs;
      bucket.timer = setTimeout(() => {
        bucket.timer = null;
        bucket.countdownEndsAt = null;
        this.triggerMatch(category);
      }, this.countdownMs);
    }

    if (bucket.players.size > 0) {
      const status = this.getStatus(category, true);
      this.callbacks.onQueueUpdated(
        category,
        Array.from(bucket.players.values()),
        status
      );
    }

    void this.callbacks.onMatchReady(category, matched);
  }

  public clearAll(): void {
    for (const bucket of this.buckets.values()) {
      if (bucket.timer) {
        clearTimeout(bucket.timer);
        bucket.timer = null;
      }
      bucket.players.clear();
      bucket.countdownEndsAt = null;
    }
    this.playerCategory.clear();
  }
}
