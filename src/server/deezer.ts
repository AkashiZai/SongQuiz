import { Category, TrackItem } from '../shared/types.js';
import { cleanSongTitleForDisplay, normalizeSongText } from './scoring.js';
import { StateStore } from './store.js';

const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes so artist rotation stays fresh across games

const CATEGORY_QUERIES: Record<Exclude<Category, 'mixed' | 'tts'>, string[]> = {
  thai: [
    'Yented ว้าวุ่น',
    'Yented ที่รักใจเย็น',
    'NONT TANONT โต๊ะริม',
    'NONT TANONT รักแรก',
    'PUN เขียว เหลือง แดง',
    'PUN ที่เดิม',
    'Only Monday ท้ายปี',
    'Only Monday ได้แต่นึกถึง',
    'SERIOUS BACON มีปัญหาปรึกษาดาว',
    'No One Else เธอคือกาแฟในตอนเช้า',
    'Safeplanet ข้างกาย',
    'Mirrr ยิ่งห้ามยิ่งยุ',
    'Dept เพราะเธอนั้นเป็นเหมือนดั่งโลกทั้งใบ',
    'Patrickananda จันทร์อังคาร',
    'MEYOU วันนี้ปีที่แล้ว',
    'LANDOKMAI เพลงรักเพลงแรก',
    'Purpeech กลัวว่าฉันจะไม่เสียใจ',
    'SLAPKISS แฟนเก่าคนโปรด',
    'SARAN ลืมแทบไม่ไหว',
    'ZENTYARB ฉบับปรับปรุง',
    'PONCHET พี่ชอบหนูที่สุดเลย',
    'Tattoo Colour ขาหมู',
    'Scrubb ใกล้',
    'Cocktail ดึงดัน',
    'Lipta ไปอยู่ที่ไหนมา',
    'PiXXiE ติดฝน',
    'PROXIE คนไม่คุย',
    'BUS แค่ไหนแค่นั้น',
    'URBOYTJ วายร้าย',
    'MILLI พักก่อน',
    'YOUNGOHM ธาตุทองซาวด์',
    'Wanyai เจ็บจนพอ',
    'Zom Marie ล้านปีแสง',
    'Whal & Dolph ใจเดียว',
    'Violette Wautier ตั้งแต่มีเธอฉันมีความสุข',
    'Palmy ซ่อนกลิ่น',
    'Slot Machine เคลิ้ม',
    'Getsunova ความเงียบดังที่สุด',
    'Klear คำยินดี',
    '25hours ไม่เคย',
    'Labanoon เชือกวิเศษ',
    'STAMP มันคงเป็นความรัก',
    'THE TOYS ลาลาลอย',
    'F.HERO จำเลยรัก',
    'PP Krit ลังเล',
    'JOEY PHUWASIT นะหน้าทอง',
    'LOMOSONIC ขอ',
    'Three Man Down ฝนตกไหม',
    'Tilly Birds คิดแต่ไม่ถึง',
    'Billkin ชอบตัวเองตอนอยู่กับเธอ',
    'BOWKYLION วาดไว้',
    'Jeff Satur ลืมไปแล้วว่าลืมยังไง',
    'Jeff Satur เหมือนวิวาห์',
    '4EVE วัดปะหล่ะ',
    'POTATO ปากดี',
    'Bodyslam ยาพิษ',
    'INK WARUNTORN สายตาหลอกกันไม่ได้',
    'Paper Planes ทรงอย่างแบด',
    'Fellow Fellow ดาวหางฮัลเลย์',
    'Polycat อาวรณ์',
    'Anatomy Rabbit ขอให้โลกนี้ใจดีกับเธอ',
  ],
  tpop: [
    'BUS แค่ไหนแค่นั้น',
    'BUS แค่น้องชาย',
    'BUS ภาพเรา',
    '4EVE วัดปะหล่ะ',
    '4EVE หยดน้ำตา',
    '4EVE ข้อยกเว้น',
    '4EVE กักกั๊ก',
    'PROXIE คนไม่คุย',
    'PROXIE ที่ไม่รัก',
    'PROXIE สถานะเบลอ',
    'PROXIE ตบปาก',
    'PiXXiE ติดฝน',
    'PiXXiE เกินต้าน',
    'PiXXiE ลองเลิกกันดีไหม',
    'ATLAS เค้ามาก่อน',
    'ATLAS เป๊ะ',
    'PERSES น่ารักน้อยลงหน่อย',
    'LYKN ฉ่ำ',
    'LYKN แอบรักไม่ทำให้ใครตาย',
    'DICE โคตรชอบเลยอ่ะ',
    'Billkin ชอบตัวเองตอนอยู่กับเธอ',
    'Billkin กีดกัน',
    'Billkin รู้งี้เป็นแฟนกันตั้งนานแล้ว',
    'PP Krit ลังเล',
    'PP Krit เส้นเรื่องเดิม',
    'PP Krit ห่มผ้า',
    'Jeff Satur ลืมไปแล้วว่าลืมยังไง',
    'Jeff Satur เหมือนวิวาห์',
    'NONT TANONT โต๊ะริม',
    'NONT TANONT รักแรก',
    'NONT TANONT พิง',
    'BOWKYLION วาดไว้',
    'BOWKYLION บานปลาย',
    'INK WARUNTORN สายตาหลอกกันไม่ได้',
    'INK WARUNTORN ลบไม่ได้ช่วยให้ลืม',
    'bamm ฉันจะฉาปเธอ',
    'bamm ปล่อยจอย',
    'BOW MAYLADA แฟนผมน่ารัก',
    'GEMINI เพลงรัก',
    'GEMINI เอาไรว่ามา',
    'FOURTH ง้อว',
    'FOURTH เทคะแนน',
    'NANON แค่เพื่อนมั้ง',
    'TIMETHAI เลิกกับพี่ได้ดีทุกคน',
    'ALLY ผ้าเช็ดหน้า',
    'BNK48 คุกกี้เสี่ยงทาย',
    'ALALA ร้องไห้ดังๆ',
  ],
  idol48: [
    'BNK48',
    'BNK48 คุกกี้เสี่ยงทาย',
    'BNK48 โดดดิด่ง',
    'BNK48 วันแรก',
    'BNK48 Kimi wa Melody',
    'BNK48 ดีอะ',
    'BNK48 หมกกบ',
    'BNK48 พลิ้ว',
    'BNK48 ฤดูใหม่',
    'BNK48 อยากจะได้พบเธอ',
    'BNK48 Sakura no Hanabiratachi',
    'BNK48 Jabaja',
    'BNK48 Heavy Rotation',
    'BNK48 High Tension',
    'BNK48 Sayonara Crawl',
    'BNK48 สัญญานะ',
    'CGM48',
    'CGM48 มะลิ',
    'CGM48 เชียงใหม่ 106',
    'CGM48 2565',
    'AKB48',
    'AKB48 ヘビーローテーション',
    'AKB48 恋するフォーチュンクッキー',
    'AKB48 ポニーテールとシュシュ',
    'AKB48 Everyday Kachuusha',
    'AKB48 フライングゲット',
    'AKB48 River',
    'AKB48 Beginner',
    'AKB48 365日の紙飛行機',
    'AKB48 大声ダイヤモンド',
    'QRRA',
  ],
  anime: [
    'LiSA 紅蓮華',
    'Aimer 残響散歌',
    'MAN WITH A MISSION 絆ノ奇跡',
    'YOASOBI アイドル',
    'King Gnu SPECIALZ',
    'Eve Kaikai Kitan',
    'Tatsuya Kitani 青のすみか',
    'Kenshi Yonezu KICK BACK',
    'Vaundy CHAINSAW BLOOD',
    'ano Chu, Tayousei',
    'Creepy Nuts Bling-Bang-Bang-Born',
    'Creepy Nuts オトノケ',
    'YOASOBI 勇者',
    'Official HIGE DANdism ミックスナッツ',
    'Gen Hoshino 喜劇',
    'SiM The Rumbling',
    'Linked Horizon Shinzou wo Sasageyo',
    'Linked Horizon 紅蓮の弓矢',
    'TK from 凛として時雨 unravel',
    'TK from Ling tosite sigure Katharsis',
    'amazarashi Kisetsu wa Tsugitsugi Shindeiku',
    'LiSA crossing field',
    'LiSA ADAMAS',
    'いきものがかり ブルーバード',
    'KANA-BOON シルエット',
    'FLOW GO!!!',
    'Ado New Genesis',
    'RADWIMPS Zenzenzense',
    'Mrs. GREEN APPLE インフェルノ',
    'Mrs. GREEN APPLE Lilac',
    'Official HIGE DANdism Cry Baby',
    'Vaundy 裸の勇者',
    'SPYAIR イマジネーション',
    'BURNOUT SYNDROMES FLY HIGH!!',
    'Kenshi Yonezu Peace Sign',
    'ポルノグラフィティ THE DAY',
    'UVERworld ODD FUTURE',
    'BLUE ENCOUNT Polaris',
    'ClariS コネクト',
    'Goose house 光るなら',
    'Yoko Takahashi 残酷な天使のテーゼ',
    'YUI again',
    'NICO Touches the Walls Hologram',
    'SID Rain',
    'ASIAN KUNG-FU GENERATION リライト',
    'Masayuki Suzuki DADDY ! DADDY ! DO !',
    'Masayuki Suzuki Love Dramatic',
    '結束バンド 青春コンプレックス',
    'Vickeblanka Black Catcher',
    'KANA-BOON Song of the Dead',
    '10-FEET Dai Zero Kan',
    'JAM Project THE HERO',
    'UNISON SQUARE GARDEN Chaos ga Kiwamaru',
    'Konomi Suzuki Redo',
    'MYTH & ROID Voracity',
    'OxT Clattanoia',
    'UVERworld Touch off',
    'EGOIST The Everlasting Guilty Crown',
    'supercell Kimi no Shiranai Monogatari',
    'Aimer Brave Shine',
    'LiSA Oath Sign',
    'Masatoshi Ono Departure',
    'Galneryus Hunting for your dream',
    'ORANGE RANGE Asterisk',
    'Ryokuoushoku Shakai Be a flower',
    'SawanoHiroyuki[nZk] LEveL',
    'YUNGBLUD Abyss',
    'OneRepublic Nobody',
    'Rosa Walton I Really Want to Stay at Your House',
    'FLOW COLORS',
    'Gen Hoshino Doraemon',
    'Motohiro Hata Himawari no Yakusoku',
    'BUMP OF CHICKEN Chronostasis',
    'Hikaru Utada One Last Kiss',
    'RADWIMPS Suzume',
    'RADWIMPS Grand Escape',
    'TRUE Sincerely',
    'SPYAIR Samurai Heart',
    'THE ORAL CIGARETTES Kyoran Hey Kids!!',
    'UNISON SQUARE GARDEN Sugar Song and Bitter Step',
    'Konomi Suzuki This game',
    'Machico fantastic dreamer',
    'TRUE Storyteller',
    'LONGMAN Spiral',
    'MADKID RISE',
    'BURNOUT SYNDROMES Good Morning World',
    'T.M.Revolution resonance',
    'FUNKIST Snow fairy',
    'BoA MASAYUME CHASING',
    'UVERworld CORE PRIDE',
    'Lia My Soul, Your Beats',
    'ZONE secret base',
    'fripSide only my railgun',
    'FZMZ BROKEN GAMES',
    'natori Absolute Zero',
    'Official HIGE DANdism Same Blue',
    'Creepy Nuts Daten',
    'Creepy Nuts Yofukashi no Uta',
    'ClariS ALIVE',
    'さユり 花の塔',
    'YOASOBI 怪物',
    'YOASOBI 祝福',
    'Do As Infinity Fukai Mori',
    'GRANRODEO Can Do',
    'sumika Fiction',
    'Ikimonogakari Netsujou no Spectrum',
    'Survive Said The Prophet MUKANJYO',
    'Queen Bee Fire',
    'MAN WITH A MISSION Winding Road',
    'Fear, and Loathing in Las Vegas Let Me Hear',
    'Ling tosite sigure abnormalize',
    'Eir Aoi Sirius',
    'Mika Nakashima KISS OF DEATH',
    'Sora Amamiya Skyreach',
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

interface TtsSongEntry {
  id: string;
  title: string;
  artist: string;
  aliases: string[];
  ttsPrompt: string;
}

/**
 * Server-only TTS voice prompts for the "AI อ่านเนื้อเพลง (Siri / Google)" category.
 * These strings are converted into audio/mpeg on the server and never sent as text to clients.
 */
const TTS_SONG_ENTRIES: TtsSongEntry[] = [
  {
    id: 'tts-1',
    title: 'ฝนตกไหม',
    artist: 'Three Man Down',
    aliases: ['ฝนตกไหม', 'fon tok mai'],
    ttsPrompt: 'เสื้อผ้าที่ตากไว้แห้งหรือยัง ... ทีวีที่เปิดไว้ดูหรือเปล่า ... จะฝากซื้อของกินไหม',
  },
  {
    id: 'tts-2',
    title: 'คิด(แต่ไม่)ถึง (Same Page?)',
    artist: 'Tilly Birds',
    aliases: ['คิดแต่ไม่ถึง', 'same page'],
    ttsPrompt: 'อยากรู้เพียงว่าความคิดถึงของเธอกับฉันมันเท่ากันหรือเปล่า ... ถามจริงจริงว่าใจเธอเปลี่ยนไปหรือเปล่า',
  },
  {
    id: 'tts-3',
    title: 'โต๊ะริม (Melt)',
    artist: 'NONT TANONT',
    aliases: ['โต๊ะริม', 'melt'],
    ttsPrompt: 'เธอมาทำให้ละลายโดนสาปให้ตายแล้วตายอีก ... อย่าเพิ่งยิ้มแบบนี้จะได้ไหม',
  },
  {
    id: 'tts-4',
    title: 'ซ่อน(ไม่)หา (Ghost)',
    artist: 'Jeff Satur',
    aliases: ['ซ่อนไม่หา', 'ghost'],
    ttsPrompt: 'ต่อให้ฉันจะซ่อนตัวอยู่ตรงไหน ... เธอก็ไม่คิดจะหาฉันเลยใช่ไหม ... สุดท้ายฉันคงต้องยอมแพ้ไปเอง',
  },
  {
    id: 'tts-5',
    title: 'ทรงอย่างแบด (Bad Boy)',
    artist: 'Paper Planes',
    aliases: ['ทรงอย่างแบด', 'bad boy'],
    ttsPrompt: 'แซดอย่างบ่อย ... เธอไม่อินกับผู้ชายแบดบอย ... เธอรักเขาไม่ใช่เรา',
  },
  {
    id: 'tts-6',
    title: 'วาดไว้ (recall)',
    artist: 'BOWKYLION',
    aliases: ['วาดไว้', 'recall'],
    ttsPrompt: 'ที่เธอเคยบอกฉันอย่าร้องไห้ ... อยู่ให้ได้ถ้าเธอไม่อยู่ ... โปรดรับรู้เธอยังอยู่ในใจ',
  },
  {
    id: 'tts-7',
    title: 'ที่รักใจเย็น',
    artist: 'Yented',
    aliases: ['ที่รักใจเย็น'],
    ttsPrompt: 'อย่าเพิ่งไปไหนเลยนะคนดี ... ฟังฉันอธิบายก่อนได้ไหม ... อย่าเพิ่งโกรธกันเลยนะ',
  },
  {
    id: 'tts-8',
    title: 'ว้าวุ่น (On A Date)',
    artist: 'Yented',
    aliases: ['ว้าวุ่น', 'on a date'],
    ttsPrompt: 'ทำไมใจฉันมันเต้นแรงขนาดนี้ ... เวลาที่ได้เจอหน้าเธอทีไร ... ทำตัวไม่ถูกเลยจริงๆ',
  },
  {
    id: 'tts-9',
    title: 'เขียว เหลือง แดง (Get high)',
    artist: 'PUN',
    aliases: ['เขียวเหลืองแดง', 'get high'],
    ttsPrompt: 'ไฟจราจรเปลี่ยนสีแต่ใจฉันยังอยู่ที่เดิม ... มองตาเธอแล้วโลกมันหมุนช้าลง',
  },
  {
    id: 'tts-10',
    title: 'ท้ายปี',
    artist: 'Only Monday',
    aliases: ['ท้ายปี'],
    ttsPrompt: 'ลมหนาวพัดมาอีกแล้ว ... แต่ปีนี้ไม่มีเธออยู่ข้างกายเหมือนเดิม ... เหลือเพียงความทรงจำเก่าๆ',
  },
  {
    id: 'tts-11',
    title: 'ดาวหางฮัลเลย์ (Halley\'s Comet)',
    artist: 'Fellow Fellow',
    aliases: ['ดาวหางฮัลเลย์', 'halleys comet'],
    ttsPrompt: 'เจ็ดสิบห้าปีจะมาให้เห็นสักที ... แต่ฉันรอเธอได้นานกว่านั้น ... ขอแค่มีเธออยู่ตรงนี้ด้วยกัน',
  },
  {
    id: 'tts-12',
    title: 'วันนี้ปีที่แล้ว',
    artist: 'Meyou',
    aliases: ['วันนี้ปีที่แล้ว'],
    ttsPrompt: 'แจ้งเตือนในโทรศัพท์พาภาพวันเก่ากลับมา ... วันที่เรายังรักกันดี ... แต่ตอนนี้ไม่มีเธอแล้ว',
  },
  {
    id: 'tts-13',
    title: 'นะหน้าทอง',
    artist: 'JOEY PHUWASIT',
    aliases: ['นะหน้าทอง'],
    ttsPrompt: 'ต่อให้ต้องเป่าคาถาให้เธอหลงรัก ... ฉันก็ยอมทำทุกทาง ... ขอแค่ใจเธอหันมามองกันบ้าง',
  },
  {
    id: 'tts-14',
    title: 'พี่ชอบหนูที่สุดเลย',
    artist: 'PONCHET',
    aliases: ['พี่ชอบหนูที่สุดเลย'],
    ttsPrompt: 'คนสวยขาอย่าเพิ่งใจร้ายกับพี่เลย ... ในสายตาพี่มีแค่หนูคนเดียวจริงๆ นะ',
  },
  {
    id: 'tts-15',
    title: 'ลืมแทบไม่ไหว',
    artist: 'Saran',
    aliases: ['ลืมแทบไม่ไหว'],
    ttsPrompt: 'พยายามจะลบภาพเธอออกจากหัวใจ ... แต่ยิ่งลืมกลับยิ่งจำทุกรายละเอียดของเธอ',
  },
  {
    id: 'tts-16',
    title: 'ฉบับปรับปรุง',
    artist: 'ZENTYARB',
    aliases: ['ฉบับปรับปรุง'],
    ttsPrompt: 'ฉันพร้อมจะเปลี่ยนตัวเองให้ดีขึ้นเพื่อเธอ ... ขอโอกาสแก้ตัวอีกครั้งจะได้ไหม',
  },
  {
    id: 'tts-17',
    title: 'แฟนเก่าคนโปรด (My Fav Ex)',
    artist: 'SLAPKISS',
    aliases: ['แฟนเก่าคนโปรด', 'my fav ex'],
    ttsPrompt: 'ต่อให้เลิกกันไปนานแค่ไหน ... เธอก็ยังเป็นคนที่ติดอยู่ในใจฉันเสมอไม่เคยเปลี่ยน',
  },
  {
    id: 'tts-18',
    title: 'คนไม่คุย (Silent Mode)',
    artist: 'PROXIE',
    aliases: ['คนไม่คุย', 'silent mode'],
    ttsPrompt: 'เป็นได้แค่คนที่เธอไม่คิดจะทักมา ... ปิดเสียงแจ้งเตือนไว้หรือเปล่าทำไมเงียบหายไปเลย',
  },
  {
    id: 'tts-19',
    title: 'ติดฝน (rain)',
    artist: 'PiXXiE',
    aliases: ['ติดฝน', 'rain'],
    ttsPrompt: 'อยากให้ฟ้าเทลงมาหนักๆ อีกสักหน่อย ... จะได้มีข้ออ้างอยู่ข้างเธอให้นานกว่านี้',
  },
  {
    id: 'tts-20',
    title: 'แค่ไหนแค่นั้น (NO MATTER WHAT)',
    artist: 'BUS',
    aliases: ['แค่ไหนแค่นั้น', 'no matter what'],
    ttsPrompt: 'ต่อให้เธอให้เป็นได้แค่เพื่อน ... ฉันก็พร้อมจะยืนข้างเธอตรงนี้ไม่ไปไหน',
  },
  {
    id: 'tts-21',
    title: 'วัดปะหล่ะ? (TEST ME)',
    artist: '4EVE',
    aliases: ['วัดปะหล่ะ', 'test me'],
    ttsPrompt: 'ถ้าชอบก็เข้ามาเลยอย่ามัวแต่มองไกลๆ ... ลองดูสักตั้งจะได้รู้ว่าใจตรงกันไหม',
  },
  {
    id: 'tts-22',
    title: 'สายตาหลอกกันไม่ได้',
    artist: 'Ink Waruntorn',
    aliases: ['สายตาหลอกกันไม่ได้'],
    ttsPrompt: 'ปากเธอบอกว่าไม่คิดอะไร ... แต่เวลามองตากันมันฟ้องออกมาหมดแล้วนะ',
  },
  {
    id: 'tts-23',
    title: 'ชอบตัวเองตอนอยู่กับเธอ',
    artist: 'Billkin',
    aliases: ['ชอบตัวเองตอนอยู่กับเธอ'],
    ttsPrompt: 'ตั้งแต่มีเธอเข้ามาในชีวิต ... ฉันก็กลายเป็นคนที่ยิ้มง่ายกว่าเดิมตั้งเยอะ',
  },
  {
    id: 'tts-24',
    title: 'ลังเล',
    artist: 'PP KRIT',
    aliases: ['ลังเล'],
    ttsPrompt: 'จะเดินหน้าต่อหรือพอแค่นี้ ... ใจหนึ่งก็กลัวเจ็บแต่อีกใจก็ยังอยากรักเธอ',
  },
  {
    id: 'tts-25',
    title: 'เธอ ๆ เพื่อนเราชอบ (Guess Who?)',
    artist: 'Serious Bacon',
    aliases: ['เธอๆเพื่อนเราชอบ', 'guess who'],
    ttsPrompt: 'ฝากมาบอกเฉยๆ นะว่ามีคนแอบปลื้มเธออยู่ ... ลองทายดูสิว่าคนนั้นคือใครใกล้ๆ ตัวนี่แหละ',
  },
  {
    id: 'tts-26',
    title: 'เธอคือกาแฟในตอนเช้า',
    artist: 'NO ONE ELSE',
    aliases: ['เธอคือกาแฟในตอนเช้า'],
    ttsPrompt: 'ตื่นมาเจอหน้าเธอทุกวันก็เหมือนได้เติมพลัง ... เป็นความสุขเล็กๆ ที่ขาดไม่ได้เลย',
  },
  {
    id: 'tts-27',
    title: 'ข้างกาย',
    artist: 'Safeplanet',
    aliases: ['ข้างกาย'],
    ttsPrompt: 'ในคืนที่ดาวเต็มฟ้า ... แค่มีเธอจับมือฉันไว้ตรงนี้ก็ไม่ต้องกลัวอะไรอีกแล้ว',
  },
  {
    id: 'tts-28',
    title: 'ยิ่งห้ามยิ่งยุ (YHYU)',
    artist: 'Mirrr',
    aliases: ['ยิ่งห้ามยิ่งยุ', 'yhyu'],
    ttsPrompt: 'บอกตัวเองว่าอย่าไปหลงรักคนใจร้ายแบบเธอ ... แต่หัวใจมันกลับดื้อรั้นไม่ยอมฟังเลย',
  },
  {
    id: 'tts-29',
    title: 'เพราะเธอนั้นเป็นเหมือนดั่งโลกทั้งใบ',
    artist: 'Dept',
    aliases: ['เพราะเธอนั้นเป็นเหมือนดั่งโลกทั้งใบ'],
    ttsPrompt: 'ไม่ว่าวันข้างหน้าจะเป็นอย่างไร ... ทุกอย่างของฉันหมุนรอบตัวเธอคนเดียวเท่านั้น',
  },
  {
    id: 'tts-30',
    title: 'จันทร์อังคารพุธพฤหัสศุกร์เสาร์อาทิตย์',
    artist: 'Patrickananda',
    aliases: ['จันทร์อังคารพุธพฤหัสศุกร์เสาร์อาทิตย์', 'everyday'],
    ttsPrompt: 'ไม่ว่าจะผ่านไปกี่วันในหนึ่งสัปดาห์ ... ในหัวของฉันก็มีแต่เรื่องของเธอทุกวันเลย',
  },
  {
    id: 'tts-31',
    title: 'เพลงรักเพลงแรก (Blooming)',
    artist: 'LANDOKMAI',
    aliases: ['เพลงรักเพลงแรก', 'blooming'],
    ttsPrompt: 'ดอกไม้เริ่มผลิบานในใจอีกครั้ง ... เมื่อได้รู้จักความหมายของความรักจากเธอ',
  },
  {
    id: 'tts-32',
    title: 'กลัวว่าฉันจะไม่เสียใจ (Fear)',
    artist: 'PURPEECH',
    aliases: ['กลัวว่าฉันจะไม่เสียใจ', 'fear'],
    ttsPrompt: 'ถ้าวันหนึ่งต้องเดินแยกทางกันไปจริงๆ ... สิ่งที่น่ากลัวที่สุดคือการที่เราไม่รู้สึกอะไรต่อกันอีกเลย',
  },
  {
    id: 'tts-33',
    title: 'ขาหมู',
    artist: 'Tattoo Colour',
    aliases: ['ขาหมู'],
    ttsPrompt: 'สั่งข้าวร้านประจำหน้าปากซอยทุกวัน ... ไม่ได้หิวหรอกแค่อยากไปนั่งมองหน้าคนขาย',
  },
  {
    id: 'tts-34',
    title: 'ใกล้',
    artist: 'SCRUBB',
    aliases: ['ใกล้'],
    ttsPrompt: 'เดินสวนกันอยู่ทุกวันแท้ๆ ... แต่ทำไมระยะห่างระหว่างใจเรามันดูไกลจังเลย',
  },
  {
    id: 'tts-35',
    title: 'ดึงดัน',
    artist: 'Cocktail',
    aliases: ['ดึงดัน'],
    ttsPrompt: 'รู้ทั้งรู้ว่าไปกันไม่รอด ... แต่ก็ยังฝืนจับมือกันไว้ทั้งที่เจ็บทั้งสองฝ่าย',
  },
  {
    id: 'tts-36',
    title: 'วายร้าย',
    artist: 'URBOYTJ',
    aliases: ['วายร้าย'],
    ttsPrompt: 'คนอย่างฉันมันไม่ใช่พระเอกในนิทาน ... แต่รักเธอหมดใจไม่แพ้ใครแน่นอน',
  },
  {
    id: 'tts-37',
    title: 'พักก่อน',
    artist: 'MILLI',
    aliases: ['พักก่อน'],
    ttsPrompt: 'หยุดพูดจาเพ้อเจ้อเดี๋ยวนี้เลยนะพี่สาว ... กลับไปนอนตั้งสติสักแป๊บนะคะ',
  },
  {
    id: 'tts-38',
    title: 'ธาตุทองซาวด์',
    artist: 'YOUNGOHM',
    aliases: ['ธาตุทองซาวด์'],
    ttsPrompt: 'อีกี้มันเป็นสก๊อยไปกับผู้บ่อยๆ ... เปิดเพลงเต้นหน้าเวทีตั้งแต่สมัยไฮไฟว์',
  },
  {
    id: 'tts-39',
    title: 'เจ็บจนพอ (Enough)',
    artist: 'WANYAi',
    aliases: ['เจ็บจนพอ', 'enough'],
    ttsPrompt: 'ร้องไห้มาไม่รู้กี่ครั้งกับเรื่องเดิมๆ ... วันนี้หัวใจมันบอกตัวเองว่าพอได้แล้วจริงๆ',
  },
  {
    id: 'tts-40',
    title: 'ซ่อนกลิ่น',
    artist: 'Palmy',
    aliases: ['ซ่อนกลิ่น'],
    ttsPrompt: 'เก็บความรู้สึกไว้ข้างในลึกสุดใจ ... แอบส่งยิ้มให้เธอไกลๆ โดยไม่ให้ใครรู้',
  },
  {
    id: 'tts-41',
    title: 'เคลิ้ม',
    artist: 'Slot Machine',
    aliases: ['เคลิ้ม'],
    ttsPrompt: 'หลงใหลในมนตราของเธอจนถอนตัวไม่ขึ้น ... เหมือนลอยอยู่ในความฝันที่ไม่อยากตื่น',
  },
  {
    id: 'tts-42',
    title: 'ความเงียบดังที่สุด',
    artist: 'Getsunova',
    aliases: ['ความเงียบดังที่สุด'],
    ttsPrompt: 'ไม่มีคำพูดใดหลุดออกมาจากปากเธอ ... แต่ความว่างเปล่านั้นกลับตะโกนก้องอยู่ในหัวใจ',
  },
  {
    id: 'tts-43',
    title: 'คำยินดี',
    artist: 'Klear',
    aliases: ['คำยินดี'],
    ttsPrompt: 'ขอให้เธอไปดีขอให้มีความสุข ... กับคนที่เธอเลือกแล้วส่วนฉันจะยืนยิ้มทั้งน้ำตาตรงนี้เอง',
  },
  {
    id: 'tts-44',
    title: 'ไม่เคย',
    artist: '25HOURS',
    aliases: ['ไม่เคย'],
    ttsPrompt: 'เราต่างไม่รู้เลยว่าเวลาที่มีอยู่ด้วยกันมันมีค่าแค่ไหน ... จนวันที่ต้องเสียมันไปตลอดกาล',
  },
  {
    id: 'tts-45',
    title: 'เชือกวิเศษ',
    artist: 'Labanoon',
    aliases: ['เชือกวิเศษ'],
    ttsPrompt: 'ต่อให้มัดตัวเธอไว้แน่นแค่ไหน ... ถ้าใจเธอไม่อยู่แล้วก็รั้งไว้ไม่ได้อยู่ดี',
  },
  {
    id: 'tts-46',
    title: 'มันคงเป็นความรัก',
    artist: 'STAMP',
    aliases: ['มันคงเป็นความรัก'],
    ttsPrompt: 'ที่ทำให้ตัวฉันยังยืนอยู่ตรงนี้ ... อยากดูแลเธอให้ดีที่สุดเท่าที่คนคนหนึ่งจะทำได้',
  },
  {
    id: 'tts-47',
    title: 'ลาลาลอย (100%)',
    artist: 'THE TOYS',
    aliases: ['ลาลาลอย'],
    ttsPrompt: 'ส่งใจลอยไปหาเธอที่อยู่แสนไกล ... ไม่รู้ว่าตอนนี้เธอจะคิดถึงกันบ้างไหมนะ',
  },
  {
    id: 'tts-48',
    title: 'อาวรณ์',
    artist: 'Polycat',
    aliases: ['อาวรณ์'],
    ttsPrompt: 'คนที่บอกลาเป็นคนสุดท้าย ... คือคนที่ยังรักและคิดถึงเธอมากที่สุดเสมอมา',
  },
];

const ttsAudioCache = new Map<string, Buffer>();
const ttsTrackMetaMap = new Map<string, { title: string; artist: string; fallbackPrompt?: string }>();

for (const e of TTS_SONG_ENTRIES) {
  ttsTrackMetaMap.set(e.id, {
    title: e.title,
    artist: e.artist,
    fallbackPrompt: e.ttsPrompt,
  });
}

async function fetchRealLyricsSnippetFromLrclib(
  title: string,
  artist: string
): Promise<string | null> {
  const thaiTitleOnly = title.replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim();
  const queries = [`${thaiTitleOnly} ${artist}`, thaiTitleOnly];

  for (const q of queries) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
          {
            headers: {
              'User-Agent': 'SongQuizParty/1.0 (https://github.com/AkashiZai/SongQuiz)',
            },
            signal: controller.signal,
          }
        );
        if (res.status === 503 || res.status === 429) {
          await new Promise((r) => setTimeout(r, 550));
          continue;
        }
        if (!res.ok) break;
        const list = (await res.json()) as Array<{ plainLyrics?: string; syncedLyrics?: string }>;
        if (!Array.isArray(list) || list.length === 0) break;

        const match = list.find(
          (item) =>
            typeof item.plainLyrics === 'string' &&
            /[\u0E00-\u0E7F]/.test(item.plainLyrics)
        );
        if (!match?.plainLyrics) break;

        const lines = match.plainLyrics
          .split('\n')
          .map((l) => l.replace(/\[[^\]]*\]/g, '').trim())
          .filter(
            (l) =>
              l.length >= 6 &&
              /[\u0E00-\u0E7F]/.test(l) &&
              !/^(เพลงประกอบ|ศิลปิน|คำร้อง|ทำนอง|เรียบเรียง)/i.test(l)
          );

        if (lines.length >= 4) {
          // Pick 4 consecutive lines from the chorus/hook section (~30% into the song)
          const startIdx = Math.min(
            lines.length - 4,
            Math.max(1, Math.floor(lines.length * 0.3))
          );
          return lines.slice(startIdx, startIdx + 4).join(' ... ');
        }
      } catch {
        // Ignore and fallback
      } finally {
        clearTimeout(timeout);
      }
    }
  }
  return null;
}

