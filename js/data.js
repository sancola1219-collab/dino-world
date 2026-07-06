// data.js — 恐龍物種資料庫 + 中生代三個地質年代(三疊紀/侏羅紀/白堊紀)。
// 要改教學內容/加恐龍:改這裡即可。加恐龍記得標 period,並確認 dino.js 有對應 build 造型。
// 每種恐龍標了 period,選年代時只顯示該年代的物種,並附該年代的「恐龍發展史」。
// 資料來源:主流古生物學共識(體長/體重為成體估計中位數;年代單位為百萬年前 Mya)。
// UI 只反映這裡的資料,不持有任何知識內容。

// ---- 三個地質年代(依時間順序:三疊紀 → 侏羅紀 → 白堊紀) ----
export const PERIODS = [
  {
    id: 'triassic', name: '三疊紀', en: 'TRIASSIC', years: '2.52–2.01 億年前',
    tagline: '恐龍的黎明',
    history: '在二疊紀末那場地球史上最大規模的滅絕之後,爬行類重新崛起。三疊紀晚期,第一批真正的恐龍在盤古大陸乾熱的平原上登場——牠們體型還小、數量也不多,和許多其他爬行類共享世界。三疊紀末的另一次滅絕清空了競爭者,為恐龍接下來的稱霸鋪好了路。',
    // 環境氛圍:乾熱紅褐、植被稀疏。
    mood: { fog: 0xd8b68a, ground: 0xcaa877, foliage: 0xc9bd7c, hemiGround: 0x6a5636, sky: 0xffddb0, sun: 0xffe3b8, treeRatio: 0.3 },
  },
  {
    id: 'jurassic', name: '侏羅紀', en: 'JURASSIC', years: '2.01–1.45 億年前',
    tagline: '巨龍的時代',
    history: '盤古大陸開始裂解,氣候變得溫暖濕潤,蕨類與針葉林蔓延成茂密森林。植食恐龍演化出前所未見的龐大體型——腕龍、梁龍把脖子伸向樹冠,劍龍披上骨板,而異特龍站上食物鏈頂端。這是恐龍體型登峰造極的黃金時代。',
    mood: { fog: 0xb7ccae, ground: 0x969a76, foliage: 0xcfe0a2, hemiGround: 0x33421f, sky: 0xdcefd2, sun: 0xfff3d8, treeRatio: 1.0 },
  },
  {
    id: 'cretaceous', name: '白堊紀', en: 'CRETACEOUS', years: '1.45–0.66 億年前',
    tagline: '開花與終結',
    history: '開花植物首次出現並迅速擴散,昆蟲與恐龍的生態隨之改變。角龍、鴨嘴龍、甲龍演化出各式頭飾與裝甲,暴龍站上掠食者的頂點,天空由巨大的翼龍統治。直到六千六百萬年前一顆小行星撞擊地球,非鳥恐龍的時代戛然而止——但牠們的後代,鳥類,一直飛到了今天。',
    mood: { fog: 0xbcd3e6, ground: 0xffffff, foliage: 0xffffff, hemiGround: 0x2a2416, sky: 0xffffff, sun: 0xfff2d8, treeRatio: 0.8 },
  },
];
export const PERIOD_BY_ID = Object.fromEntries(PERIODS.map((p) => [p.id, p]));

