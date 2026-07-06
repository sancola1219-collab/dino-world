# 恐龍世界 — 交接指南(HANDOFF)

> 給下一個接手的 AI 模型(Codex / Claude Code / 其他)或人類開發者。
> **先讀完這份,再動任何程式碼。** 本文件是唯一完整的交接入口;
> 根目錄的 `CLAUDE.md` 與 `AGENTS.md` 只是指向這裡的精簡摘要。

最後更新:2026-07-06(由 Claude Opus 4.8 建立專案並完成第一版)

---

## 0. 為什麼有這份文件(重要背景)

建立者(Fable 5 / Opus 4.8)之後可能無法再被叫用。這個專案刻意做成
**任何模型都能無縫接手**:純前端、零依賴、零建置、所有知識集中在幾個檔案、
測試不靠截圖而靠可重跑的 `__DW` API。你(接手者)只要讀這份 + 跑一次 §2 的驗證腳本,
就掌握全部。改完照 §7 的守則、更新 §2 的紀錄即可。

---

## 1. 這是什麼

「恐龍世界」是一個**純前端**的寫實恐龍生態互動教學模擬器(繁體中文介面):

- **八個地質時代(完整生命史)**:頂端切換 寒武 / 石炭 / 二疊 / 三疊 / 侏羅 / 白堊 / 古近 / 冰河 —— 每個時代只顯示該時代生物、換環境氛圍、彈「發展史」介紹卡。這是整個 App 的組織主軸。
- **兩種視角**:遠觀(軌道相機俯瞰谷地)→ 漫遊(第一人稱走進谷地,WASD+滑鼠環顧)
- **29 種生物,成群結隊(每種一個 herd)**:從寒武紀三葉蟲/奇蝦、石炭紀巨脈蜻蜓/節胸蜈蚣、二疊紀異齒龍、恐龍三紀(13 種)、古近紀巨犀/泰坦巨蟒,到冰河時期長毛象/劍齒虎/披毛犀/大地懶。每種有程序化 3D 模型 + 完整中文教學資料卡。
- **族群系統**:每種生物載入時建 `herd` 隻個體(hero=第一隻,帶標籤、被聚焦;其餘為背景族群散佈周圍)。材質依 id 快取,clone 成本低。`defaultHerd()` 給未指定者預設數量。
- **恐龍自主行為**:每隻恐龍有 `mind`(dt 驅動的 AI)——植食者遊走/覓食/到河邊飲水,肉食者巡邏/鎖定獵物追獵,被鎖定的植食者受驚逃竄;步態隨速度變、會轉向朝目標、留在谷地內。谷地是活的生態,不是靜止擺設。
- **紀元史詩模式**(頂欄「紀元史詩」):一場約 90 秒的自動演出——三疊紀恐龍黎明 → 侏羅巨龍 → 白堊繁盛 → 隕石劃過天際 → 撞擊白光 → 大滅絕(天空轉暗紅、灰燼飄落、恐龍消失) → 終幕「鳥類存續」。可隨時「結束史詩」完整復原。
- **時間系統**:0–24 時滑桿,天色/太陽方向/光強即時變化;可自動流動
- **教學功能**:年代發展史卡、左側物種圖鑑(依年代)、右側資料卡、「生態導覽」(依年代動態產生)
- **谷地生態**:程序化地形(環山盆地+下切河谷)、河流、針葉林(instanced)、蕨叢地被、外緣岩層;植被色調與密度隨年代變

技術:Three.js r160(已 vendor 到 `vendor/`,**無 npm、無打包器、無外部資產**)。
所有貼圖(地表、皮膚、樹冠、樹皮、天空)都是載入時用 Canvas / shader 程序化生成,整個 repo 沒有任何圖片檔。

---

## 2. 如何執行與測試

```
node tools/serve.mjs 8124     # 零依賴靜態伺服器
# 瀏覽器開 http://localhost:8124/
```

(或用 Claude Code 的 preview:`.claude/launch.json` 已設定 `dino-world`。)

### 測試 API(接手者一定要懂)

這台機器的預覽瀏覽器**常是 hidden**(`document.hidden===true`):
rAF 停擺、鏈式計時器被節流、**截圖必逾時**(已實測 30s timeout)。
所以 `main.js` 暴露了 `window.__DW` 除錯 API,**驗證一律走同步模擬 + 像素取樣,不要依賴截圖**:

```js
const DW = window.__DW;
DW.forceSize(1280, 800);          // hidden 下容器可能 0×0,先強制尺寸
DW.setTime(9);                    // 設定時刻(0..24),光照立即套用
for (let i=0;i<60;i++) DW.step(16);  // 假時鐘同步推進 60 幀(不受計時器節流)
DW.focus('trex');                 // 聚焦暴龍(狀態立即改變、相機開始飛)
for (let i=0;i<90;i++) DW.step(16);
DW.sample();  // → {avg:[r,g,b], brightRatio, w, h}  同一 task 內 render→readPixels
DW.counts();  // → {dinos:13, labelsShown:N}
DW.minds();   // → 每隻可見恐龍的 {id, ai, x, z, sp(速度)} —— 驗證自主行為(遊走/覓食/追獵/逃竄)
DW.epic.start(); DW.epic.jump(75); DW.step(16); DW.epic.info(); // 紀元史詩:跳到撞擊、看 stage/skyFall/flash;DW.epic.end() 復原
```

**驗證判準(第一版實測基線,供回歸比對):**
- 載入後 `DW.counts().dinos === 8`
- `DW.setTime(13)`(正午)的 `sample().brightRatio` 明顯 > `DW.setTime(2)`(深夜,近 0)
- 聚焦任一恐龍後 `state.focus` 改變、資訊面板 `#infoPanel.open`、麵包屑更新
- 遠觀正午 `brightRatio ≈ 0.5`、聚焦特寫 `≈ 0.75`(天空可見即偏高)
- 跑完「聚焦 8 種 → 導覽 8 站 → 時間 0..24 掃描 → 漫遊往返」後 console 無 error

完整驗證腳本見 `docs/VERIFICATION.md`,可整段貼到 console 重跑。

---

## 3. 檔案地圖

| 檔案 | 職責 |
|---|---|
| `index.html` | DOM 骨架 + importmap(`three` → `vendor/`) |
| `css/style.css` | 全部樣式(深色琥珀金質感;美學要求:高級、**不要可愛風**) |
| `js/data.js` | **恐龍資料庫**(真實古生物數據 + 所有中文教學文案)、導覽順序、時刻語意。**改教學內容只動這裡。** |
| `js/util.js` | 種子亂數、值噪聲、fBm、Canvas 輔助 |
| `js/textures.js` | 程序化貼圖(地表+法線、皮膚反蔭蔽、樹冠 alpha、樹皮、噪聲) |
| `js/world.js` | 谷地場景:`heightAt(x,z)` 高度場、地形/河流/植被/岩石、天空 shader、`skyStateForHour(h)` 光照曲線 |
| `js/dino.js` | **程序化恐龍模型(寫實自然風)**。核心是 `loft(mat, spine)`:用一條脊椎節點(每點含半徑 r、垂直 ry、水平 rz)以平行移動框架放樣出**單一平滑連續身體**(鼻→尾一氣呵成,不是球黏球)。每科一個 builder 定義 spine+腿+特徵;`legTapered` 漸縮腿(可動);`userData.parts.legs` 供步態動畫。 |
| `js/ui.js` | 全部 DOM 介面(只反映狀態+回呼,不持有邏輯) |
| `js/main.js` | 總指揮:狀態機、渲染迴圈、相機、互動、漫遊、`__DW` 測試 API |
| `tools/serve.mjs` | 開發用靜態伺服器 |

---

## 4. 核心架構(改 code 前必懂)

### 4.1 狀態機(`main.js` 的 `state` 物件 = 唯一事實來源)

```
state.view       'overview' | 'walk'
state.period     'triassic' | 'jurassic' | 'cretaceous' —— 目前年代,只顯示該年代恐龍
state.focus      恐龍 id | null
state.following  遠觀時相機是否跟隨聚焦的恐龍
state.time       0..24 一天的時刻 —— 天色/光照都是它的純函數
state.timeFlow   時間是否自動流動
state.tourIndex  -1=未導覽,否則為站別(導覽依 state.period 動態產生)
```

**年代系統(`setPeriod(id)`):** 所有恐龍在載入時一次建好,切年代只改 `root.visible`(不重建);
環境靠 `worldRefs.applyMood(mood)`(地表/植被 material.color 乘算 tint + instanced 樹木 count 縮放)
+ `applyTime` 疊上 `periodMood.sky/sun/fog/hemiGround` 色調。每種恐龍在 `data.js` 標 `period` 欄位;
`speciesOfPeriod(id)` / `tourOf(id)` 依年代過濾。跨年代點選(如導覽)會先自動 `setPeriod`。
👉 mood 的 tint 是**乘算**(白=不變),所以白堊紀 tint 全白 = 維持原本藍天綠地。