async function fetchGoogleTtsChunk(text: string): Promise<Buffer | null> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(
    text.slice(0, 190)
  )}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) return null;
  const arr = await res.arrayBuffer();
  const buf = Buffer.from(arr);
  return buf.byteLength >= 500 ? buf : null;
}

export async function getTtsAudioBuffer(trackId: string): Promise<{ buffer: Buffer; mime: string }> {
  const cached = ttsAudioCache.get(trackId);
  if (cached) {
    return { buffer: cached, mime: 'audio/mpeg' };
  }

  const meta = ttsTrackMetaMap.get(trackId);
  if (!meta) {
    return { buffer: generateFallbackWav(trackId), mime: 'audio/wav' };
  }

  const liveLyricsSnippet = await fetchRealLyricsSnippetFromLrclib(meta.title, meta.artist);
  const spokenText = liveLyricsSnippet || meta.fallbackPrompt || meta.title;

  try {
    const chunk1 = await fetchGoogleTtsChunk(spokenText);
    if (!chunk1) throw new Error('TTS chunk1 failed');

    const chunk2 = await fetchGoogleTtsChunk(`ฟังอีกครั้ง ... ${spokenText}`);
    const combined = chunk2 ? Buffer.concat([chunk1, chunk2]) : chunk1;

    ttsAudioCache.set(trackId, combined);
    return { buffer: combined, mime: 'audio/mpeg' };
  } catch {
    return { buffer: generateFallbackWav(trackId), mime: 'audio/wav' };
  }
}

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
    aliases: ['ที่รักใจเย็น'],
    category: 'thai',
  },
  {
    id: 'fb-thai-8',
    title: 'เขียว เหลือง แดง (Get high)',
    artist: 'PUN',
    cover: 'https://picsum.photos/seed/th8/400/400',
    preview: '/api/fallback-audio/fb-thai-8.wav',
    aliases: ['เขียวเหลืองแดง', 'get high'],
    category: 'thai',
  },
  {
    id: 'fb-thai-9',
    title: 'ท้ายปี',
    artist: 'Only Monday',
    cover: 'https://picsum.photos/seed/th9/400/400',
    preview: '/api/fallback-audio/fb-thai-9.wav',
    aliases: ['ท้ายปี'],
    category: 'thai',
  },
  {
    id: 'fb-thai-10',
    title: 'ดาวหางฮัลเลย์ (Halley\'s Comet)',
    artist: 'Fellow Fellow',
    cover: 'https://picsum.photos/seed/th10/400/400',
    preview: '/api/fallback-audio/fb-thai-10.wav',
    aliases: ['ดาวหางฮัลเลย์'],
    category: 'thai',
  },
  {
    id: 'fb-thai-11',
    title: 'วันนี้ปีที่แล้ว',
    artist: 'Meyou',
    cover: 'https://picsum.photos/seed/th11/400/400',
    preview: '/api/fallback-audio/fb-thai-11.wav',
    aliases: ['วันนี้ปีที่แล้ว'],
    category: 'thai',
  },
  {
    id: 'fb-thai-12',
    title: 'นะหน้าทอง',
    artist: 'JOEY PHUWASIT',
    cover: 'https://picsum.photos/seed/th12/400/400',
    preview: '/api/fallback-audio/fb-thai-12.wav',
    aliases: ['นะหน้าทอง'],
    category: 'thai',
  },
  {
    id: 'fb-tpop-1',
    title: 'แค่ไหนแค่นั้น (NO MATTER WHAT)',
    artist: 'BUS',
    cover: 'https://picsum.photos/seed/tp1/400/400',
    preview: '/api/fallback-audio/fb-tpop-1.wav',
    aliases: ['แค่ไหนแค่นั้น', 'no matter what'],
    category: 'tpop',
  },
  {
    id: 'fb-tpop-2',
    title: 'วัดปะหล่ะ? (TEST ME)',
    artist: '4EVE',
    cover: 'https://picsum.photos/seed/tp2/400/400',
    preview: '/api/fallback-audio/fb-tpop-2.wav',
    aliases: ['วัดปะหล่ะ', 'test me'],
    category: 'tpop',
  },
  {
    id: 'fb-tpop-3',
    title: 'คนไม่คุย (Silent Mode)',
    artist: 'PROXIE',
    cover: 'https://picsum.photos/seed/tp3/400/400',
    preview: '/api/fallback-audio/fb-tpop-3.wav',
    aliases: ['คนไม่คุย', 'silent mode'],
    category: 'tpop',
  },
  {
    id: 'fb-tpop-4',
    title: 'ติดฝน (rain)',
    artist: 'PiXXiE',
    cover: 'https://picsum.photos/seed/tp4/400/400',
    preview: '/api/fallback-audio/fb-tpop-4.wav',
    aliases: ['ติดฝน', 'rain'],
    category: 'tpop',
  },
  {
    id: 'fb-tpop-5',
    title: 'ฉ่ำ (CHARM)',
    artist: 'LYKN',
    cover: 'https://picsum.photos/seed/tp5/400/400',
    preview: '/api/fallback-audio/fb-tpop-5.wav',
    aliases: ['ฉ่ำ', 'charm'],
    category: 'tpop',
  },
  {
    id: 'fb-tpop-6',
    title: 'ชอบตัวเองตอนอยู่กับเธอ',
    artist: 'Billkin',
    cover: 'https://picsum.photos/seed/tp6/400/400',
    preview: '/api/fallback-audio/fb-tpop-6.wav',
    aliases: ['ชอบตัวเองตอนอยู่กับเธอ'],
    category: 'tpop',
  },
  {
    id: 'fb-tpop-7',
    title: 'ลังเล',
    artist: 'PP KRIT',
    cover: 'https://picsum.photos/seed/tp7/400/400',
    preview: '/api/fallback-audio/fb-tpop-7.wav',
    aliases: ['ลังเล'],
    category: 'tpop',
  },
  {
    id: 'fb-tpop-8',
    title: 'เค้ามาก่อน (Lovefool)',
    artist: 'ATLAS',
    cover: 'https://picsum.photos/seed/tp8/400/400',
    preview: '/api/fallback-audio/fb-tpop-8.wav',
    aliases: ['เค้ามาก่อน', 'lovefool'],
    category: 'tpop',
  },
  {
    id: 'fb-idol48-1',
    title: 'Koisuru Fortune Cookie - คุกกี้เสี่ยงทาย',
    artist: 'BNK48',
    cover: 'https://picsum.photos/seed/48g1/400/400',
    preview: '/api/fallback-audio/fb-idol48-1.wav',
    aliases: ['คุกกี้เสี่ยงทาย', 'koisuru fortune cookie'],
    category: 'idol48',
  },
  {
    id: 'fb-idol48-2',
    title: 'โดดดิด่ง',
    artist: 'BNK48',
    cover: 'https://picsum.photos/seed/48g2/400/400',
    preview: '/api/fallback-audio/fb-idol48-2.wav',
    aliases: ['โดดดิด่ง'],
    category: 'idol48',
  },
  {
    id: 'fb-idol48-3',
    title: 'Shonichi - วันแรก',
    artist: 'BNK48',
    cover: 'https://picsum.photos/seed/48g3/400/400',
    preview: '/api/fallback-audio/fb-idol48-3.wav',
    aliases: ['วันแรก', 'shonichi'],
    category: 'idol48',
  },
  {
    id: 'fb-idol48-4',
    title: 'Kimi wa Melody - เธอคือ...เมโลดี้',
    artist: 'BNK48',
    cover: 'https://picsum.photos/seed/48g4/400/400',
    preview: '/api/fallback-audio/fb-idol48-4.wav',
    aliases: ['เธอคือเมโลดี้', 'kimi wa melody'],
    category: 'idol48',
  },
  {
    id: 'fb-idol48-5',
    title: 'มะลิ',
    artist: 'CGM48',
    cover: 'https://picsum.photos/seed/48g5/400/400',
    preview: '/api/fallback-audio/fb-idol48-5.wav',
    aliases: ['มะลิ', 'mali'],
    category: 'idol48',
  },
  {
    id: 'fb-idol48-6',
    title: 'Chiang Mai 106',
    artist: 'CGM48',
    cover: 'https://picsum.photos/seed/48g6/400/400',
    preview: '/api/fallback-audio/fb-idol48-6.wav',
    aliases: ['เชียงใหม่ 106', 'chiang mai 106'],
    category: 'idol48',
  },
  {
    id: 'fb-idol48-7',
    title: 'Heavy Rotation',
    artist: 'AKB48',
    cover: 'https://picsum.photos/seed/48g7/400/400',
    preview: '/api/fallback-audio/fb-idol48-7.wav',
    aliases: ['heavy rotation'],
    category: 'idol48',
  },
  {
    id: 'fb-idol48-8',
    title: 'Ponytail to Shushu',
    artist: 'AKB48',
    cover: 'https://picsum.photos/seed/48g8/400/400',
    preview: '/api/fallback-audio/fb-idol48-8.wav',
    aliases: ['ponytail to shushu'],
    category: 'idol48',
  },
  {
    id: 'fb-anime-1',
    title: 'Gurenge (Demon Slayer / ดาบพิฆาตอสูร)',
    artist: 'LiSA',
    cover: 'https://picsum.photos/seed/ani1/400/400',
    preview: '/api/fallback-audio/fb-anime-1.wav',
    aliases: ['Gurenge', '紅蓮華', 'Demon Slayer', 'Kimetsu no Yaiba', 'ดาบพิฆาตอสูร'],
    category: 'anime',
  },
  {
    id: 'fb-anime-2',
    title: 'Idol (Oshi no Ko / เกิดใหม่เป็นลูกโอชิ)',
    artist: 'YOASOBI',
    cover: 'https://picsum.photos/seed/ani2/400/400',
    preview: '/api/fallback-audio/fb-anime-2.wav',
    aliases: ['Idol', 'アイドル', 'Oshi no Ko', 'เกิดใหม่เป็นลูกโอชิ'],
    category: 'anime',
  },
  {
    id: 'fb-anime-3',
    title: 'SPECIALZ (Jujutsu Kaisen / มหาเวทย์ผนึกมาร)',
    artist: 'King Gnu',
    cover: 'https://picsum.photos/seed/ani3/400/400',
    preview: '/api/fallback-audio/fb-anime-3.wav',
    aliases: ['SPECIALZ', 'Jujutsu Kaisen', 'มหาเวทย์ผนึกมาร'],
    category: 'anime',
  },
  {
    id: 'fb-anime-4',
    title: 'KICK BACK (Chainsaw Man / เชนซอว์แมน)',
    artist: 'Kenshi Yonezu',
    cover: 'https://picsum.photos/seed/ani4/400/400',
    preview: '/api/fallback-audio/fb-anime-4.wav',
    aliases: ['KICK BACK', 'Chainsaw Man', 'เชนซอว์แมน'],
    category: 'anime',
  },
  {
    id: 'fb-anime-5',
    title: 'Bling-Bang-Bang-Born (Mashle / ศึกโลกเวทมนตร์คนพลังกล้าม)',
    artist: 'Creepy Nuts',
    cover: 'https://picsum.photos/seed/ani5/400/400',
    preview: '/api/fallback-audio/fb-anime-5.wav',
    aliases: ['Bling-Bang-Bang-Born', 'Mashle', 'ศึกโลกเวทมนตร์คนพลังกล้าม'],
    category: 'anime',
  },
  {
    id: 'fb-anime-6',
    title: 'Shinzo wo Sasageyo! (Attack on Titan / ผ่าพิภพไททัน)',
    artist: 'Linked Horizon',
    cover: 'https://picsum.photos/seed/ani6/400/400',
    preview: '/api/fallback-audio/fb-anime-6.wav',
    aliases: ['Shinzo wo Sasageyo', 'Shinzou wo Sasageyo', 'Attack on Titan', 'ผ่าพิภพไททัน'],
    category: 'anime',
  },
  {
    id: 'fb-anime-7',
    title: 'Unravel (Tokyo Ghoul / โตเกียวกูล)',
    artist: 'TK from Ling tosite sigure',
    cover: 'https://picsum.photos/seed/ani7/400/400',
    preview: '/api/fallback-audio/fb-anime-7.wav',
    aliases: ['Unravel', 'Tokyo Ghoul', 'โตเกียวกูล'],
    category: 'anime',
  },
  {
    id: 'fb-anime-8',
    title: 'Blue Bird (Naruto Shippuden / นารูโตะ)',
    artist: 'Ikimonogakari',
    cover: 'https://picsum.photos/seed/ani8/400/400',
    preview: '/api/fallback-audio/fb-anime-8.wav',
    aliases: ['Blue Bird', 'Naruto', 'นารูโตะ'],
    category: 'anime',
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
  title_version?: string;
  preview?: string;
  artist?: { name?: string };
  album?: { title?: string; cover_big?: string; cover_medium?: string };
}

