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
| 2026-07-06 | Fable 5 | **恐龍造型全面重做為「脂椎放樣」寫實風**(13 隻,取代原本球/膠囊堆疊的塊狀外形)。修掉放樣改寫時六隻 `g.add(loft(...))` 少一括號的 SyntaxError。重驗:13 隻全放樣成功、比例合理(腕龍高 12.7m/暴龍長 12.3m/甲龍 60 甲板)、聚焦身體受光為暖色(法線朝外正確)、三年代聚焦+導覽正常、console 零錯誤。 |
| 2026-07-06 | Claude Opus 4.8(修) | **修掉「整片綠看不到」bug**:樹葉 billboard 基礎幾何 9→1(過大蓋住天空)。重驗:night=0.025、noon=0.852;暴龍中央直行由上到下=藍天→棕色暴龍→綠地(分層正確);focus 改低角度 phi=1.42、hemi 半球光加強、exposure=1.35 讓恐龍跳出植被;tourLast=7;timeSweep=ok;console 零錯誤。 |
