import { TrackItem } from '../shared/types.js';

const PROFANITY_LIST = [
  'ควย',
  'หี',
  'เย็ด',
  'สัส',
  'เหี้ย',
  'ชาติหมา',
  'ส้นตีน',
  'มึง',
  'กู',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'dick',
  'pussy',
  'cunt',
];

export function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== 'string') return 'ผู้เล่นปริศนา';
  let cleaned = raw.trim().replace(/[\u0000-\u001F\u007F<>]/g, '');
  if (!cleaned) return 'ผู้เล่นปริศนา';
  if (cleaned.length > 18) {
    cleaned = cleaned.slice(0, 18);
  }
  for (const bad of PROFANITY_LIST) {
    const regex = new RegExp(bad, 'gi');
    cleaned = cleaned.replace(regex, '***');
  }
  return cleaned;
}

export function cleanSongTitleForDisplay(title: string): string {
  return title
    .replace(/\s*\((?:feat\.?|ft\.?|from|prod\.?|official|remaster|live|acoustic|version|ost|เพลงประกอบ)[^)]*\)/gi, '')
    .replace(/\s*\[(?:feat\.?|ft\.?|official|remaster|ost|เพลงประกอบ)[^\]]*\]/gi, '')
    .replace(/\s*-\s*(?:remastered|single|ost|เพลงประกอบ|live|version).*$/gi, '')
    .trim();
}

export function normalizeSongText(input: string): string {
  const withoutTags = cleanSongTitleForDisplay(input);
  return withoutTags
    .toLowerCase()
    .normalize('NFC')
    // Remove punctuation and symbols while keeping Thai (0E00-0E7F), Latin, Hangul, numbers, spaces
    .replace(/[^\p{L}\p{N}\u0E00-\u0E7F\s]/gu, '')
    .replace(/\s+/g, '')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

export function isFuzzyAnswerMatch(
  userInput: string,
  track: Pick<TrackItem, 'title' | 'aliases'>
): boolean {
  if (!userInput || typeof userInput !== 'string') return false;
  const normInput = normalizeSongText(userInput);
  if (!normInput) return false;

  const candidates = [
    track.title,
    cleanSongTitleForDisplay(track.title),
    ...(track.aliases ?? []),
  ];

  // Also add split parts if title has both Thai and English like "โต๊ะริม (Melt)" or "ทรงอย่างแบด (Bad Boy)"
  const parenMatches = track.title.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const m of parenMatches) {
      const inner = m.slice(1, -1).trim();
      if (inner && !/^(feat|ft|prod|ost|เพลงประกอบ)/i.test(inner)) {
        candidates.push(inner);
      }
    }
  }
  const slashParts = cleanSongTitleForDisplay(track.title).split(/\s*[/|-]\s*/);
  if (slashParts.length > 1) {
    for (const part of slashParts) {
      if (part.trim().length >= 2) candidates.push(part.trim());
    }
  }

  for (const rawCandidate of candidates) {
    const normTarget = normalizeSongText(rawCandidate);
    if (!normTarget) continue;

    if (normInput === normTarget) return true;

    const maxLen = Math.max(normInput.length, normTarget.length);
    const dist = levenshteinDistance(normInput, normTarget);

    // Allow 1 typo for short titles (3-5 chars), 2 typos for medium (6-10), or >= 75% similarity
    if (normTarget.length >= 3 && normTarget.length <= 5 && dist <= 1) {
      return true;
    }
    if (normTarget.length >= 6 && dist <= 2) {
      return true;
    }
    const similarity = 1 - dist / maxLen;
    if (normTarget.length >= 4 && similarity >= 0.75) {
      return true;
    }
  }

  return false;
}

export interface ScoreCalculationResult {
  pointsEarned: number;
  baseSpeedPoints: number;
  firstOrderBonus: number;
  streakBonus: number;
}

export function calculateScore(params: {
  correct: boolean;
  elapsedMs: number;
  roundDurationMs?: number;
  correctOrder: number; // 1 = first to answer right, 2 = second, etc.
  newStreak: number;    // 1 on first correct, 2 on 2nd consecutive correct, etc.
}): ScoreCalculationResult {
  const {
    correct,
    elapsedMs,
    roundDurationMs = 20000,
    correctOrder,
    newStreak,
  } = params;

  if (!correct) {
    return {
      pointsEarned: 0,
      baseSpeedPoints: 0,
      firstOrderBonus: 0,
      streakBonus: 0,
    };
  }

  const clampedMs = Math.max(0, Math.min(roundDurationMs, elapsedMs));
  const timeRatio = clampedMs / roundDurationMs;

  // Base 1000 points at 0s, scaling down linearly to 400 points at 20s
  const baseSpeedPoints = Math.round(1000 - timeRatio * 600);

  // Bonus for being among the first players to answer correctly in the round
  let firstOrderBonus = 0;
  if (correctOrder === 1) firstOrderBonus = 200;
  else if (correctOrder === 2) firstOrderBonus = 100;
  else if (correctOrder === 3) firstOrderBonus = 50;

  // Consecutive correct streak bonus (starts at streak >= 2)
  const streakBonus = newStreak >= 2 ? Math.min((newStreak - 1) * 100, 400) : 0;

  const pointsEarned = baseSpeedPoints + firstOrderBonus + streakBonus;

  return {
    pointsEarned,
    baseSpeedPoints,
    firstOrderBonus,
    streakBonus,
  };
}
