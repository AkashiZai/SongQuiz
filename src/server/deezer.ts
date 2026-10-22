import { Category, TrackItem } from '../shared/types.js';
import { cleanSongTitleForDisplay, normalizeSongText } from './scoring.js';
import { StateStore } from './store.js';

const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes so artist rotation stays fresh across games

const CATEGORY_QUERIES: Record<Exclude<Category, 'mixed'>, string[]> = {
  thai: [
    'Yented',
    'SAUCE BKK ขี้แง',
    'NONT TANONT',
    'PUN',
    'Only Monday',
    'SERIOUS BACON',
    'No One Else เธอ',
    'Safeplanet',
    'Mirrr',
    'Dept เพลง',
    'Patrickananda',
    'MEYOU วันนี้ปีที่แล้ว',
    'LANDOKMAI',
    'Purpeech',
    'SLAPKISS',
    'SARAN ลืมแทบไม่ไหว',
    'ZENTYARB',
    'PONCHET พี่ชอบหนูที่สุดเลย',
    'Tattoo Colour',
    'Scrubb',
    'Cocktail ดึงดัน',
    'Lipta',
    'PiXXiE',
    'PROXIE',
    'BUS Because of you i shine',
    'URBOYTJ',
    'MILLI พักก่อน',
    'YOUNGOHM',
    'Wanyai เจ็บจนพอ',
    'Zom Marie',
    'Whal & Dolph',
    'TELEx TELEXs',
    'Violette Wautier',
    'Palmy',
    'Slot Machine เคลิ้ม',
    'Getsunova',
    'Klear คำยินดี',
    '25hours ไม่เคย',
    'Labanoon',
    'STAMP มันคงเป็นความรัก',
    'THE TOYS ลาลาลอย',
    'GAVIN:D',
    'F.HERO',
    'PP Krit ลังเล',
    'JOEY PHUWASIT นะหน้าทอง',
    'LOMOSONIC ขอ',
    'Three Man Down',
    'Tilly Birds',
    'Billkin',
    'BOWKYLION',
    'Jeff Satur',
    '4EVE',
    'POTATO',
    'Bodyslam',
    'INK WARUNTORN',
    'Paper Planes',
    'Fellow Fellow',
    'Polycat',
    'Anatomy Rabbit',
  ],
  inter: [
    'Taylor Swift',
    'The Weeknd',
    'Bruno Mars',
    'Dua Lipa',
    'Billie Eilish',
    'Sabrina Carpenter',
    'Ariana Grande',
    'Ed Sheeran',
    'Post Malone',
    'Coldplay',
    'Olivia Rodrigo',
    'Charlie Puth',
    'Shawn Mendes',
    'Justin Bieber',
    'Harry Styles',
    'SZA',
    'Doja Cat',
    'Imagine Dragons',
    'OneRepublic',
    'The Chainsmokers',
    'Kendrick Lamar',
    'Hozier',
    'Benson Boone',
    'Chappell Roan',
    'Lana Del Rey',
  ],
  kpop: [
    'BLACKPINK',
    'NewJeans',
    'BTS',
    'TWICE',
    'aespa',
    'IVE',
    'LE SSERAFIM',
    'SEVENTEEN',
    'Stray Kids',
    'ROSE APT',
    'BABYMONSTER',
    'ILLIT',
    'ITZY',
    'Red Velvet',
    '(G)I-DLE',
    'EXO',
    'NCT DREAM',
    'ENHYPEN',
    'TOMORROW X TOGETHER',
    'KISS OF LIFE',
    'TREASURE',
    'DAY6',
    'IU',
    'Jungkook',
    'Lisa',
  ],
  retro: [
    'Linkin Park',
    'Maroon 5',
    'Britney Spears',
    'Avril Lavigne',
    'Backstreet Boys',
    'Lady Gaga',
    'Katy Perry',
    'Eminem',
    'Rihanna',
    'Green Day',
    'Black Eyed Peas',
    'Beyonce',
    'Usher',
    'Nelly',
    'Gwen Stefani',
    'Kelly Clarkson',
    'Paramore',
    'My Chemical Romance',
    'Fall Out Boy',
    'Simple Plan',
    'Westlife',
    'Blue',
    'Shakira',
    'Akon',
  ],
};