const THAI_SCRIPT_REGEX = /[\u0E00-\u0E7F]/;

// Strictly filter out non-official / Raw Session / Live Session / Acoustic / Tour / Concert / Off-Vocal / Remix / Cover tracks
const NON_OFFICIAL_TITLE_REGEX =
  /\b(88rising|raw session|live session|another session|studio session|in my room session|session|off vocal|vocal off|instrumental|karaoke|backing track|minus one|type beat|free beat|beat|lofi|lo-fi|ringtone|tribute|cover|covers|music box|8-bit|lullaby|piano|acoustic|unplugged|stripped|acapella|acappella|sped up|speed up|slowed|reverb|remix|bootleg|mashup|medley|interlude|overture|live|concert|tour|arena|festival|hall|band version|band ver|big band|gospel|orchestra|orchestral|string version|english version|english ver|japanese version|japanese ver|chinese version|french version|special version|special ver|light ver|2024 version|rearranged|demo|on a train|radio edit|video edit)\b|'s ver\.?|เวอร์ชันพิเศษ|แสดงสด|คอนเสิร์ต|อะคูสติก|บรรเลง|カラオケ|原曲歌手|ガイド無し|オルゴール/i;

const NON_OFFICIAL_ALBUM_REGEX =
  /\b(88rising|raw session|live session|another session|studio session|in my room session|session|off vocal|vocal off|instrumental|karaoke|backing track|minus one|type beat|free beat|lofi|lo-fi|ringtone|tribute|cover|covers|music box|8-bit|lullaby|piano|acoustic|unplugged|stripped|acapella|acappella|sped up|speed up|slowed|reverb|remix|bootleg|mashup|medley|live|concert|tour version|band version|orchestra|orchestral|english version|japanese version|japanese deluxe|french version|special version|light ver|2024 version|alternate versions|on a train)\b|เวอร์ชันพิเศษ|แสดงสด|คอนเสิร์ต|อะคูสติก|บรรเลง|カラオケ|原曲歌手|ガイド無し|オルゴール/i;