export const SPECIES = [
  /* ================= 三疊紀 ================= */
  {
    id: 'eoraptor', name: '始盜龍', sci: 'Eoraptor lunensis', period: 'triassic', diet: 'omni', build: 'earlytheropod',
    lengthM: 1.0, heightM: 0.4, massKg: 10, periodMa: [231, 228], region: '阿根廷(月亮谷)',
    color: 0x8a6b4a, accent: 0x5a4632, spawn: { x: 10, z: 8, scale: 1.0, rot: 1.2 },
    tagline: '恐龍時代破曉時的小獵者',
    facts: [
      '全長僅約 1 公尺、體重約 10 公斤,是已知最古老的恐龍之一(約 2.31 億年前)。',
      '口中同時有肉食性的尖牙與植食性的葉狀齒,推測是雜食者。',
      '靈活的雙足奔跑、前肢能抓握——恐龍最初的身體藍圖就在牠身上成形。',
      '出土於阿根廷「月亮谷」,和最早的一批恐龍生活在同一片乾旱平原。',
    ],
    compare: '和一隻中型犬差不多大,卻是暴龍與腕龍共同的遠古親戚。',
    funfact: '「始盜龍」意為「破曉的盜賊」,象徵恐龍時代的破曉。',
  },
  {
    id: 'coelo', name: '腔骨龍', sci: 'Coelophysis bauri', period: 'triassic', diet: 'carn', build: 'earlytheropod',
    lengthM: 3.0, heightM: 0.9, massKg: 20, periodMa: [215, 201], region: '北美洲(幽靈牧場)',
    color: 0x9a8558, accent: 0x4a4030, spawn: { x: -12, z: -6, scale: 1.0, rot: -0.7 },
    tagline: '輕盈成群的敏捷掠食者',
    facts: [
      '身形纖細、骨骼中空,讓牠又輕又快,體重僅約 20 公斤。',
      '在美國「幽靈牧場」發現數百具集體埋藏的化石,顯示牠們可能成群活動。',
      '長尾巴在奔跑時幫助平衡,是三疊紀敏捷的小型獵手。',
      '存活到三疊紀末,見證了恐龍如何在大滅絕後接手世界。',
    ],
    compare: '身長 3 公尺卻很輕,像一隻被拉長的大鳥。',
    funfact: '曾有標本被誤以為會同類相食,後來發現腹中小骨其實是別種爬行動物。',
  },
  {
    id: 'plateo', name: '板龍', sci: 'Plateosaurus', period: 'triassic', diet: 'herb', build: 'prosauropod',
    lengthM: 8.0, heightM: 3.5, massKg: 1500, periodMa: [214, 204], region: '歐洲',
    color: 0x7d7052, accent: 0xa8925f, spawn: { x: -6, z: 26, scale: 1.0, rot: 0.5 },
    tagline: '預告巨龍到來的植食先驅',
    facts: [
      '三疊紀最大型的植食恐龍之一,身長可達 8 公尺,預告了日後蜥腳類巨龍的到來。',
      '平時四足行走,取食高處時能以後肢站起、用長頸搆到樹葉。',
      '拇指上有大爪,可能用來鉤取植物或防禦。',
      '在歐洲大量出土,是最早被科學命名的恐龍之一。',
    ],
    compare: '站起來比長頸鹿的肩膀還高,是當時的植食巨人。',
    funfact: '板龍是通往侏羅紀巨龍的「橋樑」,腕龍與梁龍都屬於牠這一支的後代。',
  },

  /* ================= 侏羅紀 ================= */
  {
    id: 'brachio', name: '腕龍', sci: 'Brachiosaurus altithorax', period: 'jurassic', diet: 'herb', build: 'sauropod',
    lengthM: 22, heightM: 12, massKg: 35000, periodMa: [154, 150], region: '北美洲(莫里遜組)',
    color: 0x8a8474, accent: 0x615a4a, spawn: { x: -40, z: 10, scale: 1.0, rot: 0.4 },
    tagline: '把頭高高舉向樹冠的長頸巨龍',
    facts: [
      '與多數蜥腳類不同,腕龍前肢比後肢長,身體向前上方傾斜,頭可達 12 公尺高。',
      '光是脖子就靠十幾節加長的頸椎撐起,骨頭內部大量中空以減輕重量。',
      '每天可能需要進食數百公斤植物,直接取食其他恐龍搆不到的高處樹葉。',
      '鼻孔位置偏高,曾被誤以為住在水中,現已確認是完全陸生。',
    ],
    compare: '抬頭的高度約等於四層樓,體重相當於六到七頭非洲象。',
    funfact: '巨大的身軀讓成年腕龍幾乎沒有天敵——體型本身就是最好的防禦。',
  },
  {
    id: 'diplo', name: '梁龍', sci: 'Diplodocus', period: 'jurassic', diet: 'herb', build: 'diplodocid',
    lengthM: 27, heightM: 5, massKg: 15000, periodMa: [154, 152], region: '北美洲(莫里遜組)',
    color: 0x83795f, accent: 0x554b39, spawn: { x: 22, z: 28, scale: 1.0, rot: -0.5 },
    tagline: '從頭到尾最長的鞭尾巨龍',
    facts: [
      '身長可達 27 公尺,是最長的恐龍之一——大部分長度來自超長的脖子與鞭狀尾。',
      '脖子多半水平前伸,像割草機一樣橫掃低矮植物,而非高舉。',
      '牙齒像梳子集中在嘴前端,專門把葉子從枝條上「梳」下來。',
      '與腕龍、劍龍、異特龍共享同一片莫里遜地層。',
    ],
    compare: '從頭到尾比兩台公車首尾相接還長,身形卻出奇纖細。',
    funfact: '梁龍鞭狀尾末端甩動時,理論上速度可能突破音速,發出鞭炮般的爆響。',
  },
  {
    id: 'stego', name: '劍龍', sci: 'Stegosaurus stenops', period: 'jurassic', diet: 'herb', build: 'stegosaur',
    lengthM: 9, heightM: 4, massKg: 5000, periodMa: [155, 150], region: '北美洲(莫里遜組)',
    color: 0x6f7d5a, accent: 0x9c4f3b, spawn: { x: -14, z: -30, scale: 1.0, rot: -1.4 },
    tagline: '背上兩排骨板的裝甲植食者',
    facts: [
      '背上兩排大型骨板最大超過 60 公分,內有豐富血管,可能用於調節體溫與展示。',
      '尾端四支尖刺(古生物學家戲稱 thagomizer)是主要防禦武器,可重擊掠食者。',
      '頭部相對身體極小,腦只有核桃大小;曾被誤傳臀部有「第二個腦」。',
      '牙齒細小、位置靠前,取食低矮的蕨類與蘇鐵等植物。',
    ],
    compare: '身體像一輛小巴士那麼長,但腦袋比一隻手掌還小。',
    funfact: '骨板左右交錯排列而非成對,這個排列方式的用途至今仍有爭論。',
  },
  {
    id: 'allo', name: '異特龍', sci: 'Allosaurus fragilis', period: 'jurassic', diet: 'carn', build: 'theropod',
    lengthM: 9.5, heightM: 3.4, massKg: 2000, periodMa: [155, 145], region: '北美洲(莫里遜組)',
    color: 0x77604a, accent: 0x8a4a34, spawn: { x: 30, z: -14, scale: 0.85, rot: 2.2 },
    tagline: '暴龍出現之前的侏羅紀霸主',
    facts: [
      '侏羅紀北美的頂級掠食者,身長約 9 公尺,是暴龍出現前的陸上霸主。',
      '眼睛上方有一對短角脊,可能用於物種內的展示。',
      '上顎能像蛇一樣大幅張開,用帶鋸齒的牙一口口撕下獵物的肉。',
      '與劍龍、腕龍同層出土,可能獵食年幼或落單的蜥腳類。',
    ],
    compare: '比一輛廂型車還長,是劍龍尾刺最主要的對手。',
    funfact: '有異特龍化石帶著被劍龍尾刺刺穿的傷口,見證了兩者的生死搏鬥。',
  },

  /* ================= 白堊紀 ================= */
  {
    id: 'trex', name: '暴龍', sci: 'Tyrannosaurus rex', period: 'cretaceous', diet: 'carn', build: 'theropod',
    lengthM: 12.3, heightM: 4.0, massKg: 8000, periodMa: [68, 66], region: '北美洲(海爾河組)',
    color: 0x6b5a44, accent: 0x8f3b2e, spawn: { x: 34, z: -18, scale: 1.0, rot: 2.3 },
    tagline: '白堊紀末的頂級掠食者',
    facts: [
      '體長約 12 公尺、體重可達 8 噸,是有史以來最大的陸生肉食動物之一。',
      '咬合力估計超過 3.5 萬牛頓,是所有陸生動物已知最強,足以咬碎骨頭。',
      '前肢極短但肌肉發達;真正的武器是頭骨與牙齒,單顆牙可長達 20 公分。',
      '嗅球巨大,嗅覺極佳;可能兼具主動獵殺與食腐兩種取食策略。',
    ],
    compare: '站起來比兩層樓還高,一口的體積約等於一整個成年人。',
    funfact: '暴龍與人類的時間距離(6600 萬年),比暴龍與劍龍的距離(約 8000 萬年)還要近。',
  },
  {
    id: 'trike', name: '三角龍', sci: 'Triceratops horridus', period: 'cretaceous', diet: 'herb', build: 'ceratopsian',
    lengthM: 8.0, heightM: 3.0, massKg: 9000, periodMa: [68, 66], region: '北美洲',
    color: 0x7d7360, accent: 0xa8905f, spawn: { x: 12, z: 22, scale: 1.0, rot: -0.6 },
    tagline: '頭盾與三支角的植食巨獸',
    facts: [
      '頭骨連同頸盾長達 2.5 公尺,是陸生動物中最大的頭骨之一。',
      '眉角可長達 1 公尺,推測用於物種內爭鬥與嚇阻掠食者。',
      '喙狀嘴與數百顆不斷替換的牙齒排成「齒系」,專門切碎堅韌植物。',
      '與暴龍生活在同一時代同一地區,是暴龍的主要獵物之一。',
    ],
    compare: '體重和一頭非洲象相當,但頭部尺寸遠遠更大。',
    funfact: '頸盾上的血管痕跡顯示它可能會「臉紅」變色,用來求偶或示威。',
  },
  {
    id: 'velo', name: '伶盜龍', sci: 'Velociraptor mongoliensis', period: 'cretaceous', diet: 'carn', build: 'raptor',
    lengthM: 2.0, heightM: 0.5, massKg: 15, periodMa: [75, 71], region: '蒙古(戈壁沙漠)',
    color: 0x9a7b4f, accent: 0x3d3a44, spawn: { x: 20, z: -4, scale: 1.0, rot: 1.1 },
    tagline: '披著羽毛的敏捷獵手',
    facts: [
      '真實體型只有火雞大小,約 2 公尺長、15 公斤——遠比電影裡小得多。',
      '化石上有明確的羽莖附著點(羽瘤),證實全身覆蓋羽毛。',
      '後腳第二趾有一支可收起的大型鐮刀爪,用來壓制與撕開獵物。',
      '著名的「搏鬥化石」保存了一隻伶盜龍與原角龍纏鬥而死的瞬間。',
    ],
    compare: '和一隻大型犬差不多重,站立時大約到成年人的膝蓋。',
    funfact: '腦容量與體型比例偏高,是相當聰明的恐龍之一,可能群體協作狩獵。',
  },
  {
    id: 'para', name: '副櫛龍', sci: 'Parasaurolophus walkeri', period: 'cretaceous', diet: 'herb', build: 'hadrosaur',
    lengthM: 9.5, heightM: 4.5, massKg: 2500, periodMa: [76, 73], region: '北美洲',
    color: 0x7a6a86, accent: 0xc9a35c, spawn: { x: -6, z: 34, scale: 1.0, rot: 0.9 },
    tagline: '頭上長著共鳴管的鴨嘴龍',
    facts: [
      '頭頂向後延伸出長達 1 公尺的中空冠管,與鼻腔相連。',
      '電腦模擬顯示冠管能發出低沉的號角聲,推測用於群體溝通與求偶。',
      '可以四足行走也能以後肢奔跑,屬於行動靈活的鴨嘴龍類。',
      '嘴部有數百顆牙齒組成的研磨齒板,能處理堅硬的植物。',
    ],
    compare: '冠管拉直後和一個成年人一樣高,是天生的樂器。',
    funfact: '不同年齡的副櫛龍冠管長度不同,牠們的「音色」可能會隨成長改變。',
  },
  {
    id: 'anky', name: '甲龍', sci: 'Ankylosaurus magniventris', period: 'cretaceous', diet: 'herb', build: 'ankylosaur',
    lengthM: 7, heightM: 1.7, massKg: 6000, periodMa: [68, 66], region: '北美洲',
    color: 0x6a6152, accent: 0x4a4238, spawn: { x: 40, z: 24, scale: 1.0, rot: -2.0 },
    tagline: '全身包覆骨甲的活體坦克',
    facts: [
      '從頭到背覆滿骨質甲板(皮內成骨),連眼皮都有骨板保護。',
      '尾端有一團融合的骨質尾錘,揮動時足以打斷掠食者的骨頭。',
      '身體寬而低伏、重心極低,難以被翻倒——柔軟的腹部是唯一弱點。',
      '與暴龍同時代,重裝防禦正是為了對抗這類頂級掠食者而演化。',
    ],
    compare: '像一輛加了裝甲的小貨車,尾錘大小近似一顆保齡球。',
    funfact: '尾錘揮擊的力道估計足以擊碎暴龍的腳骨,是少數敢正面對抗暴龍的植食者。',
  },
  {
    id: 'ptero', name: '風神翼龍', sci: 'Quetzalcoatlus northropi', period: 'cretaceous', diet: 'carn', build: 'pterosaur',
    lengthM: 11, heightM: 5, massKg: 250, periodMa: [68, 66], region: '北美洲',
    color: 0xb9a184, accent: 0x8f3b2e, spawn: { x: 0, z: 0, scale: 1.0, rot: 0, fly: true },
    tagline: '翼展如小飛機的天空霸主',
    facts: [
      '翼展可達 10–11 公尺,是已知最大的飛行動物,和一架輕型飛機相當。',
      '嚴格說不是恐龍,而是與恐龍同時代的翼龍;骨骼中空到極致以利飛行。',
      '站立在地面時高度接近長頸鹿,可能像鸛一樣在陸地上大步覓食。',
      '起飛時用四肢(含前肢)一起彈跳撐起,再展開巨翼滑翔。',
    ],
    compare: '翼展比一輛公車還長,體重卻只有一位成年人的三、四倍。',
    funfact: '雖然體型巨大,牠的骨架極輕,活著時可能只有 200 多公斤。',
  },
];