// Fallback tracks used when Deezer API is down or unreachable
export const FALLBACK_TRACKS: TrackItem[] = [
  {
    id: 'fb-thai-1',
    title: 'ฝนตกไหม',
    artist: 'Three Man Down',
    cover: 'https://picsum.photos/seed/th1/400/400',
    preview: '/api/fallback-audio/fb-thai-1.wav',
    aliases: ['ฝนตกไหม', 'fon tok mai'],
    category: 'thai',
  },
  {
    id: 'fb-thai-2',
    title: 'คิด(แต่ไม่)ถึง (Same Page?)',
    artist: 'Tilly Birds',
    cover: 'https://picsum.photos/seed/th2/400/400',
    preview: '/api/fallback-audio/fb-thai-2.wav',
    aliases: ['คิดแต่ไม่ถึง', 'same page'],
    category: 'thai',
  },
  {
    id: 'fb-thai-3',
    title: 'โต๊ะริม (Melt)',
    artist: 'NONT TANONT',
    cover: 'https://picsum.photos/seed/th3/400/400',
    preview: '/api/fallback-audio/fb-thai-3.wav',
    aliases: ['โต๊ะริม', 'melt'],
    category: 'thai',
  },
  {
    id: 'fb-thai-4',
    title: 'ซ่อน(ไม่)หา (Ghost)',
    artist: 'Jeff Satur',
    cover: 'https://picsum.photos/seed/th4/400/400',
    preview: '/api/fallback-audio/fb-thai-4.wav',
    aliases: ['ซ่อนไม่หา', 'ghost'],
    category: 'thai',
  },
  {
    id: 'fb-thai-5',
    title: 'ทรงอย่างแบด (Bad Boy)',
    artist: 'Paper Planes',
    cover: 'https://picsum.photos/seed/th5/400/400',
    preview: '/api/fallback-audio/fb-thai-5.wav',
    aliases: ['ทรงอย่างแบด', 'bad boy'],
    category: 'thai',
  },
  {
    id: 'fb-thai-6',
    title: 'วาดไว้ (recall)',
    artist: 'BOWKYLION',
    cover: 'https://picsum.photos/seed/th6/400/400',
    preview: '/api/fallback-audio/fb-thai-6.wav',
    aliases: ['วาดไว้', 'recall'],
    category: 'thai',
  },
  {
    id: 'fb-thai-7',
    title: 'ที่รักใจเย็น',
    artist: 'Yented',
    cover: 'https://picsum.photos/seed/th7/400/400',
    preview: '/api/fallback-audio/fb-thai-7.wav',
    aliases: ['ที่รักใจเย็น', 'her'],
    category: 'thai',
  },
  {
    id: 'fb-thai-8',
    title: 'DAY ONE',
    artist: 'PUN',
    cover: 'https://picsum.photos/seed/th8/400/400',
    preview: '/api/fallback-audio/fb-thai-8.wav',
    aliases: ['day one'],
    category: 'thai',
  },
  {
    id: 'fb-inter-1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    cover: 'https://picsum.photos/seed/in1/400/400',
    preview: '/api/fallback-audio/fb-inter-1.wav',
    aliases: ['blinding lights'],
    category: 'inter',
  },
  {
    id: 'fb-inter-2',
    title: 'Shake It Off',
    artist: 'Taylor Swift',
    cover: 'https://picsum.photos/seed/in2/400/400',
    preview: '/api/fallback-audio/fb-inter-2.wav',
    aliases: ['shake it off'],
    category: 'inter',
  },
  {
    id: 'fb-inter-3',
    title: 'Levitating',
    artist: 'Dua Lipa',
    cover: 'https://picsum.photos/seed/in3/400/400',
    preview: '/api/fallback-audio/fb-inter-3.wav',
    aliases: ['levitating'],
    category: 'inter',
  },
  {
    id: 'fb-inter-4',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    cover: 'https://picsum.photos/seed/in4/400/400',
    preview: '/api/fallback-audio/fb-inter-4.wav',
    aliases: ['shape of you'],
    category: 'inter',
  },
  {
    id: 'fb-inter-5',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    cover: 'https://picsum.photos/seed/in5/400/400',
    preview: '/api/fallback-audio/fb-inter-5.wav',
    aliases: ['espresso'],
    category: 'inter',
  },
  {
    id: 'fb-kpop-1',
    title: 'DDU-DU DDU-DU',
    artist: 'BLACKPINK',
    cover: 'https://picsum.photos/seed/kp1/400/400',
    preview: '/api/fallback-audio/fb-kpop-1.wav',
    aliases: ['ddu du ddu du', 'ddududdudu'],
    category: 'kpop',
  },
  {
    id: 'fb-kpop-2',
    title: 'Hype Boy',
    artist: 'NewJeans',
    cover: 'https://picsum.photos/seed/kp2/400/400',
    preview: '/api/fallback-audio/fb-kpop-2.wav',
    aliases: ['hype boy'],
    category: 'kpop',
  },
  {
    id: 'fb-kpop-3',
    title: 'Dynamite',
    artist: 'BTS',
    cover: 'https://picsum.photos/seed/kp3/400/400',
    preview: '/api/fallback-audio/fb-kpop-3.wav',
    aliases: ['dynamite'],
    category: 'kpop',
  },
  {
    id: 'fb-kpop-4',
    title: 'Supernova',
    artist: 'aespa',
    cover: 'https://picsum.photos/seed/kp4/400/400',
    preview: '/api/fallback-audio/fb-kpop-4.wav',
    aliases: ['supernova'],
    category: 'kpop',
  },
  {
    id: 'fb-retro-1',
    title: 'In the End',
    artist: 'Linkin Park',
    cover: 'https://picsum.photos/seed/rt1/400/400',
    preview: '/api/fallback-audio/fb-retro-1.wav',
    aliases: ['in the end'],
    category: 'retro',
  },
  {
    id: 'fb-retro-2',
    title: 'This Love',
    artist: 'Maroon 5',
    cover: 'https://picsum.photos/seed/rt2/400/400',
    preview: '/api/fallback-audio/fb-retro-2.wav',
    aliases: ['this love'],
    category: 'retro',
  },
  {
    id: 'fb-retro-3',
    title: 'Toxic',
    artist: 'Britney Spears',
    cover: 'https://picsum.photos/seed/rt3/400/400',
    preview: '/api/fallback-audio/fb-retro-3.wav',
    aliases: ['toxic'],
    category: 'retro',
  },
  {
    id: 'fb-retro-4',
    title: 'Bad Romance',
    artist: 'Lady Gaga',
    cover: 'https://picsum.photos/seed/rt4/400/400',
    preview: '/api/fallback-audio/fb-retro-4.wav',
    aliases: ['bad romance'],
    category: 'retro',
  },
];

