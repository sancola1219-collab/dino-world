// data.js — 恐龍物種資料庫 + 中生代三個地質年代(三疊紀/侏羅紀/白堊紀)。
// 要改教學內容/加恐龍:改這裡即可。加恐龍記得標 period,並確認 dino.js 有對應 build 造型。
// 每種恐龍標了 period,選年代時只顯示該年代的物種,並附該年代的「恐龍發展史」。
// 資料來源:主流古生物學共識(體長/體重為成體估計中位數;年代單位為百萬年前 Mya)。
// UI 只反映這裡的資料,不持有任何知識內容。

// ---- 八個地質時代(完整生命史,依時間順序:寒武 → 石炭 → 二疊 → 三疊 → 侏羅 → 白堊 → 古近 → 冰河) ----
// mood 為環境氛圍(乘算到天色;marine=水下、snow=雪地會另做處理)。
export const PERIODS = [
  {
    id: 'cambrian', name: '寒武紀', en: 'CAMBRIAN', years: '5.39–4.85 億年前',
    tagline: '生命大爆發 · 海洋',
    history: '在一片淺海之中,生命在短短數百萬年間爆發出前所未見的多樣體型——第一批有眼睛、有硬殼、能游泳掠食的動物出現了。三葉蟲爬滿海床,奇蝦以巨大的抓握附肢統治海洋。這是動物界所有主要「門」幾乎同時登場的時刻。',
    mood: { fog: 0x2f6b72, ground: 0x7a8a80, foliage: 0x5a7a6a, hemiGround: 0x1a3a3a, sky: 0x5aa6b4, sun: 0xa8dce0, treeRatio: 0, marine: true },
  },
  {
    id: 'carboniferous', name: '石炭紀', en: 'CARBONIFEROUS', years: '3.59–2.99 億年前',
    tagline: '巨蟲與煤炭森林',
    history: '大氣含氧量攀上歷史高峰,昆蟲因此長成巨大的尺寸——翼展如鷹的巨脈蜻蜓、兩公尺長的節胸蜈蚣。廣袤的蕨類與石松沼澤森林覆蓋大地,牠們死後堆積成今日的煤炭。第一批四足類也爬上了陸地。',
    mood: { fog: 0x8aa06a, ground: 0x5a6a44, foliage: 0xa8c85e, hemiGround: 0x24361a, sky: 0xbcd49a, sun: 0xf4f4c8, treeRatio: 1.4 },
  },
  {
    id: 'permian', name: '二疊紀', en: 'PERMIAN', years: '2.99–2.52 億年前',
    tagline: '似哺乳爬行類的時代',
    history: '盤古大陸合而為一,內陸乾旱炎熱。背上長著大帆的異齒龍稱霸,似哺乳的獸孔類演化出愈來愈像哺乳動物的特徵——牠們正是我們的遠祖。然而二疊紀末爆發了地球史上最慘烈的大滅絕,九成以上的物種消失,史稱「大死亡」。',
    mood: { fog: 0xd8a870, ground: 0xc09060, foliage: 0xb0a060, hemiGround: 0x5a4028, sky: 0xf0c088, sun: 0xffdda0, treeRatio: 0.25 },
  },
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
  {
    id: 'paleogene', name: '古近紀', en: 'PALEOGENE', years: '6600–2300 萬年前',
    tagline: '哺乳類的崛起',
    history: '恐龍滅絕後空出的舞台,由原本弱小的哺乳類迅速填補。牠們在短短數百萬年間輻射演化出各種體型:狗一般大的始祖馬、史上最大的陸生哺乳動物巨犀,以及能吞下鱷魚的泰坦巨蟒。草原開始鋪展,一個屬於獸類與鳥類的新世界誕生了。',
    mood: { fog: 0xbcd0c0, ground: 0x8a9a60, foliage: 0xbad884, hemiGround: 0x38401f, sky: 0xd6ecd8, sun: 0xfff2d8, treeRatio: 0.9 },
  },
  {
    id: 'iceage', name: '冰河時期', en: 'ICE AGE', years: '258–1.2 萬年前',
    tagline: '長毛巨獸與人類',
    history: '地球進入反覆的冰期,大片冰原向南推進。披著厚毛的長毛象、披毛犀在雪原上成群漫步,劍齒虎潛伏獵殺,巨大的地懶啃食樹葉。與牠們共享這片酷寒世界的,還有一種會用火、會狩獵的動物——人類。冰期結束時,多數巨獸走向了滅絕。',
    mood: { fog: 0xc8d4e0, ground: 0xe8eef2, foliage: 0xd2e0e0, hemiGround: 0x6a7480, sky: 0xdae6f0, sun: 0xfff2e6, treeRatio: 0.3, snow: true },
  },
];
export const PERIOD_BY_ID = Object.fromEntries(PERIODS.map((p) => [p.id, p]));

