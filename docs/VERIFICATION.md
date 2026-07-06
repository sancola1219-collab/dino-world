# 驗證腳本與紀錄

這台機器的預覽瀏覽器常是 hidden(截圖必逾時),所以視覺驗證走 `__DW` 同步模擬 + `gl.readPixels` 像素取樣。
把下面整段貼到 console 即可重跑全部檢查。

## 一鍵回歸腳本

```js
(function(){
  const DW = window.__DW; if(!DW) return '未載入';
  const out = {};
  DW.forceSize(1280, 800);

  // 1) 恐龍數量
  out.dinoCount = DW.counts().dinos;                 // 期望 8

  // 2) 時段光照:正午應遠亮於深夜
  DW.setTime(2);  for(let i=0;i<20;i++)DW.step(16);  out.night = DW.sample().brightRatio;   // 近 0
  DW.setTime(13); for(let i=0;i<20;i++)DW.step(16);  out.noon  = DW.sample().brightRatio;   // 約 0.5
  out.dayVsNight = out.noon > out.night + 0.2;        // 期望 true

  // 3) 聚焦:狀態立即改變 + 面板開啟
  DW.focus('trex'); for(let i=0;i<60;i++)DW.step(16);
  out.focusState = DW.state.focus;                   // 'trex'
  out.infoOpen = document.getElementById('infoPanel').classList.contains('open'); // true
  out.focusBright = DW.sample().brightRatio;         // 特寫,天空可見時偏高

  // 4) 生態導覽 8 站
  DW.tour.start(); for(let s=0;s<7;s++){DW.tour.step(1);for(let i=0;i<8;i++)DW.step(16);}
  out.tourLast = DW.tour.index();                    // 7
  DW.tour.end();

  // 5) 漫遊往返
  DW.setView('walk');  for(let i=0;i<40;i++)DW.step(16); out.walkView = DW.state.view; // 'walk'
  DW.setView('overview'); out.backView = DW.state.view;                                // 'overview'

  // 6) 時間掃描不炸
  try{ for(let h=0;h<=24;h+=2){DW.setTime(h);DW.step(16);} out.timeSweep='ok'; }
  catch(e){ out.timeSweep='FAIL '+e.message; }

  DW.setTime(10);
  return out;
})()
```

## 紀錄

| 日期 | 模型 | 結果 |
|---|---|---|
| 2026-07-06 | Claude Opus 4.8 | 首版。dinoCount=8;dayVsNight=true;focus/tour/walk 正常;console 零錯誤。相機預設 phi=1.32/dist=78/exposure=1.25。 |
| 2026-07-06 | Claude Opus 4.8(年代) | **新增三疊紀/侏羅紀/白堊紀年代系統**(共 13 種恐龍)。驗證:total=13;三紀可見數 3/4/6、導覽站數對應;天空氛圍隨年代變(三疊紀暖褐 top≈[156,128,90]、侏羅紀偏綠[110,150,131]、白堊紀藍[155,175,204]);5 種新恐龍(始盜龍/腔骨龍/板龍/梁龍/異特龍)造型正常、聚焦自動切年代;timeSweep=ok;漫遊往返正常;console 零錯誤。新增 `__DW.setPeriod/period/visibleDinos`。 |
| 2026-07-06 | Fable 5 | **精緻化**:腿由圓柱改成放樣肌肉(每腿 6 段:髖球+大腿 loft+膝球+小腿 loft+踝球+橢球腳掌)、皮膚加程序化法線貼圖(鱗片/皺褶立體受光,normalScale 0.6)、幾何解析度提高(loft R20、球18、圓柱16、橢球20)、陰影 3072+softradius3+normalBias。實測載入 97 隻、暴龍/長毛象身體受光正常不過暗、console 零錯誤。 |
| 2026-07-06 | Fable 5 | **修三缺陷**:(1) 放樣身體透明(幽靈狀)—— 纏繞反、FrontSide 剔近面 → skinMat 改 DoubleSide,實測 body mesh side=2 實體化;(2) 海洋生物飛天 —— 寒武游泳生物高度壓到 y2.5–8(水位抬到 11 淹成海),實測 swimmers y0.8–7.3 全在水下、三葉蟲在海床、白堊水位回 -0.6;(3) 腿的方塊腳改平滑橢球+踝球。console 零錯誤。 |
| 2026-07-06 | Fable 5 | **擴充為完整生命史:8 時代、29 種生物、成群結隊**。新增寒武(三葉蟲/奇蝦/歐巴賓)、石炭(巨脈蜻蜓/節胸蜈蚣/引螈)、二疊(異齒龍/麗齒獸/水龍獸)、古近(始祖馬/巨犀/泰坦巨蟒)、冰河(長毛象/劍齒虎/披毛犀/大地懶)。用 5 個 archetype builder(beast/trilobite/anomalocaris+opabinia/dragonfly+millipede/amphibian/snake)+ herd clone(材質快取)。實測:載入 97 個個體、8 時代各 11–16 隻、族群移動(三葉蟲爬/長毛象走/游泳飛行)、聚焦新生物、史詩全 12 幕(寒武→白堊→隕石→滅絕 vis=0→古近復甦→冰河→終幕)、endEpic 復原 58 隻、各時代畫面色調有別(寒武青綠/冰河明亮)、console 零錯誤。 |
| 2026-07-06 | Fable 5 | **加入恐龍自主行為 + 紀元史詩模式**。行為:`DW.minds()` 顯示 AI 多樣(patrol/hunt/flee/graze/walk)、6 秒模擬後位置改變、掠食者追獵使獵物 flee(事件成立)。史詩:`DW.epic` 全 7 幕正確(三疊/侏羅/白堊切年代→隕石 meteor light→撞擊 flash 連續播放峰值 0.97 後歸零→滅絕天空由 [131,153,149] 轉暗紅 [49,24,8]+灰燼 points+恐龍縮 0→終幕);`epic.end()` 完整復原(暴龍 scale 回 1.075、年代回白堊)。常規回歸(聚焦/漫遊/年代/時間)全過,console 零錯誤。 |
| 2026-07-06 | Fable 5 | **恐龍造型全面重做為「脂椎放樣」寫實風**(13 隻,取代原本球/膠囊堆疊的塊狀外形)。修掉放樣改寫時六隻 `g.add(loft(...))` 少一括號的 SyntaxError。重驗:13 隻全放樣成功、比例合理(腕龍高 12.7m/暴龍長 12.3m/甲龍 60 甲板)、聚焦身體受光為暖色(法線朝外正確)、三年代聚焦+導覽正常、console 零錯誤。 |
| 2026-07-06 | Claude Opus 4.8(修) | **修掉「整片綠看不到」bug**:樹葉 billboard 基礎幾何 9→1(過大蓋住天空)。重驗:night=0.025、noon=0.852;暴龍中央直行由上到下=藍天→棕色暴龍→綠地(分層正確);focus 改低角度 phi=1.42、hemi 半球光加強、exposure=1.35 讓恐龍跳出植被;tourLast=7;timeSweep=ok;console 零錯誤。 |