interface DeezerTrackRaw {
  id: number | string;
  title?: string;
  title_short?: string;
  preview?: string;
  artist?: { name?: string };
  album?: { cover_big?: string; cover_medium?: string };
}

const THAI_SCRIPT_REGEX = /[\u0E00-\u0E7F]/;

function isRelevantTrackForQuery(
  item: DeezerTrackRaw,
  query: string,
  category: Category
): boolean {
  const artistName = (item.artist?.name || '').toLowerCase();
  const rawTitle = (item.title || '').toLowerCase();
  const qLower = query.toLowerCase();

  // Extract ASCII words from query to match artist name
  const asciiQueryPart = qLower.replace(/[\u0E00-\u0E7F]/g, '').trim();
  const artistMatchesQuery =
    asciiQueryPart.length >= 2 &&
    (artistName.includes(asciiQueryPart) || asciiQueryPart.includes(artistName));

  if (category === 'thai') {
    const hasThaiScript =
      THAI_SCRIPT_REGEX.test(rawTitle) || THAI_SCRIPT_REGEX.test(artistName);
    return artistMatchesQuery || hasThaiScript;
  }

  return artistMatchesQuery || rawTitle.includes(qLower);
}

async function fetchDeezerQuery(query: string, category: Category): Promise<TrackItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: DeezerTrackRaw[] };
    if (!Array.isArray(json.data)) return [];

    const matched: TrackItem[] = [];
    for (const item of json.data) {
      if (!item.preview || typeof item.preview !== 'string' || !item.title) continue;
      if (!isRelevantTrackForQuery(item, query, category)) continue;

      const cleanTitle = cleanSongTitleForDisplay(item.title_short || item.title);
      if (!cleanTitle) continue;

      const aliases = new Set<string>([cleanTitle, item.title]);
      if (item.title_short) aliases.add(item.title_short);

      matched.push({
        id: String(item.id),
        title: cleanTitle,
        artist: item.artist?.name || 'Unknown Artist',
        cover:
          item.album?.cover_big ||
          item.album?.cover_medium ||
          'https://picsum.photos/seed/music/400/400',
        preview: `/api/audio?url=${encodeURIComponent(item.preview)}`,
        aliases: Array.from(aliases),
        category,
      });
    }

    // Cap to at most 2 random tracks per query so no single artist floods the pool
    return shuffleArray(matched).slice(0, 2);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCategoryPool(
  category: Category,
  store: StateStore
): Promise<TrackItem[]> {
  const cached = await store.getCachedTracks(category);
  if (cached && cached.length >= 20) {
    return cached;
  }

  let queries: Array<{ q: string; cat: Category }> = [];
  if (category === 'mixed') {
    const subCats: Array<Exclude<Category, 'mixed'>> = ['thai', 'inter', 'kpop', 'retro'];
    for (const c of subCats) {
      const sample = shuffleArray(CATEGORY_QUERIES[c]).slice(0, 6);
      for (const q of sample) {
        queries.push({ q, cat: c });
      }
    }
  } else {
    // Sample 22 different artists per category fetch for wide artist rotation
    const list = shuffleArray(CATEGORY_QUERIES[category]).slice(0, 22);
    queries = list.map((q) => ({ q, cat: category }));
  }

  const fetchedBatches = await Promise.all(
    queries.map(({ q, cat }) => fetchDeezerQuery(q, cat))
  );

  const deduped = new Map<string, TrackItem>();
  for (const batch of fetchedBatches) {
    for (const track of batch) {
      const normKey = normalizeSongText(track.title);
      if (!normKey) continue;
      if (!deduped.has(normKey)) {
        deduped.set(normKey, track);
      }
    }
  }

  // Merge fallback tracks if Deezer returned fewer than 20 songs
  if (deduped.size < 20) {
    const relevantFallbacks =
      category === 'mixed'
        ? FALLBACK_TRACKS
        : [
            ...FALLBACK_TRACKS.filter((t) => t.category === category),
            ...FALLBACK_TRACKS.filter((t) => t.category !== category),
          ];
    for (const fb of relevantFallbacks) {
      const normKey = normalizeSongText(fb.title);
      if (!deduped.has(normKey)) {
        deduped.set(normKey, fb);
      }
    }
  }

  const finalPool = Array.from(deduped.values());
  await store.setCachedTracks(category, finalPool, CACHE_TTL_MS);
  return finalPool;
}

