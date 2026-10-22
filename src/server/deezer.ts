import { Category, TrackItem } from '../shared/types.js';
import { cleanSongTitleForDisplay, normalizeSongText } from './scoring.js';
import { StateStore } from './store.js';

const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes so artist rotation stays fresh across games

const CATEGORY_QUERIES: Record<Exclude<Category, 'mixed' | 'tts'>, string[]> = {
  thai: [
    'Yented ว้าวุ่น',
    'Yented ที่รักใจเย็น',
    'SAUCE BKK ขี้แง',
    'NONT TANONT โต๊ะริม',
    'NONT TANONT รักแรก',
    'PUN เขียว เหลือง แดง',
    'PUN ที่เดิม',
    'Only Monday ท้ายปี',
    'Only Monday ได้แต่นึกถึง',
    'SERIOUS BACON เธอๆเพื่อนเราชอบ',
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
    'TELEx TELEXs เหมือนเดิม',
    'Violette Wautier ตั้งแต่มีเธอฉันมีความสุข',
    'Palmy ซ่อนกลิ่น',
    'Slot Machine เคลิ้ม',
    'Getsunova ความเงียบดังที่สุด',
    'Klear คำยินดี',
    '25hours ไม่เคย',
    'Labanoon เชือกวิเศษ',
    'STAMP มันคงเป็นความรัก',
    'THE TOYS ลาลาลอย',
    'GAVIN:D ได้แค่เดินมาส่ง',
    'F.HERO จำเลยรัก',
    'PP Krit ลังเล',
    'JOEY PHUWASIT นะหน้าทอง',
    'LOMOSONIC ขอ',
    'Three Man Down ฝนตกไหม',
    'Tilly Birds คิดแต่ไม่ถึง',
    'Billkin ชอบตัวเองตอนอยู่กับเธอ',
    'BOWKYLION วาดไว้',
    'Jeff Satur ซ่อนไม่หา',
    '4EVE วัดปะหล่ะ',
    'POTATO ปากดี',
    'Bodyslam ยาพิษ',
    'INK WARUNTORN สายตาหลอกกันไม่ได้',
    'Paper Planes ทรงอย่างแบด',
    'Fellow Fellow ดาวหางฮัลเลย์',
    'Polycat อาวรณ์',
    'Anatomy Rabbit ธรรมดาแสนพิเศษ',
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
    'SAUCE BKK ขี้แง',
    'PiXXiE ติดฝน',
    'PiXXiE เกินต้าน',
    'PiXXiE มูเตลู',
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
    'Jeff Satur ซ่อนไม่หา',
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
    'FOURTH อยู่เฉยๆก็น่ารัก',
    'FOURTH เทคะแนน',
    'NANON แค่เพื่อนมั้ง',
    'TIMETHAI เลิกกับพี่ได้ดีทุกคน',
    'TRINITY ชีวิตดีเพราะมีเธอ',
    'ALLY ผ้าเช็ดหน้า',
    'BNK48 คุกกี้เสี่ยงทาย',
    'ALALA ร้องไห้ดังๆ',
  ],
  idol48: [
    'BNK48',
    'BNK48 คุกกี้เสี่ยงทาย',
    'BNK48 โดดดิด่ง',
    'BNK48 วันแรก',
    'BNK48 เธอคือเมโลดี้',
    'BNK48 ดีอะ',
    'BNK48 หมกกบ',
    'BNK48 พลิ้ว',
    'BNK48 ฤดูใหม่',
    'BNK48 อยากจะได้พบเธอ',
    'BNK48 ซากุระแห่งความทรงจำ',
    'BNK48 สายฟ้าฟาด',
    'BNK48 สัญญานะ',
    'CGM48',
    'CGM48 มะลิ',
    'CGM48 เชียงใหม่ 106',
    'CGM48 2565',
    'CGM48 ผูกพันนิรันดร์',
    'CGM48 ความลับในใจ',
    'AKB48',
    'AKB48 Heavy Rotation',
    'AKB48 Koisuru Fortune Cookie',
    'AKB48 Ponytail to Shushu',
    'AKB48 Everyday Kachuusha',
    'AKB48 Flying Get',
    'AKB48 River',
    'AKB48 Beginner',
    'AKB48 Aitakatta',
    'AKB48 365nichi no Kamihikouki',
    'AKB48 Oogoe Diamond',
    'QRRA',
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

// Filter out non-original / beat / karaoke / off-vocal / 88rising / instrumental / sped-up tracks
const JUNK_TRACK_REGEX =
  /\b(88rising|off vocal|vocal off|instrumental|karaoke|backing track|type beat|free beat|beat|lofi|lo-fi|ringtone|tribute|cover|8-bit|lullaby|piano version|acapella|sped up|speed up|slowed|reverb)\b/i;

const IDOL48_ARTIST_REGEX = /^(bnk48|cgm48|akb48|qrra|vyra|mimigumo|indy camp)$/i;

export function isRelevantTrackForQuery(
  item: DeezerTrackRaw,
  query: string,
  category: Category
): boolean {
  const artistName = (item.artist?.name || '').trim();
  const rawTitle = (item.title || '').trim();
  if (!artistName || !rawTitle) return false;

  if (JUNK_TRACK_REGEX.test(rawTitle) || JUNK_TRACK_REGEX.test(artistName)) {
    return false;
  }

  if (category === 'idol48') {
    return IDOL48_ARTIST_REGEX.test(artistName);
  }

  if (category === 'thai' || category === 'tpop') {
    // Strictly require Thai script in the song title so foreign / 88rising / beat tracks never enter Thai or T-POP categories
    return THAI_SCRIPT_REGEX.test(rawTitle);
  }

  const artistLower = artistName.toLowerCase();
  const qLower = query.toLowerCase();
  return artistLower === qLower || artistLower.includes(qLower) || qLower.includes(artistLower);
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

      const cleanTitle = cleanSongTitleForDisplay(item.title_short || item.title);
      if (!cleanTitle) continue;
      if ((category === 'thai' || category === 'tpop') && !THAI_SCRIPT_REGEX.test(cleanTitle)) {
        continue;
      }

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

    // For idol48, allow up to 6 tracks per query since only 3 core groups exist; otherwise cap at 2
    const maxPerQuery = category === 'idol48' ? 6 : 2;
    return shuffleArray(matched).slice(0, maxPerQuery);
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
  if (cached && cached.length >= 16) {
    return cached;
  }

  if (category === 'tts') {
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
      'inter',
      'kpop',
      'retro',
    ];
    for (const c of subCats) {
      const sample = shuffleArray(CATEGORY_QUERIES[c]).slice(0, 5);
      for (const q of sample) {
        queries.push({ q, cat: c });
      }
    }
  } else {
    // Sample 24 different artist+song queries per category fetch for wide artist rotation
    const list = shuffleArray(CATEGORY_QUERIES[category]).slice(0, 24);
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