**鐵律一:狀態與動畫分離。** 使用者操作當下狀態立即改變(聚焦、切視角、資訊面板都是同步的);
相機飛行(`flyTween`)、淡入淡出只是裝飾層。動畫被節流/中斷/掉幀,邏輯完全不受影響。
👉 為什麼:過去專案(棋類)把邏輯綁在動畫回呼上,背景分頁節流時整個卡死。**不要走回頭路。**

**鐵律二:場景由參數純函數決定,不做跨幀增量累加。** 天色是 `skyStateForHour(state.time)`;
恐龍站位是 `heightAt(base.x, base.z)` + 呼吸偏移;翼龍盤旋是 `elapsed` 的三角函數。
任意暫停/拉時間軸都不累積誤差。

### 4.2 渲染迴圈與 hidden browser 對策(`main.js`)

- **驅動器在 start 當下就依 `document.hidden` 選擇**:hidden → `setInterval(250ms)`;visible → rAF + 400ms 看門狗。
  👉 為什麼:頁面一載入就是 hidden 時不會有 `visibilitychange` 事件,只在事件裡切換的後備永遠不啟動(邏輯凍結)。
- **切換驅動器前同時 `cancelAnimationFrame` + `clearInterval`**,否則 hidden↔visible 循環會累積多條 rAF 鏈。
- **載入期間的讓步用 `setTimeout(0)`**(`yieldFrame`),不是 rAF(hidden 下 rAF 永不觸發會卡死載入)。
  ⚠️ 已知取捨:hidden 分頁 setTimeout 會被節流,所以「載入中就切到背景」會拖慢載入;回到前景即恢復。
- `ResizeObserver` 監聽容器;`sizeToContainer` 有 `max(1, …)` 保護 0×0。

### 4.3 漫遊模式與 Pointer Lock(`main.js`)

- WASD 移動、Shift 奔跑、滑鼠環顧、`1` 回遠觀 / `2` 進漫遊。相機用 `heightAt` 貼地(眼高 1.7m)。
- **Pointer Lock 冷卻**:玩家按 Esc 退出後,瀏覽器約 1.25s 內 `requestPointerLock()` 必失敗。
  對策(已內建,勿退化):
  - `pointerlockerror` 用**連續失敗計數**,`≥3` 次才顯示「環境不支援」提示,不第一次就永久降級。
  - resume 的 `requestPointerLock()` 一律 `.catch(()=>{})`,玩家再點畫面自然重試。
  - 解鎖時顯示 `#resumeTip`(點畫面繼續 / 按 1 返回),不強制重鎖。

### 4.4 比例與尺寸

`dino.js` 每個 builder 以「標準單位≈公尺」建模,再依 `species.heightM` 整體縮放,
所以 8 隻恐龍彼此的大小比例是對的(腕龍 12m vs 伶盜龍 0.5m 的懸殊感是刻意的教學效果)。

### 4.5 已踩過的坑(修過,不要再犯)

1. **預設相機俯角太陡會整片綠**:`orbit.phi` 太小(接近垂直)時幾乎看不到天空,畫面死板偏暗。
   第一版把 `phi` 從 1.05 調到 **1.32**、`dist` 78、`exposure` 1.25 才平衡了地平線與天空。改相機預設時用 `DW.sample()` 確認 `brightRatio` 沒掉。
2. **InstancedMesh 的 billboard 基礎幾何要用「單位大小」**,實際尺寸完全交給 per-instance 縮放。
   第一版曾把樹葉 `crossPlanes(9)` 又再乘上樹冠半徑(×3~9)→ 樹葉放大約 9 倍成 30~80 單位的巨大面片,
   一圈就把**整個畫面連天空全蓋成一片綠**(使用者回報「看不到」)。徵狀:`__DW.strips()` 上中下三條同一種綠、
   隱藏 instanced 植被後天空才露出。診斷法就是用 `strips()` 逐段取樣 + 分類隱藏 mesh 二分法。
3. **`crossPlanes`/`mergeGeos` 是自寫的幾何合併**(避免依賴 BufferGeometryUtils);若加新植被沿用它,別假設有 addons。
4. **聚焦取景用低角度(phi≈1.42)近水平**,讓恐龍映在天空/地平線上;俯視角會讓恐龍和地表同色系融在一起看不清。
   恐龍膚色偏暗,靠 `hemi` 半球光提亮陰影側(0.35+ambI×0.75)+ 曝光 1.35 才能從植被跳出來。
