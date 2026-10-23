import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MatchmakingQueue, QueuedPlayer } from '../src/server/matchmaking.js';
import {
  calculateScore,
  isFuzzyAnswerMatch,
  sanitizeNickname,
} from '../src/server/scoring.js';

describe('Scoring System (calculateScore)', () => {
  it('returns 0 points when answer is wrong regardless of speed or streak', () => {
    const res = calculateScore({
      correct: false,
      elapsedMs: 1200,
      correctOrder: 1,
      newStreak: 5,
    });
    assert.equal(res.pointsEarned, 0);
    assert.equal(res.baseSpeedPoints, 0);
    assert.equal(res.firstOrderBonus, 0);
    assert.equal(res.streakBonus, 0);
  });

  it('awards higher points for faster answers and applies 1st/2nd/3rd order bonuses', () => {
    const instantFirst = calculateScore({
      correct: true,
      elapsedMs: 0,
      roundDurationMs: 20000,
      correctOrder: 1,
      newStreak: 1,
    });
    // 1000 base + 200 first bonus + 0 streak
    assert.equal(instantFirst.baseSpeedPoints, 1000);
    assert.equal(instantFirst.firstOrderBonus, 200);
    assert.equal(instantFirst.streakBonus, 0);
    assert.equal(instantFirst.pointsEarned, 1200);

    const halfTimeSecond = calculateScore({
      correct: true,
      elapsedMs: 10000,
      roundDurationMs: 20000,
      correctOrder: 2,
      newStreak: 1,
    });
    // 700 base + 100 second bonus
    assert.equal(halfTimeSecond.baseSpeedPoints, 700);
    assert.equal(halfTimeSecond.firstOrderBonus, 100);
    assert.equal(halfTimeSecond.pointsEarned, 800);
  });

  it('calculates consecutive streak bonus and caps at +400', () => {
    const streak3 = calculateScore({
      correct: true,
      elapsedMs: 5000,
      roundDurationMs: 20000,
      correctOrder: 4,
      newStreak: 3,
    });
    assert.equal(streak3.streakBonus, 200);

    const streak8 = calculateScore({
      correct: true,
      elapsedMs: 5000,
      roundDurationMs: 20000,
      correctOrder: 4,
      newStreak: 8,
    });
    assert.equal(streak8.streakBonus, 400);
  });
});

describe('Fuzzy Answer Matching & Input Sanitization', () => {
  it('matches case-insensitively and ignores punctuation or feat tags', () => {
    const track = {
      title: 'Blinding Lights (feat. Rosalia) - Remastered',
      aliases: ['Blinding Lights'],
    };
    assert.equal(isFuzzyAnswerMatch('blinding lights', track), true);
    assert.equal(isFuzzyAnswerMatch('  BLINDING-LIGHTS!! ', track), true);
  });

  it('matches both Thai and English titles in bilingual song names', () => {
    const track = {
      title: 'โต๊ะริม (Melt)',
      aliases: ['โต๊ะริม', 'Melt'],
    };
    assert.equal(isFuzzyAnswerMatch('โต๊ะริม', track), true);
    assert.equal(isFuzzyAnswerMatch('melt', track), true);
    assert.equal(isFuzzyAnswerMatch('โต๊ะริม melt', track), true);
  });

  it('tolerates minor typos via Levenshtein similarity', () => {
    const track = {
      title: 'ฝนตกไหม',
      aliases: ['fon tok mai'],
    };
    assert.equal(isFuzzyAnswerMatch('ฝนตกใหม', track), true);
    assert.equal(isFuzzyAnswerMatch('fontokmai', track), true);
    assert.equal(isFuzzyAnswerMatch('ทรงอย่างแบด', track), false);
  });

  it('sanitizes nicknames and masks profanity', () => {
    assert.equal(sanitizeNickname('  เซียนเพลงfuck  '), 'เซียนเพลง***');
    assert.equal(sanitizeNickname(''), 'ผู้เล่นปริศนา');
    assert.equal(sanitizeNickname('A'.repeat(30)).length, 18);
  });
});

