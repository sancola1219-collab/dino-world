// data.js — 恐龍物種資料庫(真實古生物數據 + 繁體中文教學文案)、生態導覽順序、時間檔位。
// 資料來源:主流古生物學共識(體長/體重為成體估計中位數;年代單位為百萬年前 Mya)。
// UI 只反映這裡的資料,不持有任何知識內容。

// 每種恐龍:
//   id, name(中文), sci(學名), diet 'herb'|'carn'|'omni', build 用來決定 3D 造型family
//   lengthM/heightM/massKg 尺寸;periodMa 生存年代;region 化石地;
//   facts[] 教學重點;compare 與人類/常見物的比較;funfact 趣聞。
//   color/spawn 決定外觀與谷地內的擺放。
export const SPECIES = [
  {
    id: 'trex', name: '暴龍', sci: 'Tyrannosaurus rex', diet: 'carn', build: 'theropod',
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
    id: 'trike', name: '三角龍', sci: 'Triceratops horridus', diet: 'herb', build: 'ceratopsian',
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
    id: 'brachio', name: '腕龍', sci: 'Brachiosaurus altithorax', diet: 'herb', build: 'sauropod',
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
    id: 'velo', name: '伶盜龍', sci: 'Velociraptor mongoliensis', diet: 'carn', build: 'raptor',
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
    id: 'stego', name: '劍龍', sci: 'Stegosaurus stenops', diet: 'herb', build: 'stegosaur',
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
    id: 'para', name: '副櫛龍', sci: 'Parasaurolophus walkeri', diet: 'herb', build: 'hadrosaur',
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
    id: 'anky', name: '甲龍', sci: 'Ankylosaurus magniventris', diet: 'herb', build: 'ankylosaur',
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
    id: 'ptero', name: '風神翼龍', sci: 'Quetzalcoatlus northropi', diet: 'carn', build: 'pterosaur',
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

// 生態導覽:一站一站走訪谷地(id 對應上面的物種,text 是導覽解說)。
export const TOUR = [
  { id: 'brachio', title: '樹冠層的巨人', text: '我們從谷地的大個子開始。腕龍把頭舉到十二公尺高,專吃其他恐龍搆不到的樹頂嫩葉——身高本身就是牠的生存策略。' },
  { id: 'trex', title: '谷地的統治者', text: '轉向暴龍。牠是白堊紀末的頂級掠食者,咬合力冠絕所有陸生動物。注意牠短小的前肢——真正的武器是那顆布滿利齒的頭。' },
  { id: 'trike', title: '正面對決的植食者', text: '三角龍與暴龍生活在同一片土地。三支角與巨大頸盾既能嚇阻掠食者,也用於同類間的較量。牠是少數敢與暴龍正面周旋的獵物。' },
  { id: 'anky', title: '行走的堡壘', text: '甲龍選擇了另一條防禦路線:全身骨甲加上尾端的骨錘。重心極低、難以翻覆,連暴龍都得付出代價才能得手。' },
  { id: 'stego', title: '骨板與尾刺', text: '時間更早的劍龍。背上的骨板可能用於散熱與展示,尾端四支尖刺才是防身利器。牠的腦只有核桃大小,卻存活了數百萬年。' },
  { id: 'para', title: '會吹號角的鴨嘴龍', text: '副櫛龍頭上的中空冠管與鼻腔相連,能發出低沉的號聲,在群體間傳遞訊息。這是恐龍世界裡難得的「樂器」。' },
  { id: 'velo', title: '披羽的敏捷獵手', text: '別被電影騙了:真正的伶盜龍只有火雞大小,而且滿身羽毛。牠靠速度、智慧與後腳的鐮刀爪狩獵,可能還會群體合作。' },
  { id: 'ptero', title: '天空的霸主', text: '最後抬頭看天。風神翼龍翼展超過十公尺,是史上最大的飛行動物。牠不是恐龍,而是與恐龍共享天地的翼龍——旅程到此結束。' },
];

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