const IDOL48_ARTIST_REGEX = /^(bnk48|cgm48|akb48|qrra|vyra|mimigumo|indy camp)$/i;

const AKB48_ROMAJI_MAP: Record<string, { display: string; aliases: string[] }> = {
  '恋するフォーチュンクッキー': {
    display: 'Koisuru Fortune Cookie (恋するフォーチュンクッキー)',
    aliases: ['Koisuru Fortune Cookie', 'คุกกี้เสี่ยงทาย', '恋するフォーチュンクッキー'],
  },
  'ヘビーローテーション': {
    display: 'Heavy Rotation (ヘビーローテーション)',
    aliases: ['Heavy Rotation', 'ヘビーローテーション'],
  },
  'ポニーテールとシュシュ': {
    display: 'Ponytail to Shushu (ポニーテールとシュシュ)',
    aliases: ['Ponytail to Shushu', 'ポニーテールとシュシュ'],
  },
  'フライングゲット': {
    display: 'Flying Get (フライングゲット)',
    aliases: ['Flying Get', 'フライングゲット'],
  },
  '365日の紙飛行機': {
    display: '365nichi no Kamihikouki (365日の紙飛行機)',
    aliases: ['365nichi no Kamihikouki', '365 วันกับเครื่องบินกระดาษ', '365日の紙飛行機'],
  },
  '大声ダイヤモンド': {
    display: 'Oogoe Diamond (大声ダイヤモンド)',
    aliases: ['Oogoe Diamond', 'ก็ชอบให้รู้ว่าชอบ', '大声ダイヤモンド'],
  },
};

const ANIME_QUERY_META: Record<
  string,
  { expectedArtist: string; display: string; aliases: string[] }
