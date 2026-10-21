import type { Attempt, Exercise, Lesson, Profile, Unit, Word } from './types'

const VN_MAP: Record<string, string> = {
  á:'a',à:'a',ả:'a',ã:'a',ạ:'a',
  ắ:'ă',ằ:'ă',ẳ:'ă',ẵ:'ă',ặ:'ă',
  ấ:'â',ầ:'â',ẩ:'â',ẫ:'â',ậ:'â',
  é:'e',è:'e',ẻ:'e',ẽ:'e',ẹ:'e',
  ế:'ê',ề:'ê',ể:'ê',ễ:'ê',ệ:'ê',
  í:'i',ì:'i',ỉ:'i',ĩ:'i',ị:'i',
  ó:'o',ò:'o',ỏ:'o',õ:'o',ọ:'o',
  ố:'ô',ồ:'ô',ổ:'ô',ỗ:'ô',ộ:'ô',
  ớ:'ơ',ờ:'ơ',ở:'ơ',ỡ:'ơ',ợ:'ơ',
  ú:'u',ù:'u',ủ:'u',ũ:'u',ụ:'u',
  ứ:'ư',ừ:'ư',ử:'ư',ữ:'ư',ự:'ư',
  ý:'y',ỳ:'y',ỷ:'y',ỹ:'y',ỵ:'y',
}

function vnBase(t: string): string {
  return [...t.toLowerCase()].map((c) => VN_MAP[c] ?? c).join('')
}

function vnTone(t: string): string {
  if (/[áắấéếíóốớúứý]/i.test(t)) return 'sắc'
  if (/[àằầèềìòồờùừỳ]/i.test(t)) return 'huyền'
  if (/[ảẳẩẻểỉỏổởủửỷ]/i.test(t)) return 'hỏi'
  if (/[ãẵẫẽễĩõỗỡũữỹ]/i.test(t)) return 'ngã'
  if (/[ạặậẹệịọộợụựỵ]/i.test(t)) return 'nặng'
  return 'ngang'
}

export interface MockDB {
  profiles: Profile[]
  units: Unit[]
  words: Word[]
  unit_words: { unit_id: number; word_id: number }[]
  lessons: Lesson[]
  exercises: Exercise[]
  attempts: Attempt[]
}