// 依 id 快速取用。
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

// 某年代的物種清單(依 SPECIES 原順序)。
export function speciesOfPeriod(periodId) {
  return SPECIES.filter((s) => s.period === periodId);
}

// 依年代動態產生生態導覽(每站 = 該年代一種恐龍,解說取自其標語與首要重點)。
export function tourOf(periodId) {
  return speciesOfPeriod(periodId).map((sp) => ({
    id: sp.id, title: sp.name,
    text: `${sp.tagline}。${sp.facts[0]}`,
  }));
}

// ---- 紀元史詩:從三疊紀恐龍黎明,一路演到白堊紀末隕石撞擊、大滅絕、鳥類存續 ----
// 每個 stage 的 at = 進入該階段的秒數(累進);main.js 依此驅動年代切換、隕石、撞擊、餘燼。
export const EPIC = {
  totalSec: 94,
  stages: [
    { at: 0,  period: 'triassic',   title: '三疊紀 · 恐龍的黎明', caption: '兩億多年前,第一批恐龍在乾熱的盤古大陸上悄悄登場,體型還小,和眾多爬行類共享世界。' },
    { at: 20, period: 'jurassic',   title: '侏羅紀 · 巨龍的時代', caption: '大陸裂解、氣候轉暖,森林蔓延。植食恐龍長成前所未見的龐然大物,異特龍稱霸大地。' },
    { at: 42, period: 'cretaceous', title: '白堊紀 · 繁盛的頂點', caption: '開花植物遍地綻放,角龍與鴨嘴龍成群,暴龍站上食物鏈頂端,巨大的翼龍統治天空。' },
    { at: 63, meteor: true,         title: '天外之光',           caption: '一道白光劃過天際,越來越亮、越來越大——一顆直徑十公里的小行星,正衝向地球。' },
    { at: 74, impact: true,         title: '撞擊',               caption: '' },
    { at: 78, aftermath: true,      title: '大滅絕',             caption: '塵埃遮蔽陽光,氣溫驟降,森林枯萎。六千六百萬年前,非鳥恐龍的時代戛然而止。' },
    { at: 88, coda: true,           title: '而生命,延續著',      caption: '但牠們並未完全消失——恐龍的後代,鳥類,一直飛到了今天。' },
  ],
};

// 時間滑桿的語意:回傳該時刻的相位名稱。
export function phaseOf(hour) {
  if (hour < 5) return '深夜';
  if (hour < 7) return '黎明';
  if (hour < 11) return '早晨';
  if (hour < 15) return '正午';
  if (hour < 18) return '午後';
  if (hour < 20) return '黃昏';
  return '入夜';
}