> = {
  'LiSA 紅蓮華': {
    expectedArtist: 'LiSA',
    display: 'Gurenge (Demon Slayer / ดาบพิฆาตอสูร)',
    aliases: ['Gurenge', '紅蓮華', 'Demon Slayer', 'Kimetsu no Yaiba', 'ดาบพิฆาตอสูร'],
  },
  'Aimer 残響散歌': {
    expectedArtist: 'Aimer',
    display: 'Zankyosanka (Demon Slayer SS2 / ดาบพิฆาตอสูร)',
    aliases: ['Zankyosanka', '残響散歌', 'Demon Slayer', 'Kimetsu no Yaiba', 'ดาบพิฆาตอสูร'],
  },
  'MAN WITH A MISSION 絆ノ奇跡': {
    expectedArtist: 'Man With A Mission',
    display: 'Kizuna no Kiseki (Demon Slayer SS3 / ดาบพิฆาตอสูร)',
    aliases: ['Kizuna no Kiseki', '絆ノ奇跡', 'Demon Slayer', 'Kimetsu no Yaiba', 'ดาบพิฆาตอสูร'],
  },
  'YOASOBI アイドル': {
    expectedArtist: 'YOASOBI',
    display: 'Idol (Oshi no Ko / เกิดใหม่เป็นลูกโอชิ)',
    aliases: ['Idol', 'アイドル', 'Oshi no Ko', 'เกิดใหม่เป็นลูกโอชิ'],
  },
  'King Gnu SPECIALZ': {
    expectedArtist: 'King Gnu',
    display: 'SPECIALZ (Jujutsu Kaisen / มหาเวทย์ผนึกมาร)',
    aliases: ['SPECIALZ', 'Jujutsu Kaisen', 'มหาเวทย์ผนึกมาร'],
  },
  'Eve Kaikai Kitan': {
    expectedArtist: 'Eve',
    display: 'Kaikai Kitan (Jujutsu Kaisen / มหาเวทย์ผนึกมาร)',
    aliases: ['Kaikai Kitan', '廻廻奇譚', 'Jujutsu Kaisen', 'มหาเวทย์ผนึกมาร'],
  },
  'Tatsuya Kitani 青のすみか': {
    expectedArtist: 'Tatsuya Kitani',
    display: 'Where Our Blue Is / Ao no Sumika (Jujutsu Kaisen SS2 / มหาเวทย์ผนึกมาร)',
    aliases: ['Where Our Blue Is', 'Ao no Sumika', '青のすみか', 'Jujutsu Kaisen', 'มหาเวทย์ผนึกมาร'],
  },
  'Kenshi Yonezu KICK BACK': {
    expectedArtist: 'Kenshi Yonezu',
    display: 'KICK BACK (Chainsaw Man / เชนซอว์แมน)',
    aliases: ['KICK BACK', 'Chainsaw Man', 'เชนซอว์แมน'],
  },
  'Vaundy CHAINSAW BLOOD': {
    expectedArtist: 'Vaundy',
    display: 'CHAINSAW BLOOD (Chainsaw Man / เชนซอว์แมน)',
    aliases: ['CHAINSAW BLOOD', 'Chainsaw Man', 'เชนซอว์แมน'],
  },
  'ano Chu, Tayousei': {
    expectedArtist: 'ano',
    display: 'Chu, Tayousei. (Chainsaw Man / เชนซอว์แมน)',
    aliases: ['Chu Tayousei', 'Chainsaw Man', 'เชนซอว์แมน'],
  },
  'Creepy Nuts Bling-Bang-Bang-Born': {
    expectedArtist: 'Creepy Nuts',
    display: 'Bling-Bang-Bang-Born (Mashle / ศึกโลกเวทมนตร์คนพลังกล้าม)',
    aliases: ['Bling-Bang-Bang-Born', 'Mashle', 'ศึกโลกเวทมนตร์คนพลังกล้าม'],
  },
  'Creepy Nuts オトノケ': {
    expectedArtist: 'Creepy Nuts',
    display: 'Otonoke (Dandadan / ดันดาดัน)',
    aliases: ['Otonoke', 'オトノケ', 'Dandadan', 'ดันดาดัน'],
  },
  'YOASOBI 勇者': {
    expectedArtist: 'YOASOBI',
    display: 'Yuusha / The Brave (Frieren / คำอธิษฐานในวันที่จากลา)',
    aliases: ['Yuusha', 'The Brave', '勇者', 'Frieren', 'คำอธิษฐานในวันที่จากลา'],
  },
  'Official HIGE DANdism ミックスナッツ': {
    expectedArtist: 'Official HIGE DANdism',
    display: 'Mixed Nuts (SPY x FAMILY / สปาย x แฟมิลี)',
    aliases: ['Mixed Nuts', 'ミックスナッツ', 'Spy x Family', 'สปายxแฟมิลี'],
  },
  'Gen Hoshino 喜劇': {
    expectedArtist: 'Gen Hoshino',
    display: 'Comedy (SPY x FAMILY / สปาย x แฟมิลี)',
    aliases: ['Comedy', 'Kigeki', '喜劇', 'Spy x Family', 'สปายxแฟมิลี'],
  },
  'SiM The Rumbling': {
    expectedArtist: 'SiM',
    display: 'The Rumbling (Attack on Titan / ผ่าพิภพไททัน)',
    aliases: ['The Rumbling', 'Attack on Titan', 'Shingeki no Kyojin', 'ผ่าพิภพไททัน'],
  },
  'Linked Horizon Shinzou wo Sasageyo': {
    expectedArtist: 'Linked Horizon',
    display: 'Shinzo wo Sasageyo! (Attack on Titan / ผ่าพิภพไททัน)',
    aliases: ['Shinzo wo Sasageyo', 'Shinzou wo Sasageyo', '心臓を捧げよ', 'Attack on Titan', 'ผ่าพิภพไททัน'],
  },
  'Linked Horizon 紅蓮の弓矢': {
    expectedArtist: 'Linked Horizon',
    display: 'Guren no Yumiya (Attack on Titan / ผ่าพิภพไททัน)',
    aliases: ['Guren no Yumiya', '紅蓮の弓矢', 'Attack on Titan', 'ผ่าพิภพไททัน'],
  },
  'TK from 凛として時雨 unravel': {
    expectedArtist: 'TK from Ling tosite sigure',
    display: 'Unravel (Tokyo Ghoul / โตเกียวกูล)',
    aliases: ['Unravel', 'Tokyo Ghoul', 'โตเกียวกูล'],
  },
  'TK from Ling tosite sigure Katharsis': {
    expectedArtist: 'TK from Ling tosite sigure',
    display: 'Katharsis (Tokyo Ghoul:re / โตเกียวกูล)',
    aliases: ['Katharsis', 'Tokyo Ghoul', 'โตเกียวกูล'],
  },
  'amazarashi Kisetsu wa Tsugitsugi Shindeiku': {
    expectedArtist: 'amazarashi',
    display: 'Kisetsu wa Tsugitsugi Shindeiku (Tokyo Ghoul √A / โตเกียวกูล)',
    aliases: ['Kisetsu wa Tsugitsugi Shindeiku', 'Tokyo Ghoul', 'โตเกียวกูล'],
  },
  'LiSA crossing field': {
    expectedArtist: 'LiSA',
    display: 'Crossing Field (Sword Art Online / ซอร์ดอาร์ตออนไลน์)',
    aliases: ['Crossing Field', 'Sword Art Online', 'SAO', 'ซอร์ดอาร์ตออนไลน์'],
  },
  'LiSA ADAMAS': {
    expectedArtist: 'LiSA',
    display: 'ADAMAS (Sword Art Online: Alicization / ซอร์ดอาร์ตออนไลน์)',
    aliases: ['ADAMAS', 'Sword Art Online', 'SAO', 'ซอร์ดอาร์ตออนไลน์'],
  },
  'いきものがかり ブルーバード': {
    expectedArtist: 'Ikimonogakari',
    display: 'Blue Bird (Naruto Shippuden / นารูโตะ)',
    aliases: ['Blue Bird', 'ブルーバード', 'Naruto', 'Naruto Shippuden', 'นารูโตะ'],
  },
  'KANA-BOON シルエット': {
    expectedArtist: 'KANA-BOON',
    display: 'Silhouette (Naruto Shippuden / นารูโตะ)',
    aliases: ['Silhouette', 'シルエット', 'Naruto', 'Naruto Shippuden', 'นารูโตะ'],
  },
  'FLOW GO!!!': {
    expectedArtist: 'Flow',
    display: 'GO!!! (Naruto / นารูโตะ)',
    aliases: ['GO', 'GO!!!', 'Naruto', 'นารูโตะ'],
  },
  'Ado New Genesis': {
    expectedArtist: 'Ado',
    display: 'New Genesis / Shin Jidai (One Piece Film: Red / วันพีซ)',
    aliases: ['New Genesis', 'Shin Jidai', '新時代', 'One Piece', 'วันพีซ'],
  },
  'RADWIMPS Zenzenzense': {
    expectedArtist: 'Radwimps',
    display: 'Zenzenzense (Your Name / หลับตาฝัน ถึงชื่อเธอ)',
    aliases: ['Zenzenzense', '前前前世', 'Your Name', 'Kimi no Na wa', 'หลับตาฝันถึงชื่อเธอ'],
  },
  'Mrs. GREEN APPLE インフェルノ': {
    expectedArtist: 'Mrs. GREEN APPLE',
    display: 'Inferno (Fire Force / หน่วยผจญคนไฟลุก)',
    aliases: ['Inferno', 'インフェルノ', 'Fire Force', 'Enen no Shouboutai', 'หน่วยผจญคนไฟลุก'],
  },
  'Mrs. GREEN APPLE Lilac': {
    expectedArtist: 'Mrs. GREEN APPLE',
    display: 'Lilac (Oblivion Battery / แบตเตอรี่ลืมความจำ)',
    aliases: ['Lilac', 'ライラック', 'Oblivion Battery', 'Boukyaku Battery'],
  },
  'Official HIGE DANdism Cry Baby': {
    expectedArtist: 'Official HIGE DANdism',
    display: 'Cry Baby (Tokyo Revengers / โตเกียว รีเวนเจอร์ส)',
    aliases: ['Cry Baby', 'Tokyo Revengers', 'โตเกียวรีเวนเจอร์ส'],
  },
  'Vaundy 裸の勇者': {
    expectedArtist: 'Vaundy',
    display: 'Hadaka no Yuusha (Ranking of Kings / อันดับพระราชา)',
    aliases: ['Hadaka no Yuusha', 'Hadaka No Yusha', '裸の勇者', 'Ranking of Kings', 'Ousama Ranking', 'อันดับพระราชา'],
  },
  'SPYAIR イマジネーション': {
    expectedArtist: 'Spyair',
    display: 'Imagination (Haikyuu!! / ไฮคิว คู่ตบฟ้าประทาน)',
    aliases: ['Imagination', 'イマジネーション', 'Haikyuu', 'ไฮคิว'],
  },
  'BURNOUT SYNDROMES FLY HIGH!!': {
    expectedArtist: 'BURNOUT SYNDROMES',
    display: 'FLY HIGH!! (Haikyuu!! / ไฮคิว คู่ตบฟ้าประทาน)',
    aliases: ['FLY HIGH', 'Haikyuu', 'ไฮคิว'],
  },
  'Kenshi Yonezu Peace Sign': {
    expectedArtist: 'Kenshi Yonezu',
    display: 'Peace Sign (My Hero Academia / มายฮีโร่ อคาเดเมีย)',
    aliases: ['Peace Sign', 'ピースサイン', 'My Hero Academia', 'Boku no Hero Academia', 'มายฮีโร่อคาเดเมีย'],
  },
  'ポルノグラフィティ THE DAY': {
    expectedArtist: 'Porno Graffitti',
    display: 'THE DAY (My Hero Academia / มายฮีโร่ อคาเดเมีย)',
    aliases: ['THE DAY', 'My Hero Academia', 'Boku no Hero Academia', 'มายฮีโร่อคาเดเมีย'],
  },
  'UVERworld ODD FUTURE': {
    expectedArtist: 'UVERworld',
    display: 'ODD FUTURE (My Hero Academia / มายฮีโร่ อคาเดเมีย)',
    aliases: ['ODD FUTURE', 'My Hero Academia', 'มายฮีโร่อคาเดเมีย'],
  },
  'BLUE ENCOUNT Polaris': {
    expectedArtist: 'BLUE ENCOUNT',
    display: 'Polaris (My Hero Academia / มายฮีโร่ อคาเดเมีย)',
    aliases: ['Polaris', 'ポラリス', 'My Hero Academia', 'มายฮีโร่อคาเดเมีย'],
  },
  'ClariS コネクト': {
    expectedArtist: 'ClariS',
    display: 'Connect (Madoka Magica / สาวน้อยเวทมนตร์ มาโดกะ)',
    aliases: ['Connect', 'コネクト', 'Madoka Magica', 'มาโดกะ'],
  },
  'Goose house 光るなら': {
    expectedArtist: 'Goose house',
    display: 'Hikarunara (Your Lie in April / เพลงรักสองหัวใจ)',
    aliases: ['Hikarunara', '光るなら', 'Your Lie in April', 'Shigatsu wa Kimi no Uso', 'เพลงรักสองหัวใจ'],
  },
  'Yoko Takahashi 残酷な天使のテーゼ': {
    expectedArtist: 'Yoko Takahashi',
    display: 'Zankoku na Tenshi no Thesis (Evangelion / อีวานเกเลียน)',
    aliases: ['Zankoku na Tenshi no Thesis', 'A Cruel Angels Thesis', '残酷な天使のテーゼ', 'Evangelion', 'อีวานเกเลียน'],
  },
  'YUI again': {
    expectedArtist: 'yui',
    display: 'Again (Fullmetal Alchemist: Brotherhood / แขนกลคนแปรธาตุ)',
    aliases: ['Again', 'Fullmetal Alchemist', 'FMA', 'FMAB', 'แขนกลคนแปรธาตุ'],
  },
  'NICO Touches the Walls Hologram': {
    expectedArtist: 'NICO Touches the Walls',
    display: 'Hologram (Fullmetal Alchemist: Brotherhood / แขนกลคนแปรธาตุ)',
    aliases: ['Hologram', 'Fullmetal Alchemist', 'FMAB', 'แขนกลคนแปรธาตุ'],
  },
  'SID Rain': {
    expectedArtist: 'SID',
    display: 'Rain (Fullmetal Alchemist: Brotherhood / แขนกลคนแปรธาตุ)',
    aliases: ['Rain', 'Fullmetal Alchemist', 'FMAB', 'แขนกลคนแปรธาตุ'],
  },
  'ASIAN KUNG-FU GENERATION リライト': {
    expectedArtist: 'Asian Kung-Fu Generation',
    display: 'Rewrite (Fullmetal Alchemist / แขนกลคนแปรธาตุ)',
    aliases: ['Rewrite', 'リライト', 'Fullmetal Alchemist', 'FMA', 'แขนกลคนแปรธาตุ'],
  },
  'Masayuki Suzuki DADDY ! DADDY ! DO !': {
    expectedArtist: 'Masayuki Suzuki',
    display: 'DADDY ! DADDY ! DO ! (Kaguya-sama / สารภาพรักกับคุณคางุยะ)',
    aliases: ['DADDY DADDY DO', 'Kaguya-sama', 'Love is War', 'สารภาพรักกับคุณคางุยะ'],
  },
  'Masayuki Suzuki Love Dramatic': {
    expectedArtist: 'Masayuki Suzuki',
    display: 'Love Dramatic (Kaguya-sama / สารภาพรักกับคุณคางุยะ)',
    aliases: ['Love Dramatic', 'Kaguya-sama', 'Love is War', 'สารภาพรักกับคุณคางุยะ'],
  },
  '結束バンド 青春コンプレックス': {
    expectedArtist: 'kessoku band',
    display: 'Seishun Complex (Bocchi the Rock! / บจจิ เดอะ ร็อก)',
    aliases: ['Seishun Complex', 'seisyun complex', '青春コンプレックス', 'Bocchi the Rock', 'บจจิเดอะร็อก'],
  },
  'Vickeblanka Black Catcher': {
    expectedArtist: 'VK Blanka',
    display: 'Black Catcher (Black Clover / แบล็คโคลเวอร์)',
    aliases: ['Black Catcher', 'Black Clover', 'แบล็คโคลเวอร์'],
  },
  'KANA-BOON Song of the Dead': {
    expectedArtist: 'KANA-BOON',
    display: 'Song of the Dead (Zom 100 / ซอม 100)',
    aliases: ['Song of the Dead', 'Zom 100', 'ซอม 100'],
  },
  '10-FEET Dai Zero Kan': {
    expectedArtist: '10-FEET',
    display: 'Dai Zero Kan (The First Slam Dunk / สแลมดังก์)',
    aliases: ['Dai Zero Kan', '第ゼロ感', 'Slam Dunk', 'The First Slam Dunk', 'สแลมดังก์'],
  },
  'JAM Project THE HERO': {
    expectedArtist: 'JAM Project',
    display: 'THE HERO!! (One Punch Man / วันพันช์แมน)',
    aliases: ['THE HERO', 'One Punch Man', 'วันพันช์แมน'],
  },
  'UNISON SQUARE GARDEN Chaos ga Kiwamaru': {
    expectedArtist: 'UNISON SQUARE GARDEN',
    display: 'Chaos ga Kiwamaru (Blue Lock / ขังดวลแข้ง)',
    aliases: ['Chaos ga Kiwamaru', 'Blue Lock', 'ขังดวลแข้ง'],
  },
  'Konomi Suzuki Redo': {
    expectedArtist: 'Konomi Suzuki',
    display: 'Redo (Re:Zero / รีเซทชีวิต ฝ่าวิกฤตต่างโลก)',
    aliases: ['Redo', 'Re:Zero', 'ReZero', 'รีเซทชีวิตฝ่าวิกฤตต่างโลก'],
  },
  'MYTH & ROID Voracity': {
    expectedArtist: 'Myth & Roid',
    display: 'VORACITY (Overlord / โอเวอร์ลอร์ด)',
    aliases: ['VORACITY', 'Overlord', 'โอเวอร์ลอร์ด'],
  },
  'OxT Clattanoia': {
    expectedArtist: 'OxT',
    display: 'Clattanoia (Overlord / โอเวอร์ลอร์ด)',
    aliases: ['Clattanoia', 'Overlord', 'โอเวอร์ลอร์ด'],
  },
  'UVERworld Touch off': {
    expectedArtist: 'UVERworld',
    display: 'Touch off (The Promised Neverland / พันธสัญญาเนเวอร์แลนด์)',
    aliases: ['Touch off', 'The Promised Neverland', 'พันธสัญญาเนเวอร์แลนด์'],
  },
  'EGOIST The Everlasting Guilty Crown': {
    expectedArtist: 'EGOIST',
    display: 'The Everlasting Guilty Crown (Guilty Crown / ปฏิวัติหัตถ์ราชัน)',
    aliases: ['The Everlasting Guilty Crown', 'Guilty Crown', 'ปฏิวัติหัตถ์ราชัน'],
  },
  'supercell Kimi no Shiranai Monogatari': {
    expectedArtist: 'Supercell',
    display: 'Kimi no Shiranai Monogatari (Bakemonogatari / ปกรณัมของเหล่าภูต)',
    aliases: ['Kimi no Shiranai Monogatari', 'Kimino Shiranai Monogatari', 'Bakemonogatari', 'ปกรณัมของเหล่าภูต'],
  },
  'Aimer Brave Shine': {
    expectedArtist: 'Aimer',
    display: 'Brave Shine (Fate/stay night: UBW / มหาสงครามจอกศักดิ์สิทธิ์)',
    aliases: ['Brave Shine', 'Fate stay night', 'Fate', 'มหาสงครามจอกศักดิ์สิทธิ์'],
  },
  'LiSA Oath Sign': {
    expectedArtist: 'LiSA',
    display: 'Oath Sign (Fate/Zero / ปฐมบทสงครามจอกศักดิ์สิทธิ์)',
    aliases: ['Oath Sign', 'Fate Zero', 'Fate', 'ปฐมบทสงครามจอกศักดิ์สิทธิ์'],
  },
  'Masatoshi Ono Departure': {
    expectedArtist: 'Masatoshi Ono',
    display: 'Departure! (Hunter x Hunter / ฮันเตอร์ x ฮันเตอร์)',
    aliases: ['Departure', 'Hunter x Hunter', 'HxH', 'ฮันเตอร์xฮันเตอร์'],
  },
  'Galneryus Hunting for your dream': {
    expectedArtist: 'GALNERYUS',
    display: 'HUNTING FOR YOUR DREAM (Hunter x Hunter / ฮันเตอร์ x ฮันเตอร์)',
    aliases: ['Hunting for your dream', 'Hunter x Hunter', 'HxH', 'ฮันเตอร์xฮันเตอร์'],
  },
  'ORANGE RANGE Asterisk': {
    expectedArtist: 'Orange Range',
    display: '*Asterisk (Bleach / เทพมรณะ)',
    aliases: ['Asterisk', 'Bleach', 'เทพมรณะ'],
  },
  'Ryokuoushoku Shakai Be a flower': {
    expectedArtist: 'Ryokuoushoku Shakai',
    display: 'Be a flower / Hana ni Natte (The Apothecary Diaries / หมอยาตำรับโคมแดง)',
    aliases: ['Be a flower', 'Hana ni Natte', '花になって', 'The Apothecary Diaries', 'หมอยาตำรับโคมแดง'],
  },
  'SawanoHiroyuki[nZk] LEveL': {
    expectedArtist: 'SawanoHiroyuki',
    display: 'LEveL (Solo Leveling / โซโลเลเวลลิง)',
    aliases: ['LEveL', 'Solo Leveling', 'โซโลเลเวลลิง'],
  },
  'YUNGBLUD Abyss': {
    expectedArtist: 'YUNGBLUD',
    display: 'Abyss (Kaiju No. 8 / ไคจูหมายเลข 8)',
    aliases: ['Abyss', 'Kaiju No 8', 'ไคจูหมายเลข 8'],
  },
  'OneRepublic Nobody': {
    expectedArtist: 'OneRepublic',
    display: 'Nobody (Kaiju No. 8 / ไคจูหมายเลข 8)',
    aliases: ['Nobody', 'Kaiju No 8', 'ไคจูหมายเลข 8'],
  },
  'Rosa Walton I Really Want to Stay at Your House': {
    expectedArtist: 'Rosa Walton',
    display: 'I Really Want to Stay at Your House (Cyberpunk: Edgerunners / ไซเบอร์พังก์)',
    aliases: ['I Really Want to Stay at Your House', 'Cyberpunk Edgerunners', 'Cyberpunk', 'ไซเบอร์พังก์'],
  },
  'FLOW COLORS': {
    expectedArtist: 'Flow',
    display: 'COLORS (Code Geass / โค้ดกีอัส)',
    aliases: ['COLORS', 'Code Geass', 'โค้ดกีอัส'],
  },
  'Gen Hoshino Doraemon': {
    expectedArtist: 'Gen Hoshino',
    display: 'Doraemon (Doraemon / โดราเอมอน)',
    aliases: ['Doraemon', 'โดราเอมอน'],
  },
  'Motohiro Hata Himawari no Yakusoku': {
    expectedArtist: 'Motohiro Hata',
    display: 'Himawari no Yakusoku (Stand by Me Doraemon / โดราเอมอน)',
    aliases: ['Himawari no Yakusoku', 'Doraemon', 'Stand by Me Doraemon', 'โดราเอมอน'],
  },
  'BUMP OF CHICKEN Chronostasis': {
    expectedArtist: 'BUMP OF CHICKEN',
    display: 'Chronostasis (Detective Conan / ยอดนักสืบจิ๋วโคนัน)',
    aliases: ['Chronostasis', 'Detective Conan', 'Conan', 'โคนัน', 'ยอดนักสืบจิ๋วโคนัน'],
  },
  'Hikaru Utada One Last Kiss': {
    expectedArtist: 'Hikaru Utada',
    display: 'One Last Kiss (Evangelion / อีวานเกเลียน)',
    aliases: ['One Last Kiss', 'Evangelion', 'อีวานเกเลียน'],
  },
  'RADWIMPS Suzume': {
    expectedArtist: 'Radwimps',
    display: 'Suzume (Suzume / การผนึกประตูของซุซุเมะ)',
    aliases: ['Suzume', 'การผนึกประตูของซุซุเมะ', 'ซุซุเมะ'],
  },
  'RADWIMPS Grand Escape': {
    expectedArtist: 'Radwimps',
    display: 'Grand Escape (Weathering With You / ฤดูฝัน ฉันมีเธอ)',
    aliases: ['Grand Escape', 'Weathering With You', 'Tenki no Ko', 'ฤดูฝันฉันมีเธอ'],
  },
  'TRUE Sincerely': {
    expectedArtist: 'TRUE',
    display: 'Sincerely (Violet Evergarden / ไวโอเล็ต เอเวอร์การ์เดน)',
    aliases: ['Sincerely', 'Violet Evergarden', 'ไวโอเล็ตเอเวอร์การ์เดน'],
  },
  'SPYAIR Samurai Heart': {
    expectedArtist: 'Spyair',
    display: 'Samurai Heart (Gintama / กินทามะ)',
    aliases: ['Samurai Heart', 'Some Like It Hot', 'Gintama', 'กินทามะ'],
  },
  'THE ORAL CIGARETTES Kyoran Hey Kids!!': {
    expectedArtist: 'THE ORAL CIGARETTES',
    display: 'Kyoran Hey Kids!! (Noragami / โนรางามิ เทวดาขาจร)',
    aliases: ['Kyoran Hey Kids', 'Kyouran Hey Kids', 'Noragami', 'โนรางามิ'],
  },
  'UNISON SQUARE GARDEN Sugar Song and Bitter Step': {
    expectedArtist: 'UNISON SQUARE GARDEN',
    display: 'Sugar Song and Bitter Step (Kekkai Sensen / สมรภูมิเขตป้องกันโลหิต)',
    aliases: ['Sugar Song and Bitter Step', 'Kekkai Sensen', 'Blood Blockade Battlefront', 'สมรภูมิเขตป้องกันโลหิต'],
  },
  'Konomi Suzuki This game': {
    expectedArtist: 'Konomi Suzuki',
    display: 'This game (No Game No Life / โนเกม โนไลฟ์)',
    aliases: ['This game', 'No Game No Life', 'NGNL', 'โนเกมโนไลฟ์'],
  },
  'Machico fantastic dreamer': {
    expectedArtist: 'Machico',
    display: 'fantastic dreamer (KonoSuba / ขอให้โชคดีมีชัยในโลกแฟนตาซี)',
    aliases: ['fantastic dreamer', 'KonoSuba', 'ขอให้โชคดีมีชัยในโลกแฟนตาซี'],
  },
  'TRUE Storyteller': {
    expectedArtist: 'TRUE',
    display: 'Storyteller (Tensei Slime / เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว)',
    aliases: ['Storyteller', 'Tensei Slime', 'That Time I Got Reincarnated as a Slime', 'เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว', 'สไลม์'],
  },
  'LONGMAN Spiral': {
    expectedArtist: 'LONGMAN',
    display: 'Spiral (Mushoku Tensei / เกิดชาตินี้พี่ต้องเทพ)',
    aliases: ['Spiral', 'Mushoku Tensei', 'เกิดชาตินี้พี่ต้องเทพ'],
  },
  'MADKID RISE': {
    expectedArtist: 'Madkid',
    display: 'RISE (The Rising of the Shield Hero / ผู้กล้าโล่ผงาด)',
    aliases: ['RISE', 'Shield Hero', 'The Rising of the Shield Hero', 'ผู้กล้าโล่ผงาด'],
  },
  'BURNOUT SYNDROMES Good Morning World': {
    expectedArtist: 'BURNOUT SYNDROMES',
    display: 'Good Morning World! (Dr. STONE / ดร.สโตน เจ้าแห่งวิทยาศาสตร์)',
    aliases: ['Good Morning World', 'Dr. STONE', 'Dr Stone', 'ดรสโตน'],
  },
  'T.M.Revolution resonance': {
    expectedArtist: 'T.M.Revolution',
    display: 'Resonance (Soul Eater / โซลอีทเตอร์ ยมทูตกลืนวิญญาณ)',
    aliases: ['Resonance', 'Soul Eater', 'โซลอีทเตอร์'],
  },
  'FUNKIST Snow fairy': {
    expectedArtist: 'FUNKIST',
    display: 'Snow fairy (Fairy Tail / แฟรี่เทล ศึกจอมเวทอภินิหาร)',
    aliases: ['Snow fairy', 'Fairy Tail', 'แฟรี่เทล'],
  },
  'BoA MASAYUME CHASING': {
    expectedArtist: 'BoA',
    display: 'MASAYUME CHASING (Fairy Tail / แฟรี่เทล ศึกจอมเวทอภินิหาร)',
    aliases: ['MASAYUME CHASING', 'Fairy Tail', 'แฟรี่เทล'],
  },
  'UVERworld CORE PRIDE': {
    expectedArtist: 'UVERworld',
    display: 'CORE PRIDE (Blue Exorcist / มือปราบผีพันธุ์ซาตาน)',
    aliases: ['CORE PRIDE', 'Blue Exorcist', 'Ao no Exorcist', 'มือปราบผีพันธุ์ซาตาน'],
  },
  'Lia My Soul, Your Beats': {
    expectedArtist: 'lia',
    display: 'My Soul, Your Beats! (Angel Beats! / แองเจิลบีทส์)',
    aliases: ['My Soul Your Beats', 'Angel Beats', 'แองเจิลบีทส์'],
  },
  'ZONE secret base': {
    expectedArtist: 'Zone',
    display: 'secret base ~Kimi ga Kureta Mono~ (Anohana / ดอกไม้ มิตรภาพ และความทรงจำ)',
    aliases: ['secret base', 'Anohana', 'ดอกไม้มิตรภาพและความทรงจำ'],
  },
  'fripSide only my railgun': {
    expectedArtist: 'Fripside',
    display: 'only my railgun (A Certain Scientific Railgun / เรลกัน แฟ้มลับคดีวิทยาศาสตร์)',
    aliases: ['only my railgun', 'Railgun', 'Toaru Kagaku no Railgun', 'เรลกัน'],
  },
  'FZMZ BROKEN GAMES': {
    expectedArtist: 'FZMZ',
    display: 'BROKEN GAMES (Shangri-La Frontier / แชงกรีล่า ฟรอนเทียร์)',
    aliases: ['BROKEN GAMES', 'Shangri-La Frontier', 'แชงกรีล่าฟรอนเทียร์'],
  },
  'natori Absolute Zero': {
    expectedArtist: 'natori',
    display: 'Absolute Zero / Zettai Reido (Wind Breaker / วินด์เบรกเกอร์)',
    aliases: ['Absolute Zero', 'Zettai Reido', 'Wind Breaker', 'วินด์เบรกเกอร์'],
  },
  'Official HIGE DANdism Same Blue': {
    expectedArtist: 'Official HIGE DANdism',
    display: 'Same Blue (Blue Box / กล่องรักวัยใส)',
    aliases: ['Same Blue', 'Blue Box', 'Ao no Hako', 'กล่องรักวัยใส'],
  },
  'Creepy Nuts Daten': {
    expectedArtist: 'Creepy Nuts',
    display: 'Daten (Call of the Night / เพลงรักมนุษย์ค้างคาว)',
    aliases: ['Daten', 'Call of the Night', 'Yofukashi no Uta', 'เพลงรักมนุษย์ค้างคาว'],
  },
  'Creepy Nuts Yofukashi no Uta': {
    expectedArtist: 'Creepy Nuts',
    display: 'Yofukashi no Uta (Call of the Night / เพลงรักมนุษย์ค้างคาว)',
    aliases: ['Yofukashi no Uta', 'Call of the Night', 'เพลงรักมนุษย์ค้างคาว'],
  },
  'ClariS ALIVE': {
    expectedArtist: 'ClariS',
    display: 'ALIVE (Lycoris Recoil / ไลโคริส รีคอยล์)',
    aliases: ['ALIVE', 'Lycoris Recoil', 'ไลโคริสรีคอยล์'],
  },
  'さユり 花の塔': {
    expectedArtist: 'SAYURI',
    display: 'Hana no Tou / Tower of Flower (Lycoris Recoil / ไลโคริส รีคอยล์)',
    aliases: ['Hana no Tou', 'Tower of Flower', '花の塔', 'Lycoris Recoil', 'ไลโคริสรีคอยล์'],
  },
  'YOASOBI 怪物': {
    expectedArtist: 'YOASOBI',
    display: 'Kaibutsu / Monster (BEASTARS / บีสตาร์)',
    aliases: ['Kaibutsu', 'Monster', '怪物', 'BEASTARS', 'บีสตาร์'],
  },
  'YOASOBI 祝福': {
    expectedArtist: 'YOASOBI',
    display: 'Shukufuku / The Blessing (Gundam: The Witch from Mercury / กันดั้ม แม่มดจากดาวพุธ)',
    aliases: ['Shukufuku', 'The Blessing', '祝福', 'Gundam', 'Witch from Mercury', 'กันดั้ม'],
  },
  'Do As Infinity Fukai Mori': {
    expectedArtist: 'Do As Infinity',
    display: 'Fukai Mori (Inuyasha / อินุยาฉะ เทพอสูรจิ้งจอกเงิน)',
    aliases: ['Fukai Mori', '深い森', 'Inuyasha', 'อินุยาฉะ'],
  },
  'GRANRODEO Can Do': {
    expectedArtist: 'GRANRODEO',
    display: 'Can Do (Kuroko no Basket / คุโรโกะ นายจืดพลิกสังเวียนบาส)',
    aliases: ['Can Do', 'Kuroko no Basket', 'Kurokos Basketball', 'คุโรโกะ'],
  },
  'sumika Fiction': {
    expectedArtist: 'sumika',
    display: 'Fiction (Wotakoi / ยากแท้จริงหนอรักของโอตาคุ)',
    aliases: ['Fiction', 'Wotakoi', 'ยากแท้จริงหนอรักของโอตาคุ'],
  },
  'Ikimonogakari Netsujou no Spectrum': {
    expectedArtist: 'Ikimonogakari',
    display: 'Netsujou no Spectrum (The Seven Deadly Sins / ศึกตำนาน 7 อัศวิน)',
    aliases: ['Netsujou no Spectrum', 'Seven Deadly Sins', 'Nanatsu no Taizai', 'ศึกตำนาน 7 อัศวิน'],
  },
  'Survive Said The Prophet MUKANJYO': {
    expectedArtist: 'Survive Said The Prophet',
    display: 'MUKANJYO (Vinland Saga / สงครามคนทมิฬ)',
    aliases: ['MUKANJYO', 'Vinland Saga', 'สงครามคนทมิฬ'],
  },
  'Queen Bee Fire': {
    expectedArtist: 'QUEEN BEE',
    display: 'Fire / Kaen (Dororo / ดาบล่าพญามาร โดโรโระ)',
    aliases: ['Fire', 'Kaen', '火炎', 'Dororo', 'โดโรโระ'],
  },
  'MAN WITH A MISSION Winding Road': {
    expectedArtist: 'Man With A Mission',
    display: 'Winding Road (Golden Kamuy / โกลเดนคามุย)',
    aliases: ['Winding Road', 'Golden Kamuy', 'โกลเดนคามุย'],
  },
  'Fear, and Loathing in Las Vegas Let Me Hear': {
    expectedArtist: 'Fear, and Loathing in Las Vegas',
    display: 'Let Me Hear (Parasyte / ปรสิต เดรัจฉาน)',
    aliases: ['Let Me Hear', 'Parasyte', 'Kiseijuu', 'ปรสิตเดรัจฉาน'],
  },
  'Ling tosite sigure abnormalize': {
    expectedArtist: 'Ling tosite sigure',
    display: 'abnormalize (Psycho-Pass / ไซโคพาส ถอดรหัสล่า)',
    aliases: ['abnormalize', 'Psycho-Pass', 'ไซโคพาส'],
  },
  'Eir Aoi Sirius': {
    expectedArtist: 'Eir Aoi',
    display: 'Sirius (Kill la Kill / คิลลาคิล)',
    aliases: ['Sirius', 'Kill la Kill', 'คิลลาคิล'],
  },
  'Mika Nakashima KISS OF DEATH': {
    expectedArtist: 'Mika Nakashima',
    display: 'KISS OF DEATH (DARLING in the FRANXX / ดาร์ลิงอินเดอะแฟรงก์)',
    aliases: ['KISS OF DEATH', 'Darling in the Franxx', 'ดาร์ลิงอินเดอะแฟรงก์'],
  },
  'Sora Amamiya Skyreach': {
    expectedArtist: 'Sora Amamiya',
    display: 'Skyreach (Akame ga Kill! / อาคาเมะ สวยประหาร)',
    aliases: ['Skyreach', 'Akame ga Kill', 'อาคาเมะสวยประหาร'],
  },
};