export const SPECIES = [
  /* ================= 寒武紀(海洋) ================= */
  {
    id: 'trilobite', name: '三葉蟲', sci: 'Trilobita', period: 'cambrian', diet: 'herb', build: 'trilobite', herd: 9,
    lengthM: 0.1, heightM: 0.04, massKg: 0.1, periodMa: [521, 250], region: '全球海洋', swim: false,
    color: 0x6a5540, accent: 0x3a2c1e, spawn: { x: 8, z: 10, scale: 1.0, rot: 1.0 },
    tagline: '爬滿古海床的裝甲節肢動物',
    facts: [
      '身體分成左右與中央三片縱葉,「三葉蟲」因此得名,是最具代表性的古生代化石。',
      '擁有已知最早的複眼,由方解石晶體組成,能在海底看清方向。',
      '在地球存活了近三億年,歷經數次滅絕,最終在二疊紀末徹底消失。',
    ],
    compare: '多數只有硬幣到手掌大小,卻是海洋最早的成功者之一。',
    funfact: '受驚時能像鼠婦一樣把身體捲成一團,用硬殼保護柔軟的腹部。',
  },
  {
    id: 'anomalo', name: '奇蝦', sci: 'Anomalocaris', period: 'cambrian', diet: 'carn', build: 'anomalocaris', herd: 2,
    lengthM: 1.0, heightM: 0.3, massKg: 5, periodMa: [518, 500], region: '全球海洋', swim: true,
    color: 0xa8664a, accent: 0x6a2f24, spawn: { x: -6, z: -4, scale: 1.0, rot: 0.4, fly: true },
    tagline: '寒武紀海洋的頂級掠食者',
    facts: [
      '體長可達一公尺,在當時是不折不扣的巨獸,統治著寒武紀的海洋。',
      '頭部前端有一對帶刺的抓握附肢,用來捕捉獵物、送進圓盤狀的口器。',
      '身體兩側成排的肉鰭波動推進,讓牠能靈活游泳追捕三葉蟲。',
    ],
    compare: '和一隻家貓差不多長,是當時海裡最可怕的獵手。',
    funfact: '牠的化石一度被拆成三種不同動物,直到後來才拼回同一隻。',
  },
  {
    id: 'opabinia', name: '歐巴賓海蠍', sci: 'Opabinia', period: 'cambrian', diet: 'carn', build: 'opabinia', herd: 3,
    lengthM: 0.07, heightM: 0.03, massKg: 0.05, periodMa: [505, 500], region: '加拿大(伯吉斯頁岩)', swim: true,
    color: 0xc08a5a, accent: 0x7a4a30, spawn: { x: 14, z: -10, scale: 1.0, rot: -0.6, fly: true },
    tagline: '五隻眼睛與象鼻的奇異動物',
    facts: [
      '頭上長著五隻眼睛,前端伸出一根柔軟的長吻,末端有抓握用的爪。',
      '用長吻把海底的食物送進位於身體下方的嘴巴。',
      '外形古怪到當年學術報告發表時,全場聽眾哄堂大笑。',
    ],
    compare: '只有拇指大小,卻是演化實驗最奇特的產物之一。',
    funfact: '牠是寒武紀「奇形怪狀動物」的代表,提醒我們演化曾嘗試過多少種可能。',
  },

  /* ================= 石炭紀(巨蟲) ================= */
  {
    id: 'meganeura', name: '巨脈蜻蜓', sci: 'Meganeura', period: 'carboniferous', diet: 'carn', build: 'dragonfly', herd: 5,
    lengthM: 0.7, heightM: 0.1, massKg: 0.15, periodMa: [305, 299], region: '歐洲、北美', swim: false,
    color: 0x3a6a4a, accent: 0x8fd0c0, spawn: { x: 0, z: 0, scale: 1.0, rot: 0, fly: true },
    tagline: '翼展如鷹的史前巨蜻蜓',
    facts: [
      '翼展可達 70 公分,是有史以來最大的飛行昆蟲之一。',
      '能長這麼大,是因為石炭紀空氣含氧量高達 35%,遠超今日的 21%。',
      '在蕨類森林上空盤旋,獵捕其他昆蟲,是天空的統治者。',
    ],
    compare: '翼展和一隻老鷹差不多,卻是一隻不折不扣的蜻蜓。',
    funfact: '高氧環境是巨蟲的關鍵——含氧量下降後,昆蟲再也長不到這麼大。',
  },
  {
    id: 'arthro', name: '節胸蜈蚣', sci: 'Arthropleura', period: 'carboniferous', diet: 'herb', build: 'millipede', herd: 3,
    lengthM: 2.1, heightM: 0.3, massKg: 50, periodMa: [345, 295], region: '歐洲、北美', swim: false,
    color: 0x5a4a30, accent: 0x2e2418, spawn: { x: -18, z: 12, scale: 1.0, rot: 0.8 },
    tagline: '史上最大的陸生節肢動物',
    facts: [
      '身長可達兩公尺以上,是有史以來最大的陸生無脊椎動物。',
      '由數十節帶甲的體節組成,每節都有成對的腳,在落葉層間爬行。',
      '推測以腐爛的植物與蕨類為食,是巨蟲森林的和平巨人。',
    ],
    compare: '和一個成年人一樣長的巨型「馬陸」,想像牠爬過你腳邊。',
    funfact: '牠爬行留下的化石足跡最寬達 50 公分,像一條迷你的鐵軌。',
  },
  {
    id: 'eryops', name: '引螈', sci: 'Eryops', period: 'carboniferous', diet: 'carn', build: 'amphibian', herd: 3,
    lengthM: 2.0, heightM: 0.5, massKg: 90, periodMa: [299, 295], region: '北美洲', swim: false,
    color: 0x5a6a4a, accent: 0x36402a, spawn: { x: 20, z: 20, scale: 1.0, rot: -1.0 },
    tagline: '登上陸地的早期兩棲巨獸',
    facts: [
      '兩棲類的早期代表,身長約兩公尺,像一隻巨大而粗壯的鯢。',
      '四肢向兩側伸展、貼地爬行,在水邊伏擊魚類與其他小動物。',
      '寬大的嘴布滿尖牙,是當時陸地與水域交界處的頂級掠食者之一。',
    ],
    compare: '體型像一隻大鱷魚,卻是青蛙與蠑螈的遠古親戚。',
    funfact: '牠代表脊椎動物登陸的關鍵一步——但仍離不開水邊繁殖。',
  },

  /* ================= 二疊紀(似哺乳爬行類) ================= */
  {
    id: 'dimetro', name: '異齒龍', sci: 'Dimetrodon', period: 'permian', diet: 'carn', build: 'sailback', herd: 3,
    lengthM: 3.2, heightM: 1.2, massKg: 150, periodMa: [295, 272], region: '北美洲', swim: false,
    color: 0x8a7050, accent: 0xb05a3a, spawn: { x: 30, z: -12, scale: 1.0, rot: 2.2 },
    tagline: '背帆高聳的頂級掠食者(不是恐龍)',
    facts: [
      '背上由加長的脊椎骨撐起一面大帆,可能用來調節體溫或求偶展示。',
      '雖然常被誤認為恐龍,牠其實是似哺乳的「盤龍類」,和我們的關係更近。',
      '嘴中有大小不一的牙齒(異齒),這是通往哺乳動物的重要特徵。',
    ],
    compare: '比恐龍還早了三千萬年,是二疊紀陸地的霸主。',
    funfact: '牠和恐龍的時間距離,比暴龍到現在還要遠——別再叫牠恐龍了。',
  },
  {
    id: 'gorgon', name: '麗齒獸', sci: 'Gorgonops', period: 'permian', diet: 'carn', build: 'synapsid', herd: 2,
    lengthM: 3.0, heightM: 1.1, massKg: 250, periodMa: [260, 254], region: '南非', swim: false,
    color: 0x7a6a52, accent: 0x463a2a, spawn: { x: -30, z: 14, scale: 1.0, rot: 0.5 },
    tagline: '長著劍齒的似哺乳掠食者',
    facts: [
      '獸孔類的頂級掠食者,上顎有一對長長的犬齒,是最早的「劍齒」動物之一。',
      '四肢比早期爬行類更靈活地收到身體下方,步態更接近哺乳動物。',
      '稱霸二疊紀晚期,卻在二疊紀末的大滅絕中一同消失。',
    ],
    compare: '像一隻長著獠牙的巨犬,是哺乳類崛起前的先聲。',
    funfact: '牠所屬的獸孔類,正是包括人類在內所有哺乳動物的祖先支系。',
  },
  {
    id: 'lystro', name: '水龍獸', sci: 'Lystrosaurus', period: 'permian', diet: 'herb', build: 'dicynodont', herd: 6,
    lengthM: 1.1, heightM: 0.6, massKg: 90, periodMa: [252, 248], region: '全球', swim: false,
    color: 0x9a8560, accent: 0x5a4a34, spawn: { x: -8, z: 28, scale: 1.0, rot: 0.9 },
    tagline: '熬過大滅絕的倖存者',
    facts: [
      '豬一般大的植食獸孔類,嘴前端有喙、上顎有兩根小獠牙,用來挖掘植物。',
      '二疊紀末大滅絕後,牠一度佔了全球陸生脊椎動物的九成,遍布各大陸。',
      '牠橫跨南極、非洲、亞洲的化石,曾是大陸漂移學說的關鍵證據。',
    ],
    compare: '體型像一頭矮胖的豬,卻是「大死亡」之後最成功的倖存者。',
    funfact: '正因為牠幾乎無所不在,科學家才確信這些大陸曾經連在一起。',
  },

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

  /* ================= 古近紀(哺乳類崛起) ================= */
  {
    id: 'eohippus', name: '始祖馬', sci: 'Eohippus', period: 'paleogene', diet: 'herb', build: 'beast', herd: 8,
    lengthM: 0.6, heightM: 0.35, massKg: 5, periodMa: [56, 48], region: '北美洲、歐洲', swim: false,
    color: 0x8a6a44, accent: 0xc0a070, spawn: { x: 12, z: 10, scale: 1.0, rot: 1.0 },
    model: { neck: 0.4, headSize: 0.9, ear: true },
    tagline: '狗一般大的第一批馬',
    facts: [
      '最早的馬,只有狐狸或小狗大小,前腳有四趾、後腳三趾,適合在森林軟地行走。',
      '牙齒低冠,吃的是柔軟的樹葉與嫩芽,而非後來草原上的硬草。',
      '之後數千萬年間,牠的後代逐漸變大、趾數減少,演化成今天的馬。',
    ],
    compare: '和一隻柴犬差不多大,卻是駿馬的起點。',
    funfact: '從始祖馬到現代馬,是教科書上最經典的演化序列之一。',
  },
  {
    id: 'paracera', name: '巨犀', sci: 'Paraceratherium', period: 'paleogene', diet: 'herb', build: 'beast', herd: 2,
    lengthM: 8.0, heightM: 4.8, massKg: 17000, periodMa: [34, 23], region: '亞洲', swim: false,
    color: 0x9a8a70, accent: 0x6a5a44, spawn: { x: -34, z: 12, scale: 1.0, rot: 0.4 },
    model: { neck: 2.2, headSize: 1.1, longLegs: true, hornless: true },
    tagline: '史上最大的陸生哺乳動物',
    facts: [
      '肩高約五公尺、體重可達 17 噸,是有史以來最大的陸生哺乳動物。',
      '其實是一種沒有角的巨型犀牛,靠長頸取食高處的樹葉,生態位近似蜥腳類恐龍。',
      '生活在亞洲的乾燥林地,龐大的體型讓成年個體幾乎沒有天敵。',
    ],
    compare: '比長頸鹿更高、比非洲象重上三倍,是哺乳類版的「腕龍」。',
    funfact: '恐龍滅絕後,哺乳類只花了三千多萬年,就重新長出了這樣的巨獸。',
  },
  {
    id: 'titanoboa', name: '泰坦巨蟒', sci: 'Titanoboa', period: 'paleogene', diet: 'carn', build: 'snake', herd: 1,
    lengthM: 13, heightM: 0.7, massKg: 1100, periodMa: [60, 58], region: '南美洲', swim: false,
    color: 0x3a4a38, accent: 0x6a7a3a, spawn: { x: 8, z: -26, scale: 1.0, rot: -0.5 },
    tagline: '史上最大的蛇',
    facts: [
      '身長可達 13 公尺、體重超過一噸,是有史以來最巨大的蛇。',
      '生活在恐龍滅絕後炎熱潮濕的雨林河流中,以巨大的身軀纏繞、勒斃獵物。',
      '牠能長這麼大,正因為當時的熱帶氣溫比現在更高。',
    ],
    compare: '比一輛校車還長,粗到能吞下整隻鱷魚。',
    funfact: '牠的體型反過來告訴科學家:六千萬年前的赤道有多麼酷熱。',
  },

  /* ================= 冰河時期(長毛巨獸) ================= */
  {
    id: 'mammoth', name: '長毛象', sci: 'Mammuthus primigenius', period: 'iceage', diet: 'herb', build: 'beast', herd: 4,
    lengthM: 5.4, heightM: 3.2, massKg: 6000, periodMa: [0.4, 0.004], region: '北半球凍原', swim: false,
    color: 0x6a4f36, accent: 0x3a2a1c, spawn: { x: -20, z: -10, scale: 1.0, rot: 0.6 },
    model: { trunk: true, tusks: 'curved', fur: true, hump: true, headSize: 1.3 },
    tagline: '冰原上披著長毛的巨象',
    facts: [
      '披著厚厚的長毛與皮下脂肪抵禦嚴寒,肩上還有儲存脂肪的隆起。',
      '一對向內彎曲的長牙可達四公尺,用來刮雪、掘食與爭鬥。',
      '成群漫步於猛獁草原,是冰河時期人類獵捕與崇拜的對象。',
    ],
    compare: '和亞洲象差不多大,卻穿著一身厚重的毛皮大衣。',
    funfact: '最後一批長毛象直到約四千年前才消失,那時埃及金字塔都已建成。',
  },
  {
    id: 'smilodon', name: '劍齒虎', sci: 'Smilodon', period: 'iceage', diet: 'carn', build: 'beast', herd: 2,
    lengthM: 2.0, heightM: 1.1, massKg: 300, periodMa: [2.5, 0.01], region: '美洲', swim: false,
    color: 0xb08a54, accent: 0x6a4a2a, spawn: { x: 26, z: -16, scale: 1.0, rot: 2.2 },
    model: { sabers: true, headSize: 1.1, feline: true, shortTail: true },
    tagline: '揮舞軍刀般犬齒的獵手',
    facts: [
      '上顎有一對長達 18 公分的劍狀犬齒,用來刺穿大型獵物的咽喉。',
      '體格比現代獅子更粗壯,前肢強而有力,擅長壓制猛獁與野牛。',
      '大量化石出土於瀝青坑,顯示牠們可能成群獵食。',
    ],
    compare: '比獅子更壯,嘴裡卻藏著兩把匕首。',
    funfact: '那對招牌獠牙其實很脆,只能刺進柔軟的部位,不能咬硬骨頭。',
  },
  {
    id: 'woollyrhino', name: '披毛犀', sci: 'Coelodonta', period: 'iceage', diet: 'herb', build: 'beast', herd: 3,
    lengthM: 3.8, heightM: 1.8, massKg: 2000, periodMa: [3.6, 0.01], region: '歐亞凍原', swim: false,
    color: 0x7a6248, accent: 0x40301f, spawn: { x: -6, z: 30, scale: 1.0, rot: 0.9 },
    model: { fur: true, noseHorn: 'long', headSize: 1.1, lowHead: true },
    tagline: '長毛與大角的冰原犀牛',
    facts: [
      '披著厚毛適應酷寒,鼻子上有一支扁而長的大角,可達一公尺。',
      '用鼻角撥開積雪,取食底下的草與地衣。',
      '和長毛象共享凍原,是冰河時期洞穴壁畫上常見的主角。',
    ],
    compare: '像一頭穿著毛皮大衣的犀牛,頂著一把大刀。',
    funfact: '西伯利亞的凍土曾挖出保存完整的披毛犀,連毛皮都還在。',
  },
  {
    id: 'megatherium', name: '大地懶', sci: 'Megatherium', period: 'iceage', diet: 'herb', build: 'beast', herd: 2,
    lengthM: 6.0, heightM: 3.5, massKg: 4000, periodMa: [0.4, 0.01], region: '南美洲', swim: false,
    color: 0x8a7250, accent: 0x50402c, spawn: { x: 34, z: 22, scale: 1.0, rot: -2.0 },
    model: { neck: 0.9, headSize: 1.0, bipedRear: true, claws: true },
    tagline: '像大象一樣大的地棲樹懶',
    facts: [
      '身長六公尺、和大象一樣重,是有史以來最大的樹懶之一。',
      '能用粗壯的後肢與尾巴撐地站起,伸出帶巨爪的前肢把樹枝拉向嘴邊。',
      '慢條斯理地啃食樹葉,龐大的體型讓牠幾乎不怕掠食者。',
    ],
    compare: '想像一隻站起來有兩層樓高、慢吞吞的巨型樹懶。',
    funfact: '牠的近親正是今天樹上那些行動緩慢的小樹懶。',
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
  totalSec: 138,
  stages: [
    { at: 0,   period: 'cambrian',      title: '寒武紀 · 生命大爆發', caption: '五億多年前的淺海裡,生命在瞬間爆發出各種體型——三葉蟲爬滿海床,奇蝦統治著海洋。' },
    { at: 14,  period: 'carboniferous', title: '石炭紀 · 巨蟲森林',   caption: '高氧的空氣讓昆蟲長成巨獸,蕨類森林遮天蔽日,第一批四足類爬上了陸地。' },
    { at: 26,  period: 'permian',       title: '二疊紀 · 我們的遠祖', caption: '背帆高聳的異齒龍稱霸,似哺乳的獸孔類正一步步走向哺乳動物——直到史上最慘烈的大滅絕降臨。' },
    { at: 39,  period: 'triassic',      title: '三疊紀 · 恐龍的黎明', caption: '廢墟之上,第一批恐龍在乾熱的平原悄悄登場,體型還小,和眾多爬行類共享世界。' },
    { at: 52,  period: 'jurassic',      title: '侏羅紀 · 巨龍的時代', caption: '氣候轉暖、森林蔓延,植食恐龍長成前所未見的龐然大物,異特龍稱霸大地。' },
    { at: 66,  period: 'cretaceous',    title: '白堊紀 · 繁盛的頂點', caption: '開花植物遍地,暴龍站上食物鏈頂端,巨大的翼龍統治天空。生命達到空前的繁盛。' },
    { at: 84,  meteor: true,            title: '天外之光',           caption: '一道白光劃過天際,越來越亮、越來越大——一顆直徑十公里的小行星,正衝向地球。' },
    { at: 95,  impact: true,            title: '撞擊',               caption: '' },
    { at: 99,  aftermath: true,         title: '第五次大滅絕',       caption: '塵埃遮蔽陽光,氣溫驟降。六千六百萬年前,非鳥恐龍的時代戛然而止。' },
    { at: 108, period: 'paleogene',     title: '古近紀 · 哺乳類崛起', caption: '劫後餘生的哺乳類迅速填補空出的世界,輻射演化出從小馬到巨犀的各種身形。' },
    { at: 122, period: 'iceage',        title: '冰河時期 · 長毛巨獸', caption: '冰原上,長毛象與披毛犀成群漫步,劍齒虎潛伏獵殺——而會用火的人類,也登場了。' },
    { at: 134, coda: true,              title: '而演化,未曾停歇',    caption: '從寒武紀的海洋到今天,生命從未停止改變。這段旅程仍在繼續——而你,正是其中的一部分。' },
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
