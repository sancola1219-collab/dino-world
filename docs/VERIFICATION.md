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
| 2026-07-06 | Claude Opus 4.8 | 全綠。dinoCount=8;night≈0、noon≈0.53(dayVsNight=true);focus='trex' infoOpen=true focusBright≈0.75;tourLast=7;walk/overview 往返正常;timeSweep=ok;console 零錯誤。相機預設 phi=1.32/dist=78/exposure=1.25。 |