export function extractAnimeTitle(rawDisplayOrTitle: string): string {
  const match = rawDisplayOrTitle.match(/\(([^()]+\/[^()]+)\)\s*$/);
  const inner = match ? match[1].trim() : rawDisplayOrTitle.trim();
  return inner
    .replace(/\b(SS\d+|Season\s*\d+|Part\s*\d+|Film:\s*Red|Shippuden|√A|:re|:\s*Alicization|:\s*Brotherhood|:\s*UBW)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\/\s+/g, ' / ')
    .trim();
}

export function isRelevantTrackForQuery(
  item: DeezerTrackRaw,
  query: string,
  category: Category
): boolean {
  const artistName = (item.artist?.name || '').trim();
  const rawTitle = (item.title || '').trim();
  const shortTitle = (item.title_short || '').trim();
  const titleVersion = (item.title_version || '').trim();
  const albumTitle = (item.album?.title || '').trim();
  if (!artistName || !rawTitle) return false;

  // Reject any non-official / session / live / acoustic / off-vocal / remix / cover version
  if (
    NON_OFFICIAL_TITLE_REGEX.test(rawTitle) ||
    NON_OFFICIAL_TITLE_REGEX.test(shortTitle) ||
    NON_OFFICIAL_TITLE_REGEX.test(titleVersion) ||
    NON_OFFICIAL_TITLE_REGEX.test(artistName) ||
    NON_OFFICIAL_ALBUM_REGEX.test(albumTitle)
  ) {
    return false;
  }

  // Avoid self-titled group intro/overture tracks (e.g., track "BNK48" by artist "BNK48")
  if (rawTitle.toLowerCase() === artistName.toLowerCase()) {
    return false;
  }

  if (category === 'idol48') {
    return IDOL48_ARTIST_REGEX.test(artistName);
  }

  const artistLower = artistName.toLowerCase();
  const qLower = query.toLowerCase();

  if (category === 'anime') {
    const animeMeta = ANIME_QUERY_META[query];
    if (animeMeta) {
      const expLower = animeMeta.expectedArtist.toLowerCase();
      return (
        artistLower === expLower ||
        artistLower.includes(expLower) ||
        expLower.includes(artistLower)
      );
    }
  }

  const isArtistMatch =
    artistLower === qLower || artistLower.includes(qLower) || qLower.includes(artistLower);

  if (!isArtistMatch) {
    return false;
  }

  if (category === 'thai' || category === 'tpop') {
    // Strictly require Thai script in the song title AND matching artist so foreign / cover tracks never enter
    return THAI_SCRIPT_REGEX.test(rawTitle);
  }

  return true;
}