/**
 * Picks `count` tracks for a room while enforcing maximum artist diversity
 * (picks 1 song per distinct artist first before ever repeating an artist).
 */
export async function pickTracksForRoom(
  category: Category,
  count: number,
  usedTrackIds: Set<string>,
  store: StateStore
): Promise<{ selected: TrackItem[]; fullPool: TrackItem[] }> {
  const pool = await getCategoryPool(category, store);
  const unused = pool.filter((t) => !usedTrackIds.has(t.id));
  const source = unused.length >= count ? unused : pool;

  // Group available songs by normalized artist name
  const byArtist = new Map<string, TrackItem[]>();
  for (const track of shuffleArray(source)) {
    const artistKey = track.artist.toLowerCase().trim();
    const list = byArtist.get(artistKey) ?? [];
    list.push(track);
    byArtist.set(artistKey, list);
  }

  // Round-robin selection across shuffled artists: guarantees 1 song per artist first!
  const artistBuckets = shuffleArray(Array.from(byArtist.values()));
  const selected: TrackItem[] = [];
  let pass = 0;

  while (selected.length < count) {
    let addedInPass = false;
    for (const bucket of artistBuckets) {
      if (pass < bucket.length) {
        selected.push(bucket[pass]);
        addedInPass = true;
        if (selected.length >= count) break;
      }
    }
    if (!addedInPass) break;
    pass += 1;
  }

  for (const t of selected) {
    usedTrackIds.add(t.id);
  }

  return { selected: shuffleArray(selected), fullPool: pool };
}

