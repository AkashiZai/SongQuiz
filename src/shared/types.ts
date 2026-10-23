export type Category =
  | 'thai'
  | 'rock'
  | 'rap'
  | 'tpop'
  | 'idol48'
  | 'anime'
  | 'tts'
  | 'inter'
  | 'kpop'
  | 'retro'
  | 'mixed';

export type AnswerMode = 'choice' | 'type';

export type TotalRoundsOption = 5 | 10 | 15;

export interface RoomSettings {
  category: Category;
  totalRounds: TotalRoundsOption;
  answerMode: AnswerMode;
}

export interface TrackItem {
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview: string;
  aliases?: string[];
  animeTitle?: string;
  category: Category;
}

export interface PublicPlayer {
  playerId: string;
  nickname: string;
  avatarColor: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  fastestTimeMs: number | null;
  hasAnsweredCurrentRound: boolean;
}

export type RoomPhase = 'lobby' | 'starting' | 'playing' | 'reveal' | 'finished';

export interface PublicRoomState {
  code: string;
  isQuickMatch: boolean;
  phase: RoomPhase;
  settings: RoomSettings;
  players: PublicPlayer[];
  currentRound: number;
  totalRounds: number;
  startingEndsAt: number | null;
}

export interface QueueStatusPayload {
  inQueue: boolean;
  category: Category;
  playersCount: number;
  minPlayers: number;
  maxPlayers: number;
  countdownEndsAt: number | null;
}

export interface RoundStartPayload {
  round: number;
  totalRounds: number;
  mode: AnswerMode;
  previewUrl: string;
  startAtServerTime: number;
  endAtServerTime: number;
  choices?: string[];
}

export interface PlayerRoundResult {
  playerId: string;
  nickname: string;
  correct: boolean;
  submittedAnswer: string | null;
  timeMs: number | null;
  pointsEarned: number;
  baseSpeedPoints: number;
  firstOrderBonus: number;
  streakBonus: number;
  correctOrder: number | null;
  totalScore: number;
  streak: number;
}

export interface RoundRevealPayload {
  round: number;
  totalRounds: number;
  track: {
    id: string;
    title: string;
    artist: string;
    cover: string;
    preview: string;
  };
  results: PlayerRoundResult[];
  leaderboard: PublicPlayer[];
  nextRoundAtServerTime: number;
}

export interface FinalPlayerSummary {
  rank: number;
  playerId: string;
  nickname: string;
  avatarColor: string;
  score: number;
  correctCount: number;
  totalRounds: number;
  fastestTimeMs: number | null;
  maxStreak: number;
}

export interface GameOverPayload {
  code: string;
  totalRounds: number;
  standings: FinalPlayerSummary[];
}

export interface EmojiReactionPayload {
  id: string;
  playerId: string;
  nickname: string;
  emoji: string;
}

export interface ToastPayload {
  type: 'info' | 'warning' | 'error';
  message: string;
}

export interface ClientToServerEvents {
  sync_time: (payload: { clientSentAt: number }) => void;
  reconnect_player: (payload: { playerId: string; nickname?: string }) => void;
  join_queue: (payload: { playerId: string; nickname: string; category: Category }) => void;
  leave_queue: () => void;
  create_room: (payload: {
    playerId: string;
    nickname: string;
    settings?: Partial<RoomSettings>;
  }) => void;
  join_room: (payload: { playerId: string; nickname: string; code: string }) => void;
  leave_room: () => void;
  toggle_ready: () => void;
  update_settings: (payload: Partial<RoomSettings>) => void;
  start_game: () => void;
  submit_answer: (payload: { answer: string }) => void;
  audio_error: (payload: { round: number }) => void;
  send_emoji: (payload: { emoji: string }) => void;
  play_again: () => void;
}

export interface ServerToClientEvents {
  time_synced: (payload: { clientSentAt: number; serverTime: number }) => void;
  queue_update: (payload: QueueStatusPayload) => void;
  room_state: (payload: PublicRoomState) => void;
  round_start: (payload: RoundStartPayload) => void;
  player_answered: (payload: { playerId: string; answeredAtServerTime: number }) => void;
  round_reveal: (payload: RoundRevealPayload) => void;
  game_over: (payload: GameOverPayload) => void;
  emoji_reaction: (payload: EmojiReactionPayload) => void;
  toast: (payload: ToastPayload) => void;
  room_closed: (payload: { reason: string }) => void;
}

export const CATEGORY_LABELS: Record<Category, { name: string; emoji: string; desc: string }> = {
  thai: { name: 'เพลงไทยฮิต', emoji: '🇹🇭', desc: 'เพลงไทยฮิตติดชาร์ตทุกแนว' },
  rock: {
    name: 'ร็อก / อัลเทอร์ไทย (90s-2010)',
    emoji: '🎸',
    desc: 'LOSO, Silly Fools, Bodyslam, Big Ass, Clash, หิน เหล็ก ไฟ, Moderndog',
  },
  rap: {
    name: 'แร็ป / ฮิปฮอปไทย',
    emoji: '🎤',
    desc: 'Illslick, YOUNGOHM, P9d, Younggu, F.HERO, SARAN, 1MILL',
  },
  tpop: { name: 'T-POP ไอดอล', emoji: '✨', desc: 'BUS, 4EVE, PROXIE, PiXXiE, LYKN, ATLAS' },
  idol48: { name: '48 Group (BNK/CGM/AKB)', emoji: '🌸', desc: 'รวมเพลง BNK48, CGM48 และ AKB48' },
  anime: { name: 'เพลงอนิเมะ (Anime OP/ED)', emoji: '⛩️', desc: 'รวมเพลงอนิเมะดังหลากหลายเรื่องและยุคสมัย' },
  tts: { name: 'AI อ่านเนื้อเพลง', emoji: '🤖', desc: 'Siri / Google อ่านท่อนฮิตให้ทาย' },
  inter: { name: 'เพลงสากลฮิต', emoji: '🌎', desc: 'Billboard & Global Pop Hits' },
  kpop: { name: 'K-Pop', emoji: '🇰🇷', desc: 'ไอดอลเกาหลีฮิตทั่วโลก' },
  retro: { name: 'ยุค 2000s/2010s', emoji: '💿', desc: 'เพลงดังวันวานที่ทุกคนร้องตามได้' },
  mixed: { name: 'ผสมทุกหมวด', emoji: '🎲', desc: 'สุ่มรวมทุกแนวท้าทายความแม่น' },
};

export const ALLOWED_EMOJIS = ['🔥', '😂', '😭', '🎉', '🤯', '❤️', '👏', '🎵'] as const;