async function fetchDeezerQuery(query: string, category: Category): Promise<TrackItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=8`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: DeezerTrackRaw[] };
    if (!Array.isArray(json.data)) return [];

    const matched: TrackItem[] = [];
    for (const item of json.data) {
      if (!item.preview || typeof item.preview !== 'string' || !item.title) continue;
      if (!isRelevantTrackForQuery(item, query, category)) continue;

      let cleanTitle = cleanSongTitleForDisplay(item.title_short || item.title);
      if (!cleanTitle) continue;
      if ((category === 'thai' || category === 'tpop') && !THAI_SCRIPT_REGEX.test(cleanTitle)) {
        continue;
      }

      const aliases = new Set<string>([cleanTitle, item.title]);
      if (item.title_short) aliases.add(item.title_short);

      const romajiInfo = AKB48_ROMAJI_MAP[cleanTitle];
      if (romajiInfo) {
        cleanTitle = romajiInfo.display;
        for (const a of romajiInfo.aliases) aliases.add(a);
      }

      let animeTitle: string | undefined;
      if (category === 'anime' && ANIME_QUERY_META[query]) {
        const animeInfo = ANIME_QUERY_META[query];
        cleanTitle = animeInfo.display;
        animeTitle = extractAnimeTitle(animeInfo.display);
        aliases.add(animeTitle);
        for (const a of animeInfo.aliases) aliases.add(a);
      }

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
        animeTitle,
        category,
      });
    }

    // For specific song queries (thai / tpop / anime), take the top official studio match directly
    if (category === 'thai' || category === 'tpop' || category === 'anime') {
      return matched.slice(0, 1);
    }
    if (category === 'idol48') {
      return query.trim().includes(' ')
        ? matched.slice(0, 2)
        : shuffleArray(matched).slice(0, 4);
    }
    return shuffleArray(matched).slice(0, 2);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

const fetchedQueriesByCategory = new Map<Category, Set<string>>();
const recentPlayedIdsByCategory = new Map<Category, string[]>();
const recentPlayedBucketsByCategory = new Map<Category, string[]>();

export async function getCategoryPool(
  category: Category,
  store: StateStore,
  forceAugment = false
): Promise<TrackItem[]> {
  const cached = await store.getCachedTracks(category);
  if (!forceAugment && cached && cached.length >= 16) {
    return cached;
  }

  if (category === 'tts') {
    if (cached && cached.length >= 16) {
      return cached;
    }
    const thaiTracks = await getCategoryPool('thai', store);
    const combinedMap = new Map<string, TrackItem>();

    for (const t of thaiTracks) {
      const ttsId = `tts-dz-${t.id}`;
      ttsTrackMetaMap.set(ttsId, {
        title: t.title,
        artist: t.artist,
      });
      combinedMap.set(normalizeSongText(t.title), {
        ...t,
        id: ttsId,
        preview: `/api/tts-audio/${ttsId}`,
        category: 'tts',
      });
    }

    for (const e of TTS_SONG_ENTRIES) {
      const normKey = normalizeSongText(e.title);
      if (!combinedMap.has(normKey)) {
        combinedMap.set(normKey, {
          id: e.id,
          title: e.title,
          artist: e.artist,
          cover: `https://picsum.photos/seed/${e.id}/400/400`,
          preview: `/api/tts-audio/${e.id}`,
          aliases: e.aliases,
          category: 'tts',
        });
      }
    }

    const ttsPool = Array.from(combinedMap.values());
    await store.setCachedTracks('tts', ttsPool, CACHE_TTL_MS);
    return ttsPool;
  }

  let queries: Array<{ q: string; cat: Category }> = [];
  if (category === 'mixed') {
    const subCats: Array<Exclude<Category, 'mixed' | 'tts'>> = [
      'thai',
      'tpop',
      'idol48',
      'anime',
      'inter',
      'kpop',
      'retro',
    ];
    for (const c of subCats) {
      const sample = shuffleArray(CATEGORY_QUERIES[c]).slice(0, 7);
      for (const q of sample) {
        queries.push({ q, cat: c });
      }
    }
  } else {
    const allQueries = CATEGORY_QUERIES[category];
    let fetchedSet = fetchedQueriesByCategory.get(category);
    if (!fetchedSet) {
      fetchedSet = new Set<string>();
      fetchedQueriesByCategory.set(category, fetchedSet);
    }

    // Prioritize queries that haven't been fetched yet so consecutive games explore the full catalog
    const unfetched = shuffleArray(allQueries.filter((q) => !fetchedSet!.has(q)));
    const batchSize = forceAugment ? 36 : 48;
    let selectedQueries: string[];
    if (unfetched.length >= batchSize) {
      selectedQueries = unfetched.slice(0, batchSize);
    } else {
      const remainingNeeded = batchSize - unfetched.length;
      fetchedSet.clear();
      const refill = shuffleArray(
        allQueries.filter((q) => !unfetched.includes(q))
      ).slice(0, Math.max(0, remainingNeeded));
      selectedQueries = [...unfetched, ...refill];
    }

    for (const q of selectedQueries) {
      fetchedSet.add(q);
    }
    queries = selectedQueries.map((q) => ({ q, cat: category }));
  }

  const fetchedBatches = await Promise.all(
    queries.map(({ q, cat }) => fetchDeezerQuery(q, cat))
  );

  const deduped = new Map<string, TrackItem>();
  // Preserve already-cached official tracks so augmenting expands the pool rather than replacing it
  if (cached && cached.length > 0) {
    for (const existing of cached) {
      if (existing.id.startsWith('fb-')) continue;
      const normKey = normalizeSongText(existing.title);
      if (normKey && !deduped.has(normKey)) {
        deduped.set(normKey, existing);
      }
    }
  }

  for (const batch of fetchedBatches) {
    for (const track of batch) {
      const normKey = normalizeSongText(track.title);
      if (!normKey) continue;
      if (!deduped.has(normKey)) {
        deduped.set(normKey, track);
      }
    }
  }

  // Only merge fallback tracks that match the requested category
  if (deduped.size < 16) {
    const relevantFallbacks =
      category === 'mixed'
        ? FALLBACK_TRACKS
        : FALLBACK_TRACKS.filter((t) => t.category === category);
    for (const fb of relevantFallbacks) {
      const normKey = normalizeSongText(fb.title);
      if (!deduped.has(normKey)) {
        deduped.set(normKey, fb);
      }
    }
  }

  const finalPool = shuffleArray(Array.from(deduped.values()));
  await store.setCachedTracks(category, finalPool, CACHE_TTL_MS);
  return finalPool;
}