describe('Matchmaking Queue (Quick Match)', () => {
  it('waits when 1 player joins, starts countdown at 2 players, and batches 3 players together', async () => {
    let matchedBatch: QueuedPlayer[] = [];

    const queue = new MatchmakingQueue(
      {
        onQueueUpdated: () => {},
        onMatchReady: (_cat, players) => {
          matchedBatch = players;
        },
      },
      { minPlayers: 2, maxPlayers: 8, countdownMs: 80 }
    );

    const s1 = queue.enqueue({
      playerId: 'p1',
      socketId: 's1',
      nickname: 'Alice',
      category: 'thai',
    });
    assert.equal(s1.playersCount, 1);
    assert.equal(s1.countdownEndsAt, null);

    const s2 = queue.enqueue({
      playerId: 'p2',
      socketId: 's2',
      nickname: 'Bob',
      category: 'thai',
    });
    assert.equal(s2.playersCount, 2);
    assert.notEqual(s2.countdownEndsAt, null);

    const s3 = queue.enqueue({
      playerId: 'p3',
      socketId: 's3',
      nickname: 'Charlie',
      category: 'thai',
    });
    assert.equal(s3.playersCount, 3);

    await new Promise((r) => setTimeout(r, 130));
    assert.equal(matchedBatch.length, 3);
    assert.deepEqual(
      matchedBatch.map((p) => p.playerId),
      ['p1', 'p2', 'p3']
    );
    queue.clearAll();
  });

  it('starts match immediately when 8 players join without waiting for countdown', () => {
    let matchedBatch: QueuedPlayer[] = [];

    const queue = new MatchmakingQueue(
      {
        onQueueUpdated: () => {},
        onMatchReady: (_cat, players) => {
          matchedBatch = players;
        },
      },
      { minPlayers: 2, maxPlayers: 8, countdownMs: 15000 }
    );

    for (let i = 1; i <= 8; i++) {
      queue.enqueue({
        playerId: `player-${i}`,
        socketId: `sock-${i}`,
        nickname: `Player ${i}`,
        category: 'kpop',
      });
    }

    assert.equal(matchedBatch.length, 8);
    queue.clearAll();
  });

  it('cancels countdown if a player leaves and count drops below 2', () => {
    const queue = new MatchmakingQueue(
      {
        onQueueUpdated: () => {},
        onMatchReady: () => {},
      },
      { minPlayers: 2, maxPlayers: 8, countdownMs: 15000 }
    );

    queue.enqueue({ playerId: 'p1', socketId: 's1', nickname: 'A', category: 'inter' });
    const s2 = queue.enqueue({
      playerId: 'p2',
      socketId: 's2',
      nickname: 'B',
      category: 'inter',
    });
    assert.notEqual(s2.countdownEndsAt, null);

    queue.removeByPlayerId('p2');
    const afterLeave = queue.getStatus('inter');
    assert.equal(afterLeave.playersCount, 1);
    assert.equal(afterLeave.countdownEndsAt, null);
    queue.clearAll();
  });
});