5. **改 dino.js 後一定要 `node <file>.mjs` 實跑一次驗語法**:`node --check` 會漏抓(它把 import/export 當 script 略過);
   曾因 `g.add(loft(mat, [...])` 少一個 `)`(六隻同錯)整個模組 SyntaxError → init 不跑、canvas 不建、載入卡在初始畫面。
   診斷法:preview `import('./js/dino.js?bust='+Date.now()).catch(e=>e.message)` 或 `cp x.js /tmp/x.mjs && node /tmp/x.mjs` 拿 codeframe 行號。
6. **放樣身體的三角纏繞(winding)要讓法線朝外**(FrontSide)。目前 `idx.push(a,c,b,b,c,d)` 已驗證朝外(聚焦時身體是受光的暖色而非死黑);若哪天身體變全黑剪影,就是纏繞反了、把兩個三角順序對調即可。
3. 貼圖全走 Canvas;**不要用彩色 emoji `fillText`**(光柵化極貴,成本會遞延到第一次 `getImageData` 才爆)。

---

## 5. 發佈(GitHub Pages)

- 帳號:`sancola1219-collab`(其他專案:boardgames、drawing-board、pivot-helper、space-world 同帳號)
- PAT 已存在 Windows 認證管理員,`git push` 免輸入;**`gh` CLI 與 python 不可用**
- 需要 GitHub API 時(建 repo、開 Pages),用 **Git Bash**(PowerShell 5.1 管線餵 secret 會壞):
  ```bash
  PAT=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')
  curl -s -H "Authorization: token $PAT" https://api.github.com/user   # 驗證
  # 建 repo:POST /user/repos {name:"dino-world"}
  # 開 Pages:POST /repos/OWNER/dino-world/pages {source:{branch:"main",path:"/"}}
  ```
- 純靜態、無 build:push 到 `main` 後 Pages 直接服務根目錄。**線上網址見 §8。**

---

## 6. 路線圖(未完成的擴充方向,依教學價值排序)

- [ ] **恐龍實體漫遊互動**:漫遊模式走近恐龍時彈出資料卡(目前資料卡只在遠觀點擊觸發)。
- [ ] **更多物種**:似鳥龍、棘龍、劍齒虎不算恐龍要標註;資料結構照 `data.js` 的欄位加即可。
- [ ] **群體行為**:同種恐龍成群、植食者遇肉食者走避(狀態層加簡單 boids,勿綁動畫回呼)。
- [ ] **腳印/塵土/河流反射**:粒子與 shader,注意仍要零資產。
- [ ] **小測驗模式**:資料都在 `data.js`,出題 UI 照導覽卡的模式做。
- [ ] **音效**(環境音、恐龍叫聲):目前刻意零資產;若加注意瀏覽器自動播放政策。
- [ ] **地形碰撞細化**:漫遊目前只做地面貼合,未擋樹幹/岩石。

---

## 7. 改動守則

1. 改邏輯前先讀 `main.js` 開頭的兩條鐵律註解(§4.1)。
2. 任何視覺改動,用 `__DW` + `sample()` 像素取樣驗證(§2),**不要只信截圖**(這台機器截圖必逾時)。
3. 教學文案(`data.js`)是給台灣學生看的:繁體中文、數據要對(主流古生物學共識)。
4. 美學:高級質感(深色、琥珀金點綴、serif 標題、髮絲線、寬字距),**不要可愛風**。
5. 驗證完成後更新 `docs/VERIFICATION.md` 的紀錄(附日期與模型名)。
6. 發佈前跑一次 §2 的完整煙霧測試,確認 console 無 error 再 push。

---

## 8. 目前狀態

- 第一版功能完成、通過 §2 全部驗證(2026-07-06, Opus 4.8);console 零錯誤。
- 視覺 QA:因 hidden browser 截圖逾時,用 `__DW.strips()` 逐段像素取樣驗證分層(天空/恐龍/地面)。
  ⚠️ 教訓:光看 `sample().brightRatio` 會被騙(整片同色的錯畫面也可能 brightRatio 高);
  一定要用 `strips()` 或中央直行分段確認「上藍天→中恐龍→下綠地」的堆疊,不能只看聚合亮度。
- **線上網址(已上線):https://sancola1219-collab.github.io/dino-world/**
  首版有「樹葉過大蓋住整個畫面」的 bug,已於 2026-07-06 修正(見 §4.5 #2)。