function getTrackBucketKey(track: TrackItem): string {
  return track.category === 'anime'
    ? extractAnimeTitle(track.animeTitle || track.title).toLowerCase().trim()
    : track.artist.toLowerCase().trim();
}

function selectRoundRobinFromTier(
  candidates: TrackItem[],
  needed: number,
  chosenIds: Set<string>,
  chosenBuckets: Set<string>
): TrackItem[] {
  if (needed <= 0 || candidates.length === 0) return [];

  const byBucket = new Map<string, TrackItem[]>();
  for (const track of shuffleArray(candidates)) {
    if (chosenIds.has(track.id)) continue;
    const key = getTrackBucketKey(track);
    const list = byBucket.get(key) ?? [];
    list.push(track);
    byBucket.set(key, list);
  }

  // Order buckets so anime/artists not yet picked in this match come first
  const freshBuckets: TrackItem[][] = [];
  const repeatBuckets: TrackItem[][] = [];
  for (const [key, list] of shuffleArray(Array.from(byBucket.entries()))) {
    if (chosenBuckets.has(key)) {
      repeatBuckets.push(list);
    } else {
      freshBuckets.push(list);
    }
  }

  const orderedBuckets = [...freshBuckets, ...repeatBuckets];
  const picked: TrackItem[] = [];
  let pass = 0;

  while (picked.length < needed) {
    let addedInPass = false;
    for (const bucket of orderedBuckets) {
      if (pass < bucket.length) {
        const candidate = bucket[pass];
        if (!chosenIds.has(candidate.id)) {
          picked.push(candidate);
          chosenIds.add(candidate.id);
          chosenBuckets.add(getTrackBucketKey(candidate));
          addedInPass = true;
          if (picked.length >= needed) break;
        }
      }
    }
    if (!addedInPass) break;
    pass += 1;
  }

  return picked;
}

/**
 * Picks `count` tracks for a room while enforcing maximum artist/anime diversity
 * and avoiding repeating recently played tracks across consecutive games.
 */
export async function pickTracksForRoom(
  category: Category,
  count: number,
  usedTrackIds: Set<string>,
  store: StateStore
): Promise<{ selected: TrackItem[]; fullPool: TrackItem[] }> {
  let pool = await getCategoryPool(category, store);
  const recentIdsList = recentPlayedIdsByCategory.get(category) ?? [];
  const recentIds = new Set<string>(recentIdsList);
  const recentBucketsList = recentPlayedBucketsByCategory.get(category) ?? [];
  const recentBuckets = new Set<string>(recentBucketsList);

  const freshCount = pool.filter(
    (t) => !usedTrackIds.has(t.id) && !recentIds.has(t.id)
  ).length;

  // If the current cached pool doesn't have enough fresh songs for this round, augment the pool from unfetched queries
  if (freshCount < count && category !== 'tts') {
    pool = await getCategoryPool(category, store, true);
  }

  const chosenIds = new Set<string>();
  const chosenBuckets = new Set<string>();
  const selected: TrackItem[] = [];

  // Tier 1: Unused in room, not in recent cross-game history, AND anime/artist not in recent cross-game history
  const tier1 = pool.filter(
    (t) =>
      !usedTrackIds.has(t.id) &&
      !recentIds.has(t.id) &&
      !recentBuckets.has(getTrackBucketKey(t))
  );
  // Tier 2: Unused in room and not in recent cross-game history
  const tier2 = pool.filter(
    (t) => !usedTrackIds.has(t.id) && !recentIds.has(t.id)
  );
  // Tier 3: Unused in room
  const tier3 = pool.filter((t) => !usedTrackIds.has(t.id));
  // Tier 4: Not in recent cross-game history
  const tier4 = pool.filter((t) => !recentIds.has(t.id));
  // Tier 5: Full pool fallback
  const tier5 = pool;

  for (const tier of [tier1, tier2, tier3, tier4, tier5]) {
    if (selected.length >= count) break;
    const more = selectRoundRobinFromTier(
      tier,
      count - selected.length,
      chosenIds,
      chosenBuckets
    );
    selected.push(...more);
  }

  const updatedRecentIds = [...recentIdsList];
  const updatedRecentBuckets = [...recentBucketsList];

  for (const t of selected) {
    usedTrackIds.add(t.id);
    updatedRecentIds.push(t.id);
    updatedRecentBuckets.push(getTrackBucketKey(t));
  }

  const maxRecentIds = Math.min(
    Math.max(count * 3, 45),
    Math.max(10, Math.floor(pool.length * 0.75))
  );
  const totalDistinctBuckets = new Set(pool.map(getTrackBucketKey)).size;
  const maxRecentBuckets = Math.min(
    Math.max(count * 2, 24),
    Math.max(6, Math.floor(totalDistinctBuckets * 0.65))
  );

  recentPlayedIdsByCategory.set(
    category,
    updatedRecentIds.slice(-maxRecentIds)
  );
  recentPlayedBucketsByCategory.set(
    category,
    updatedRecentBuckets.slice(-maxRecentBuckets)
  );

  return { selected: shuffleArray(selected), fullPool: pool };
}

export function buildChoicesForTrack(target: TrackItem, pool: TrackItem[]): string[] {
  if (target.category === 'anime') {
    const correctAnime = extractAnimeTitle(target.animeTitle || target.title);
    const usedAnimeNorms = new Set<string>([normalizeSongText(correctAnime)]);
    const animeDistractors: string[] = [];

    const animeCandidates = [
      ...shuffleArray(pool.filter((t) => t.category === 'anime')),
      ...shuffleArray(FALLBACK_TRACKS.filter((t) => t.category === 'anime')),
    ];

    for (const c of animeCandidates) {
      const label = extractAnimeTitle(c.animeTitle || c.title);
      const norm = normalizeSongText(label);
      if (norm && !usedAnimeNorms.has(norm)) {
        usedAnimeNorms.add(norm);
        animeDistractors.push(label);
        if (animeDistractors.length === 3) break;
      }
    }

    return shuffleArray([correctAnime, ...animeDistractors.slice(0, 3)]);
  }

  const targetNorm = normalizeSongText(target.title);
  const targetArtistKey = target.artist.toLowerCase().trim();

  const sameCatDifferentArtist = pool.filter(
    (t) =>
      t.id !== target.id &&
      normalizeSongText(t.title) !== targetNorm &&
      t.category === target.category &&
      t.artist.toLowerCase().trim() !== targetArtistKey
  );
  const sameCatSameArtist = pool.filter(
    (t) =>
      t.id !== target.id &&
      normalizeSongText(t.title) !== targetNorm &&
      t.category === target.category &&
      t.artist.toLowerCase().trim() === targetArtistKey
  );

  const distractors: string[] = [];
  const usedNorms = new Set<string>([targetNorm]);

  if (target.category === 'idol48') {
    // For 48 Group, include same-group songs in the distractors so players can't guess purely by BNK48 vs CGM48 vs AKB48
    const idolCandidates = [
      ...shuffleArray(sameCatSameArtist).slice(0, 2),
      ...shuffleArray(sameCatDifferentArtist),
      ...shuffleArray(sameCatSameArtist),
    ];
    for (const c of idolCandidates) {
      const n = normalizeSongText(c.title);
      if (!usedNorms.has(n)) {
        usedNorms.add(n);
        distractors.push(`${c.title} — ${c.artist}`);
        if (distractors.length === 3) break;
      }
    }
  } else {
    const candidates = [
      ...shuffleArray(sameCatDifferentArtist),
      ...shuffleArray(sameCatSameArtist),
    ];
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
  }

  // Fallback pass using only tracks of the SAME category
  const categoryFallbacks = FALLBACK_TRACKS.filter((t) => t.category === target.category);
  for (const c of [
    ...shuffleArray(sameCatDifferentArtist),
    ...shuffleArray(sameCatSameArtist),
    ...categoryFallbacks,
  ]) {
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