export function buildSeedDB(): MockDB {
  let unitId = 1
  const units: Unit[] = []
  const addUnit = (kind: Unit['kind'], subtype: string | null, value: string, order_index: number, title: string | null = null) => {
    if (units.some((u) => u.kind === kind && u.value === value)) return
    units.push({ id: unitId++, kind, subtype, value, title, order_index, published: true })
  }

  // Âm chính
  ;(['a','ă','â','e','ê','i','o','ô','ơ','u','ư','y'] as const).forEach((v, i) => addUnit('am', 'chinh', v, i + 1))
  // Âm phụ
  ;(['b','c','d','đ','g','h','k','l','m','n','p','q','r','s','t','v','x'] as const).forEach((v, i) => addUnit('am', 'phu', v, i + 1))
  // Phụ âm ghép
  ;(['ch','gh','gi','kh','ng','ngh','nh','ph','qu','th','tr'] as const).forEach((v, i) => addUnit('am', 'ghep', v, i + 1))
  // Vần
  ;(['ac','ăc','âc','oc','ôc','uc','ưc','at','ăt','ât','ot','ôt','ơt','ut','ưt','an','am','eo','ưa'] as const).forEach((v, i) => addUnit('van', null, v, i + 1))
  ;([
    ['ong',21],['ông',22],['ung',23],['ưng',24],['ang',25],['ăng',26],['âng',27],['ăn',28],['ân',29],['ăm',30],['âm',31],
  ] as const).forEach(([v, idx]) => addUnit('van', null, v, idx))
  // Thanh
  ;([
    ['ngang','Thanh ngang',1],
    ['sắc','Thanh sắc ( ´ )',2],
    ['huyền','Thanh huyền ( ` )',3],
    ['hỏi','Thanh hỏi ( ̉ )',4],
    ['ngã','Thanh ngã ( ˜ )',5],
    ['nặng','Thanh nặng ( . )',6],
  ] as const).forEach(([v, t, i]) => addUnit('thanh', null, v, i, t))

  // Words
  let wordId = 1
  const words: Word[] = []
  const rawWords: [string, string][] = [
    ['bà','👵'],['cá','🐟'],['gà','🐔'],['mèo','🐱'],['bò','🐄'],['hoa','🌸'],['nhà','🏠'],['xe','🚲'],
    ['ghế','🪑'],['nghé','🐃'],['khế','⭐'],['quả na','🍈'],['chó','🐕'],['thỏ','🐇'],['trâu','🐃'],['phở','🍜'],
    ['lọ mực','🖋️'],['cột mốc','🪧'],['hạt thóc','🌾'],['xúc xắc','🎲'],['gót chân','🦶'],['đôi mắt','👀'],
    ['quả ớt','🌶️'],['bật lửa','🔥'],['giấc mơ','💭'],['con sóc','🐿️'],['bàn','🪑'],['cam','🍊'],['dưa','🍉'],['kéo','✂️'],
    ['lá','🍃'],['mũ','🧢'],['mẹ','👩'],['bé','👶'],['cờ','🚩'],['đỏ','🔴'],['ô tô','🚗'],['ngựa','🐴'],['voi','🐘'],
    ['vịt','🦆'],['táo','🍎'],['chuối','🍌'],['bút','✏️'],['sách','📖'],['trống','🥁'],['nhện','🕷️'],['khỉ','🐒'],
    ['cua','🦀'],['tôm','🦐'],['sao','⭐'],['mưa','🌧️'],['cây','🌳'],['rùa','🐢'],['bạch tuộc','🐙'],
    ['ốc','🐌'],['hạt','🌰'],['bát','🥣'],['phích','🫖'],['gấu','🐻'],['cốc','🥛'],
    ['lạc','🥜'],['bắp','🌽'],['nhạc','🎵'],['mật ong','🍯'],['quạt','🪭'],['thuyền','⛵'],
    ['dê','🐐'],['hổ','🐯'],['lợn','🐷'],['chim','🐦'],['cú','🦉'],['ếch','🐸'],['rắn','🐍'],['ong','🐝'],['kiến','🐜'],
    ['bướm','🦋'],['sứa','🪼'],['mực','🦑'],['nai','🦌'],['heo','🐖'],['sói','🐺'],['cáo','🦊'],['chuột','🐭'],['vẹt','🦜'],
    ['công','🦚'],['ngỗng','🪿'],['bê','🐮'],['cò','🦩'],
    ['bánh','🍰'],['kem','🍦'],['kẹo','🍬'],['nho','🍇'],['dứa','🍍'],['lê','🍐'],['dừa','🥥'],['xôi','🍙'],['cơm','🍚'],
    ['trứng','🥚'],['sữa','🍼'],['chè','🍵'],['nấm','🍄'],['tỏi','🧄'],['ngô','🌽'],['mì','🍝'],['đào','🍑'],['bí','🎃'],
    ['cà','🍆'],['bơ','🥑'],['khoai','🍠'],['rau','🥬'],['lúa','🌾'],
    ['ô','☂️'],['nơ','🎀'],['đèn','💡'],['chổi','🧹'],['kính','👓'],['áo','👕'],['váy','👗'],['giày','👟'],['tất','🧦'],
    ['bóng','⚽'],['diều','🪁'],['thìa','🥄'],['đũa','🥢'],['nồi','🍲'],['chảo','🍳'],['túi','👜'],['nhẫn','💍'],['vở','📒'],
    ['thước','📏'],['cặp','🎒'],['ghim','📌'],['kim','🪡'],['khoá','🔒'],['gương','🪞'],['giường','🛏️'],['cửa','🚪'],
    ['tàu','🚢'],['nến','🕯️'],['quà','🎁'],['pháo','🎆'],['tranh','🖼️'],['đàn','🎸'],['kèn','🎺'],['sáo','🪈'],
    ['chuông','🔔'],['cúp','🏆'],['lều','⛺'],['cầu','🌉'],['đá','🪨'],['ngọc','💎'],['pin','🔋'],['loa','🔊'],
    ['trăng','🌙'],['mây','☁️'],['gió','🌬️'],['núi','⛰️'],['biển','🌊'],['nắng','☀️'],['tuyết','❄️'],['cỏ','🌿'],
    ['tre','🎋'],['sen','🪷'],
    ['mắt','👁️'],['tai','👂'],['mũi','👃'],['tay','✋'],['chân','🦵'],['răng','🦷'],['tim','❤️'],
    ['bố','👨'],['ông','👴'],['chị','👧'],['cô','👩‍🏫'],['vua','🤴'],['hề','🤡'],['ma','👻'],
    ['thư','✉️'],['hũ','🫙'],['tủ','🗄️'],['củ','🥕'],['ớt','🌶️'],['ngọt','🍭'],['sọt','🧺'],['cúc','🌼'],['hạc','🦢'],
    ['bạn','🧑‍🤝‍🧑'],['tám','8️⃣'],['chăn','🛌'],['thịt','🍖'],['mứt','🍬'],['bột','🥣'],
    ['máy bay','✈️'],['gỗ','🪵'],['gậy','🦯'],['búp bê','🪆'],['kẹp','📎'],['quần','👖'],['rồng','🐉'],['xoài','🥭'],
    ['xương','🦴'],['ghẹ','🦀'],['ghe','🛶'],['ghép hình','🧩'],['giỏ','🧺'],['giấy','📄'],['khăn','🧣'],['nghệ','🫚'],
    ['nghêu','🦪'],['nghe nhạc','🎧'],['nghỉ hè','🏖️'],['phấn','🖍️'],['phao','🛟'],['bạc','🪙'],['thác','🏞️'],
    ['tắc kè','🦎'],['mặc áo','👚'],['lúc lắc','🪇'],['mắc áo','🧥'],['giấc ngủ','😴'],['bậc thang','🪜'],['quả gấc','🍅'],
    ['nhấc chân','🦵'],['cóc','🐸'],['tóc','💇'],['gốc cây','🪵'],['lốc xoáy','🌪️'],['chúc mừng','🎉'],['cục tẩy','🧽'],
    ['lục lạc','🔔'],['thức dậy','⏰'],['bức tranh','🖼️'],['rực rỡ','🌈'],['hát','🎤'],['cát','🏖️'],['mặt trời','☀️'],
    ['sắt','🔩'],['cắt tóc','💇'],['đất','🌍'],['lật đật','🪆'],['rót','🫗'],['giọt nước','💧'],['cà rốt','🥕'],['một','1️⃣'],
    ['nốt nhạc','🎵'],['vợt','🏸'],['thớt','🪵'],['mũ phớt','🎩'],['nút','🔘'],['phút','⏱️'],['sút bóng','⚽'],
    ['mứt dừa','🥥'],['vứt rác','🗑️'],['đứt dây','🧵'],['nứt nẻ','🏜️'],['ngan','🦆'],['bàn chải','🪥'],['nam châm','🧲'],
    ['khám bệnh','🩺'],['đám mây','☁️'],['leo trèo','🧗'],
    ['bóng bay','🎈'],['vòng','💍'],['chong chóng','🎐'],['bóng đèn','💡'],['cầu vồng','🌈'],
    ['cái thùng','🪣'],['súng nước','🔫'],['trung thu','🏮'],['cung tên','🏹'],['khủng long','🦖'],
    ['gừng','🫚'],['rừng cây','🌲'],['bánh chưng','🟩'],['sừng','🦏'],
    ['vàng','🥇'],['trang sách','📖'],['càng cua','🦀'],['cái thang','🪜'],['sáng sớm','🌅'],
    ['măng tre','🎋'],['băng giá','🧊'],
    ['nhà tầng','🏢'],['vầng trăng','🌕'],['tâng bóng','⚽'],['dâng hoa','💐'],['vâng lời','🙇'],
    ['ăn cơm','🍚'],['thằn lằn','🦎'],['mặn','🧂'],['cân','⚖️'],['sân trường','🏫'],
    ['tắm','🛁'],['năm','5️⃣'],['con tằm','🐛'],['chăm sóc','🪴'],['gặm cỏ','🐐'],
    ['mầm cây','🌱'],['cầm bút','✍️'],['đầm sen','🪷'],['ấm trà','🫖'],
    ['bút chì','✏️'],['gật đầu','🙆'],
    ['ba','👨'],['ca','☕'],['má','👩'],['bá','🧓'],['mà','🌾'],['mả','🪦'],['bả','👵'],['mã','🐎'],['bã','🥥'],['dữ','🦁'],['mạ','🌱'],['bạ','📒'],['lạ','❓'],
  ]
  for (const [text, emoji] of rawWords) {
    if (!words.some((w) => w.text === text)) {
      words.push({ id: wordId++, text, emoji, image_url: null })
    }
  }

  // Unit words
  const unit_words: { unit_id: number; word_id: number }[] = []
  const linkWord = (kind: Unit['kind'], val: string, wordText: string) => {
    const u = units.find((x) => x.kind === kind && x.value === val)
    const w = words.find((x) => x.text === wordText)
    if (u && w && !unit_words.some((uw) => uw.unit_id === u.id && uw.word_id === w.id)) {
      unit_words.push({ unit_id: u.id, word_id: w.id })
    }
  }

  const explicitLinks: [Unit['kind'], string, string][] = [
    ['am','a','cá'],['am','a','gà'],['am','e','xe'],['am','o','bò'],['am','o','chó'],['am','ơ','phở'],
    ['am','b','bà'],['am','b','bò'],['am','c','cá'],['am','g','gà'],['am','m','mèo'],['am','x','xe'],
    ['am','ch','chó'],['am','gh','ghế'],['am','ngh','nghé'],['am','kh','khế'],['am','nh','nhà'],['am','ph','phở'],
    ['am','qu','quả na'],['am','th','thỏ'],['am','tr','trâu'],
    ['van','oc','hạt thóc'],['van','oc','con sóc'],['van','ôc','cột mốc'],['van','ưc','lọ mực'],['van','ăc','xúc xắc'],
    ['van','ot','gót chân'],['van','ăt','đôi mắt'],['van','ơt','quả ớt'],['van','ât','gật đầu'],['van','âc','giấc mơ'],
    ['van','an','bàn'],['van','am','cam'],['van','eo','mèo'],['van','eo','kéo'],['van','ưa','dưa'],
    ['thanh','sắc','cá'],['thanh','huyền','gà'],['thanh','huyền','bà'],['thanh','hỏi','thỏ'],['thanh','hỏi','phở'],['thanh','ngã','dưa'],
    ['am','a','lá'],['am','u','mũ'],['am','e','mẹ'],['am','e','bé'],['am','ơ','cờ'],['am','đ','đỏ'],['am','ô','ô tô'],
    ['am','v','voi'],['am','v','vịt'],['am','t','táo'],['am','t','tôm'],['am','b','bút'],['am','s','sách'],['am','s','sao'],
    ['am','tr','trống'],['am','nh','nhện'],['am','kh','khỉ'],['am','c','cua'],['am','r','rùa'],['am','ph','phích'],
    ['am','ng','ngựa'],['am','q','quạt'],['am','th','thuyền'],['am','g','gấu'],['am','ch','chuối'],
    ['van','ac','lạc'],['van','ac','nhạc'],['van','ôc','ốc'],['van','ôc','cốc'],
    ['van','at','hạt'],['van','at','bát'],['van','at','quạt'],['van','ât','mật ong'],['van','ut','bút'],
    ['van','ưa','mưa'],['van','ưa','ngựa'],
    ['thanh','sắc','lá'],['thanh','sắc','bé'],['thanh','sắc','táo'],['thanh','huyền','cờ'],['thanh','huyền','rùa'],
    ['thanh','hỏi','đỏ'],['thanh','hỏi','khỉ'],['thanh','ngã','mũ'],['thanh','nặng','mẹ'],['thanh','nặng','vịt'],
    ['thanh','ngang','voi'],['thanh','ngang','cua'],['thanh','ngang','sao'],['thanh','ngang','cây'],
    ['am','ă','rắn'],['am','ă','trăng'],['am','ă','chăn'],['am','ă','răng'],['am','ă','mắt'],
    ['am','â','gấu'],['am','â','cây'],['am','â','mây'],['am','â','chân'],['am','â','nấm'],
    ['am','i','tim'],['am','ư','sữa'],['am','ư','mưa'],['am','ư','dưa'],['am','ư','trứng'],
    ['am','y','váy'],['am','y','tay'],['am','y','mây'],['am','y','giày'],['am','y','máy bay'],
    ['am','g','gỗ'],['am','g','gậy'],
    ['am','p','cặp'],['am','p','bắp'],['am','p','búp bê'],['am','p','kẹp'],
    ['am','q','quà'],['am','q','quả na'],['am','q','quả ớt'],['am','q','quần'],
    ['am','r','rồng'],['am','x','xoài'],['am','x','xương'],['am','x','xúc xắc'],
    ['am','gh','ghẹ'],['am','gh','ghe'],['am','gh','ghép hình'],['am','gi','giỏ'],['am','gi','giấy'],
    ['am','kh','khăn'],['am','ngh','nghệ'],['am','ngh','nghêu'],['am','ngh','nghe nhạc'],['am','ngh','nghỉ hè'],
    ['am','ph','phấn'],['am','ph','phao'],['am','qu','quần'],['am','qu','quả ớt'],
    ['van','ac','bạc'],['van','ac','thác'],
    ['van','ăc','tắc kè'],['van','ăc','mặc áo'],['van','ăc','lúc lắc'],['van','ăc','mắc áo'],
    ['van','âc','giấc ngủ'],['van','âc','bậc thang'],['van','âc','quả gấc'],['van','âc','nhấc chân'],
    ['van','oc','cóc'],['van','oc','tóc'],['van','ôc','gốc cây'],['van','ôc','lốc xoáy'],
    ['van','uc','xúc xắc'],['van','uc','chúc mừng'],['van','uc','cục tẩy'],['van','uc','lục lạc'],
    ['van','ưc','thức dậy'],['van','ưc','bức tranh'],['van','ưc','rực rỡ'],
    ['van','at','hát'],['van','at','cát'],['van','ăt','mặt trời'],['van','ăt','sắt'],['van','ăt','cắt tóc'],
    ['van','ât','đất'],['van','ât','lật đật'],['van','ot','rót'],['van','ot','giọt nước'],
    ['van','ôt','cà rốt'],['van','ôt','một'],['van','ôt','nốt nhạc'],['van','ôt','cột mốc'],
    ['van','ơt','vợt'],['van','ơt','thớt'],['van','ơt','mũ phớt'],
    ['van','ut','nút'],['van','ut','phút'],['van','ut','sút bóng'],['van','ut','bút chì'],
    ['van','ưt','mứt dừa'],['van','ưt','vứt rác'],['van','ưt','đứt dây'],['van','ưt','nứt nẻ'],
    ['van','an','ngan'],['van','an','bàn chải'],['van','am','nam châm'],['van','am','khám bệnh'],['van','am','đám mây'],
    ['van','eo','leo trèo'],
    ['van','ong','ong'],['van','ong','bóng bay'],['van','ong','vòng'],['van','ong','chong chóng'],['van','ong','bóng đèn'],
    ['van','ông','ông'],['van','ông','công'],['van','ông','rồng'],['van','ông','trống'],['van','ông','cầu vồng'],
    ['van','ung','cái thùng'],['van','ung','súng nước'],['van','ung','trung thu'],['van','ung','cung tên'],['van','ung','khủng long'],
    ['van','ưng','trứng'],['van','ưng','gừng'],['van','ưng','rừng cây'],['van','ưng','bánh chưng'],['van','ưng','sừng'],
    ['van','ang','vàng'],['van','ang','trang sách'],['van','ang','càng cua'],['van','ang','cái thang'],['van','ang','sáng sớm'],
    ['van','ăng','trăng'],['van','ăng','răng'],['van','ăng','măng tre'],['van','ăng','băng giá'],['van','ăng','nắng'],
    ['van','âng','nhà tầng'],['van','âng','vầng trăng'],['van','âng','tâng bóng'],['van','âng','dâng hoa'],['van','âng','vâng lời'],
    ['van','ăn','chăn'],['van','ăn','khăn'],['van','ăn','ăn cơm'],['van','ăn','thằn lằn'],['van','ăn','mặn'],
    ['van','ân','chân'],['van','ân','cân'],['van','ân','sân trường'],['van','ân','quần'],['van','ân','phấn'],
    ['van','ăm','tắm'],['van','ăm','năm'],['van','ăm','con tằm'],['van','ăm','chăm sóc'],['van','ăm','gặm cỏ'],
    ['van','âm','nấm'],['van','âm','mầm cây'],['van','âm','cầm bút'],['van','âm','đầm sen'],['van','âm','ấm trà'],
  ]
  for (const [k, v, w] of explicitLinks) linkWord(k, v, w)

  // Auto-link single-syllable words up to 8 words per unit
  const consonantUnits = units.filter((u) => u.kind === 'am' && (u.subtype === 'phu' || u.subtype === 'ghep')).sort((a, b) => b.value.length - a.value.length)
  for (const w of words) {
    if (/\s/.test(w.text)) continue
    const s = vnBase(w.text)
    const tone = vnTone(w.text)
    const iniUnit = consonantUnits.find((u) => s.startsWith(u.value) && s.length > u.value.length)
    const ini = iniUnit?.value ?? ''
    const rest = s.slice(ini.length)
    for (const u of units) {
      const match =
        (u.kind === 'am' && (u.subtype === 'phu' || u.subtype === 'ghep') && (u.value === ini || (u.value === 'q' && ini === 'qu'))) ||
        (u.kind === 'am' && u.subtype === 'chinh' && u.value === rest) ||
        (u.kind === 'van' && u.value === rest) ||
        (u.kind === 'thanh' && u.value === tone)
      if (match) {
        const count = unit_words.filter((uw) => uw.unit_id === u.id).length
        if (count < 8 && !unit_words.some((uw) => uw.unit_id === u.id && uw.word_id === w.id)) {
          unit_words.push({ unit_id: u.id, word_id: w.id })
        }
      }
    }
  }

  // Lessons
  const lessons: Lesson[] = [{ id: 1, number: 50, title: 'Ôn tập và kể chuyện', order_index: 50 }]

  // Exercises
  let exId = 1
  const exercises: Exercise[] = []
  const addEx = (unit_id: number | null, lesson_id: number | null, type: Exercise['type'], title: string, config: Record<string, unknown>, order_index: number) => {
    exercises.push({ id: exId++, unit_id, lesson_id, type, title, config, order_index })
  }

  for (const u of units.filter((x) => x.kind === 'am')) {
    addEx(u.id, null, 'read', `Đọc âm ${u.value}`, {}, 1)
    addEx(u.id, null, 'trace', `Đồ chữ ${u.value}`, { glyph: u.value, mode: 'do' }, 2)
    addEx(u.id, null, 'trace', `Tô nét ${u.value}`, { glyph: u.value, mode: 'to' }, 3)
    if (u.subtype === 'ghep') {
      addEx(u.id, null, 'build', `Ghép âm ${u.value}`, { parts: [...u.value], answer: u.value, distractors: ['a', 'o', 't'] }, 4)
    }
  }

  for (const u of units.filter((x) => x.kind === 'van')) {
    addEx(u.id, null, 'read', `Đọc vần ${u.value}`, {}, 1)
    if (['ac','oc','at','ot','an','am','eo'].includes(u.value)) {
      addEx(u.id, null, 'build', `Ghép vần ${u.value}`, { parts: [...u.value], answer: u.value, distractors: ['n','m','i'] }, 3)
    }
    if (u.value === 'eo') {
      addEx(u.id, null, 'build', 'Ghép tiếng mèo', { parts: ['m','eo','`'], answer: 'mèo', distractors: ['b','ac'] }, 4)
    }
  }

  // True/False for am & van
  for (const u of units.filter((x) => x.kind === 'am' || x.kind === 'van')) {
    const myWords = unit_words.filter((uw) => uw.unit_id === u.id).map((uw) => words.find((w) => w.id === uw.word_id)!).filter(Boolean)
    if (myWords.length >= 2) {
      const otherWord = words.find((w) => !vnBase(w.text).includes(u.value)) ?? { text: 'cá' }
      const label = u.kind === 'van' ? `vần ${u.value}` : `âm ${u.value}`
      addEx(u.id, null, 'true_false', `Đúng hay sai? (${u.value})`, {
        items: [
          { word: myWords[0].text, statement: `Từ "${myWords[0].text}" có ${label}`, answer: true },
          { word: otherWord.text, statement: `Từ "${otherWord.text}" có ${label}`, answer: false },
          { word: myWords[1].text, statement: `Từ "${myWords[1].text}" có ${label}`, answer: true },
        ],
      }, 5)
    }
  }

  // Thanh exercises
  const toneExMap: Record<string, string[]> = {
    ngang: ['ma','ba','ca'], sắc: ['má','bá','cá'], huyền: ['mà','bà','gà'],
    hỏi: ['mả','bả','thỏ'], ngã: ['mã','bã','dữ'], nặng: ['mạ','bạ','lạ'],
  }
  const tonePickMap: Record<string, [string, string, string]> = {
    ngang: ['ba','me','co'], sắc: ['bá','mé','có'], huyền: ['bà','mè','cò'],
    hỏi: ['bả','mẻ','cỏ'], ngã: ['bã','mẽ','cõ'], nặng: ['bạ','mẹ','cọ'],
  }
  const toneBuildMap: Record<string, { parts: string[]; answer: string; d: string[] }> = {
    sắc: { parts: ['c','a','´'], answer: 'cá', d: ['`','?'] },
    huyền: { parts: ['g','a','`'], answer: 'gà', d: ['´','.'] },
    hỏi: { parts: ['th','o','?'], answer: 'thỏ', d: ['~','´'] },
    ngã: { parts: ['m','u','~'], answer: 'mũ', d: ['?','.'] },
    nặng: { parts: ['m','e','.'], answer: 'mẹ', d: ['~','`'] },
  }

  for (const u of units.filter((x) => x.kind === 'thanh')) {
    addEx(u.id, null, 'read', `Đọc ${u.title ?? u.value}`, { examples: toneExMap[u.value] ?? ['ma','ba','ca'] }, 1)
    if (u.value === 'ngang') {
      addEx(u.id, null, 'pick_tone', 'Nghe và chọn dấu thanh', {
        items: [
          { base: 'ma', answer: 'má', options: ['ma','má','mà','mả','mã','mạ'] },
          { base: 'ba', answer: 'bà', options: ['ba','bá','bà','bả','bã','bạ'] },
          { base: 'ca', answer: 'cả', options: ['ca','cá','cà','cả','cã','cạ'] },
          { base: 'me', answer: 'mẹ', options: ['me','mé','mè','mẻ','mẽ','mẹ'] },
          { base: 'vo', answer: 'võ', options: ['vo','vó','vò','vỏ','võ','vọ'] },
        ],
      }, 2)
    }
    if (toneBuildMap[u.value]) {
      const tb = toneBuildMap[u.value]
      addEx(u.id, null, 'build', `Ghép thanh: ${tb.answer}`, { parts: tb.parts, answer: tb.answer, distractors: tb.d }, 3)
    }
    const tp = tonePickMap[u.value]
    if (tp) {
      addEx(u.id, null, 'pick_tone', `Nghe và chọn tiếng (${u.value})`, {
        items: [
          { base: 'ba', answer: tp[0], options: ['ba','bá','bà','bả','bã','bạ'] },
          { base: 'me', answer: tp[1], options: ['me','mé','mè','mẻ','mẽ','mẹ'] },
          { base: 'co', answer: tp[2], options: ['co','có','cò','cỏ','cõ','cọ'] },
        ],
      }, 4)
    }
  }

  // Lesson 50 exercises
  addEx(null, 1, 'rhyme_grid', 'Ghép vần vào bảng', {
    rows: ['a','ă','â','o','ô','ơ','u','ư'],
    cols: ['c','t'],
    given: [['a','c']],
    blocked: [['ơ','c']],
  }, 1)
  addEx(null, 1, 'star_words', 'Đọc từ trên ngôi sao', {
    words: ['bật lửa','lọ mực','cột mốc','hạt thóc','xúc xắc','gót chân','đôi mắt','lác đác','giấc mơ','quả ớt'],
    highlight: ['ac','ăc','âc','oc','ôc','uc','ưc','at','ăt','ât','ot','ôt','ơt','ut','ưt'],
  }, 2)
  addEx(null, 1, 'passage', 'Đọc đoạn văn', {
    text: 'Gà mẹ dẫn đàn con đi ăn. Chốc chốc, tìm thấy mồi, gà mẹ "tục... tục..." gọi con. Đàn gà con chạy lại, chen chúc nhau ăn rồi rúc vào bên mẹ. Gà mẹ ủ ấm cho các con.',
    highlight: ['ac','ăc','âc','oc','ôc','uc','ưc','at','ăt','ât','ot','ôt','ơt','ut','ưt'],
  }, 3)

  const profiles: Profile[] = [
    { id: 'teacher-1', username: 'cogiao', display_name: 'Cô Giáo Lan', role: 'teacher' },
    { id: 'student-1', username: 'be_an', display_name: 'Bé An', role: 'student' },
    { id: 'student-2', username: 'be_binh', display_name: 'Bé Bình', role: 'student' },
    { id: 'student-3', username: 'be_chi', display_name: 'Bé Chi', role: 'student' },
  ]

  const now = new Date().toISOString()
  const attempts: Attempt[] = [
    { id: 1, user_id: 'student-1', exercise_id: 1, score: 100, stars: 3, created_at: now },
    { id: 2, user_id: 'student-1', exercise_id: 2, score: 95, stars: 3, created_at: now },
    { id: 3, user_id: 'student-1', exercise_id: 3, score: 90, stars: 3, created_at: now },
    { id: 4, user_id: 'student-2', exercise_id: 1, score: 90, stars: 3, created_at: now },
    { id: 5, user_id: 'student-2', exercise_id: 2, score: 80, stars: 2, created_at: now },
    { id: 6, user_id: 'student-3', exercise_id: 1, score: 85, stars: 2, created_at: now },
  ]

  return { profiles, units, words, unit_words, lessons, exercises, attempts }
}