describe('Room Lifecycle, Reconnect & Host Transfer (InMemoryStateStore)', async () => {
  const { InMemoryStateStore } = await import('../src/server/store.js');

  it('stores and retrieves room state and player-to-room mappings for 60s reconnect', async () => {
    const store = new InMemoryStateStore();
    await store.setPlayerRoomCode('player-1', 'ab12c');
    assert.equal(await store.getPlayerRoomCode('player-1'), 'AB12C');

    await store.deletePlayerRoomCode('player-1');
    assert.equal(await store.getPlayerRoomCode('player-1'), undefined);
  });

  it('picks tracks with distinct artists per game so the same singer does not repeat', async () => {
    const { pickTracksForRoom, FALLBACK_TRACKS } = await import('../src/server/deezer.js');
    const store = new InMemoryStateStore();
    await store.setCachedTracks('thai', FALLBACK_TRACKS.filter((t) => t.category === 'thai'), 60000);

    const { selected } = await pickTracksForRoom('thai', 6, new Set(), store);
    const uniqueArtists = new Set(selected.map((t) => t.artist.toLowerCase()));
    assert.equal(uniqueArtists.size, selected.length);
  });

  it('rejects 88rising, beat/instrumental tracks, and non-Thai song titles in Thai category', async () => {
    const { isRelevantTrackForQuery } = await import('../src/server/deezer.js');

    assert.equal(
      isRelevantTrackForQuery(
        { id: 1, title: 'California', artist: { name: '88rising' }, preview: 'http://x' },
        'MILLI พักก่อน',
        'thai'
      ),
      false
    );
    assert.equal(
      isRelevantTrackForQuery(
        { id: 2, title: 'Chill Type Beat 2025', artist: { name: 'BeatMaker' }, preview: 'http://x' },
        'PUN',
        'thai'
      ),
      false
    );
    assert.equal(
      isRelevantTrackForQuery(
        { id: 3, title: 'Mirrors', artist: { name: 'Justin Timberlake' }, preview: 'http://x' },
        'Mirrr ยิ่งห้ามยิ่งยุ',
        'thai'
      ),
      false
    );
    assert.equal(
      isRelevantTrackForQuery(
        { id: 4, title: 'ยิ่งห้ามยิ่งยุ (YHYU)', artist: { name: 'Mirrr' }, preview: 'http://x' },
        'Mirrr ยิ่งห้ามยิ่งยุ',
        'thai'
      ),
      true
    );
  });

  it('loads AI TTS spoken-lyrics category pool and generates TTS audio buffer', async () => {
    const { getCategoryPool, getTtsAudioBuffer } = await import('../src/server/deezer.js');
    const store = new InMemoryStateStore();
    const pool = await getCategoryPool('tts', store);
    assert.equal(pool.length >= 40, true);
    assert.equal(pool[0].preview.startsWith('/api/tts-audio/'), true);

    const { buffer } = await getTtsAudioBuffer('tts-1');
    assert.equal(buffer.byteLength > 500, true);
  });

  it('filters 48 Group (BNK48, CGM48, AKB48) tracks and rejects Off Vocal versions', async () => {
    const { isRelevantTrackForQuery } = await import('../src/server/deezer.js');

    assert.equal(
      isRelevantTrackForQuery(
        { id: 10, title: 'Koisuru Fortune Cookie - คุกกี้เสี่ยงทาย', artist: { name: 'BNK48' }, preview: 'http://x' },
        'BNK48',
        'idol48'
      ),
      true
    );
    assert.equal(
      isRelevantTrackForQuery(
        { id: 11, title: 'Heavy Rotation', artist: { name: 'AKB48' }, preview: 'http://x' },
        'AKB48',
        'idol48'
      ),
      true
    );
    assert.equal(
      isRelevantTrackForQuery(
        { id: 12, title: 'มะลิ', artist: { name: 'CGM48' }, preview: 'http://x' },
        'CGM48',
        'idol48'
      ),
      true
    );
    assert.equal(
      isRelevantTrackForQuery(
        { id: 13, title: 'ดีอะ (Off Vocal Version)', artist: { name: 'BNK48' }, preview: 'http://x' },
        'BNK48 ดีอะ',
        'idol48'
      ),
      false
    );
    assert.equal(
      isRelevantTrackForQuery(
        { id: 14, title: 'Random Song', artist: { name: 'SomeOtherArtist' }, preview: 'http://x' },
        'BNK48',
        'idol48'
      ),
      false
    );
  });

  it('rejects Raw Session, Live Session, Acoustic, and Live Concert album versions so only Official Studio tracks are used', async () => {
    const { isRelevantTrackForQuery } = await import('../src/server/deezer.js');

    // Reject Raw Session in title or title_version
    assert.equal(
      isRelevantTrackForQuery(
        {
          id: 20,
          title: 'ดาวหางฮัลเลย์ (Raw Session)',
          title_short: 'ดาวหางฮัลเลย์',
          title_version: '(Raw Session)',
          artist: { name: 'Fellow Fellow' },
          preview: 'http://x',
        },
        'Fellow Fellow ดาวหางฮัลเลย์',
        'thai'
      ),
      false
    );

    // Reject Live Session in title/album
    assert.equal(
      isRelevantTrackForQuery(
        {
          id: 21,
          title: 'ซ่อน(ไม่)หา [Ghost] [Live Session]',
          artist: { name: 'Jeff Satur' },
          album: { title: 'ซ่อน(ไม่)หา [Ghost] [Live Session]' },
          preview: 'http://x',
        },
        'Jeff Satur ซ่อนไม่หา',
        'tpop'
      ),
      false
    );

    // Reject track whose title looks normal ("ขาหมู") but is from a Live Concert album
    assert.equal(
      isRelevantTrackForQuery(
        {
          id: 22,
          title: 'ขาหมู',
          artist: { name: 'Tattoo Colour' },
          album: { title: 'TATTOO COLOUR X TPO LIVE AT PRINCE MAHIDOL HALL' },
          preview: 'http://x',
        },
        'Tattoo Colour ขาหมู',
        'thai'
      ),
      false
    );

    // Reject cover artist when querying original artist
    assert.equal(
      isRelevantTrackForQuery(
        {
          id: 23,
          title: '(Nont Tanont) รักแรก First Love',
          artist: { name: 'Kemhour Teav' },
          album: { title: 'Cover Compilation 6' },
          preview: 'http://x',
        },
        'NONT TANONT รักแรก',
        'thai'
      ),
      false
    );
  });

  it('filters Anime category for official artists, rejects Japanese karaoke covers, and allows matching by song or anime title', async () => {
    const { isRelevantTrackForQuery } = await import('../src/server/deezer.js');

    // Accept official anime artist even when query uses Japanese name and Deezer returns Romaji artist
    assert.equal(
      isRelevantTrackForQuery(
        {
          id: 30,
          title: 'Blue Bird',
          artist: { name: 'Ikimonogakari' },
          album: { title: 'Blue Bird' },
          preview: 'http://x',
        },
        'いきものがかり ブルーバード',
        'anime'
      ),
      true
    );

    // Reject Japanese karaoke cover (歌っちゃ王 / カラオケ)
    assert.equal(
      isRelevantTrackForQuery(
        {
          id: 31,
          title: '廻廻奇譚-2Key(原曲歌手:Eve)[ガイド無しカラオケ]',
          artist: { name: '歌っちゃ王' },
          album: { title: '廻廻奇譚(ガイド無しカラオケ)[原曲歌手:Eve]' },
          preview: 'http://x',
        },
        'Eve Kaikai Kitan',
        'anime'
      ),
      false
    );

    // Verify player can type either the song name or anime name (English or Thai)
    const animeTrack = {
      id: 'ani-test-1',
      title: 'Gurenge (Demon Slayer / ดาบพิฆาตอสูร)',
      artist: 'LiSA',
      cover: 'http://x',
      preview: 'http://x',
      aliases: ['Gurenge', '紅蓮華', 'Demon Slayer', 'Kimetsu no Yaiba', 'ดาบพิฆาตอสูร'],
      animeTitle: 'Demon Slayer / ดาบพิฆาตอสูร',
      category: 'anime' as const,
    };
    assert.equal(isFuzzyAnswerMatch('gurenge', animeTrack), true);
    assert.equal(isFuzzyAnswerMatch('demon slayer', animeTrack), true);
    assert.equal(isFuzzyAnswerMatch('ดาบพิฆาตอสูร', animeTrack), true);

    // Verify 4-choice options in Anime category show ONLY the Anime Name (not song title or artist)
    const { buildChoicesForTrack, FALLBACK_TRACKS, pickTracksForRoom } = await import('../src/server/deezer.js');
    const choices = buildChoicesForTrack(animeTrack, FALLBACK_TRACKS);
    assert.equal(choices.length, 4);
    assert.equal(choices.includes('Demon Slayer / ดาบพิฆาตอสูร'), true);
    assert.equal(choices.some((c) => c.includes('Gurenge') || c.includes('LiSA')), false);

    // Verify consecutive games in Anime category do not repeat tracks across games
    const store = new InMemoryStateStore();
    const mockAnimePool = Array.from({ length: 24 }, (_, idx) => ({
      id: `ani-mock-${idx + 1}`,
      title: `Song ${idx + 1} (Anime Series ${idx + 1})`,
      artist: `Artist ${idx + 1}`,
      cover: 'http://x',
      preview: 'http://x',
      aliases: [`Song ${idx + 1}`, `Anime Series ${idx + 1}`],
      animeTitle: `Anime Series ${idx + 1}`,
      category: 'anime' as const,
    }));
    await store.setCachedTracks('anime', mockAnimePool, 60000);

    const usedInRoom = new Set<string>();
    const game1 = await pickTracksForRoom('anime', 10, usedInRoom, store);
    const game2 = await pickTracksForRoom('anime', 10, new Set<string>(), store);

    const game1Ids = new Set(game1.selected.map((t) => t.id));
    const overlap = game2.selected.filter((t) => game1Ids.has(t.id));
    assert.equal(overlap.length, 0);
  });
});