export function buildChoicesForTrack(target: TrackItem, pool: TrackItem[]): string[] {
  const targetNorm = normalizeSongText(target.title);
  const targetArtistKey = target.artist.toLowerCase().trim();

  const sameCatDifferentArtist = pool.filter(
    (t) =>
      t.id !== target.id &&
      normalizeSongText(t.title) !== targetNorm &&
      t.category === target.category &&
      t.artist.toLowerCase().trim() !== targetArtistKey
  );
  const otherPool = pool.filter(
    (t) =>
      t.id !== target.id &&
      normalizeSongText(t.title) !== targetNorm &&
      !sameCatDifferentArtist.includes(t)
  );

  const candidates = [
    ...shuffleArray(sameCatDifferentArtist),
    ...shuffleArray(otherPool),
  ];

  const distractors: string[] = [];
  const usedNorms = new Set<string>([targetNorm]);
  const usedArtists = new Set<string>([targetArtistKey]);

  // First pass: prefer distractors with distinct artists so all 4 choices feature different artists
  for (const c of candidates) {
    const n = normalizeSongText(c.title);
    const aKey = c.artist.toLowerCase().trim();
    if (!usedNorms.has(n) && !usedArtists.has(aKey)) {
      usedNorms.add(n);
      usedArtists.add(aKey);
      distractors.push(`${c.title} — ${c.artist}`);
      if (distractors.length === 3) break;
    }
  }

  // Fallback pass if pool has fewer than 4 distinct artists
  for (const c of [...candidates, ...FALLBACK_TRACKS]) {
    if (distractors.length >= 3) break;
    const n = normalizeSongText(c.title);
    if (!usedNorms.has(n)) {
      usedNorms.add(n);
      distractors.push(`${c.title} — ${c.artist}`);
    }
  }

  const correctLabel = `${target.title} — ${target.artist}`;
  return shuffleArray([correctLabel, ...distractors.slice(0, 3)]);
}

export function shuffleArray<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates a pleasant 15-second melodic WAV buffer so fallback tracks work offline without external audio dependencies.
 */
export function generateFallbackWav(seedStr: string): Buffer {
  const sampleRate = 22050;
  const durationSec = 15;
  const numSamples = sampleRate * durationSec;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }

  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const step = Math.floor(t * 2.5);
    const noteIdx = (hash + step * 3 + (step % 2)) % scale.length;
    const freq = scale[noteIdx];
    const beatTime = (t * 2.5) % 1;
    const env = Math.exp(-beatTime * 3.5);
    const wave =
      Math.sin(2 * Math.PI * freq * t) * 0.6 +
      Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.3;
    const sample = Math.max(-1, Math.min(1, wave * env * 0.4));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return buffer;
}
