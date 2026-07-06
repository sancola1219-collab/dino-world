// ui.js — 全部 DOM 介面。只反映狀態 + 發出回呼,不持有任何遊戲邏輯。
import { SPECIES, SPECIES_BY_ID, speciesOfPeriod, phaseOf } from './data.js';

const $ = (id) => document.getElementById(id);

export function initUI(handlers) {
  // 年代切換列。
  buildPeriodBar(handlers.periods, handlers.onPeriod);
  $('periodIntroClose').onclick = () => hide('periodIntro');

  // 頂欄導覽。
  $('navOverview').onclick = () => handlers.onView('overview');
  $('navWalk').onclick = () => handlers.onView('walk');
  $('navDex').onclick = () => handlers.onToggleDex();
  $('navTour').onclick = () => handlers.onTour();
  $('navSettings').onclick = () => toggle('settings');
  $('settingsClose').onclick = () => hide('settings');

  // 資訊面板。
  $('infoClose').onclick = () => handlers.onCloseInfo();
  $('dexClose').onclick = () => hide('dexPanel');

  // 導覽卡。
  $('tourPrev').onclick = () => handlers.onTourStep(-1);
  $('tourNext').onclick = () => handlers.onTourStep(1);
  $('tourExit').onclick = () => handlers.onTourExit();

  // 時間。
  $('dayRange').oninput = (e) => handlers.onTime(parseFloat(e.target.value));
  $('btnDayFlow').onclick = () => handlers.onToggleFlow();

  // 設定。
  $('setLabels').onchange = (e) => handlers.onSetting('labels', e.target.checked);
  $('setShadows').onchange = (e) => handlers.onSetting('shadows', e.target.checked);
  $('setFog').onchange = (e) => handlers.onSetting('fog', e.target.checked);
  document.querySelectorAll('input[name="quality"]').forEach((r) => {
    r.onchange = (e) => { if (e.target.checked) handlers.onSetting('quality', e.target.value); };
  });

  // 說明。
  $('helpClose').onclick = () => hide('helpOverlay');

  // 紀元史詩。
  $('navEpic').onclick = () => handlers.onEpic();
  $('epicSkip').onclick = () => handlers.onEpicEnd();
}

function toggle(id) { $(id).classList.toggle('open'); }
function hide(id) { $(id).classList.remove('open'); }
function show(id) { $(id).classList.add('open'); }

// 建年代切換列(三疊紀/侏羅紀/白堊紀)。
function buildPeriodBar(periods, onPeriod) {
  const bar = $('periodBar');
  bar.innerHTML = '';
  for (const p of periods) {
    const btn = document.createElement('button');
    btn.className = 'periodBtn'; btn.dataset.period = p.id;
    btn.innerHTML = `<span class="pName">${p.name}</span><span class="pYears">${p.years}</span>`;
    btn.onclick = () => onPeriod(p.id);
    bar.appendChild(btn);
  }
}
// 高亮目前年代。
export function setActivePeriod(id) {
  document.querySelectorAll('#periodBar .periodBtn').forEach((b) => b.classList.toggle('active', b.dataset.period === id));
}

// 年代發展史介紹卡(切換年代時彈出)。
export function showPeriodIntro(per, species, onFocus) {
  $('piName').textContent = per.name;
  $('piEn').textContent = per.en;
  $('piYears').textContent = per.years;
  $('piTagline').textContent = per.tagline;
  $('piHistory').textContent = per.history;
  const chips = species.map((sp) => {
    const cls = sp.diet === 'carn' ? 'carn' : 'herb';
    return `<button class="piChip ${cls}" data-id="${sp.id}"><span class="dexDot ${cls}"></span>${sp.name}</button>`;
  }).join('');
  $('piSpecies').innerHTML = chips;
  $('piSpecies').querySelectorAll('.piChip').forEach((c) => {
    c.onclick = () => { hide('periodIntro'); onFocus(c.dataset.id); };
  });
  show('periodIntro');
}

// 左側圖鑑:只列目前年代的物種。
export function rebuildDex(periodId, onFocus) {
  const list = $('dexList');
  list.innerHTML = '';
  for (const sp of speciesOfPeriod(periodId)) {
    const row = document.createElement('button');
    row.className = 'dexRow';
    const dietTag = sp.diet === 'carn' ? '肉食' : sp.diet === 'herb' ? '植食' : '雜食';
    const dietCls = sp.diet === 'carn' ? 'carn' : 'herb';
    row.innerHTML = `
      <span class="dexDot ${dietCls}"></span>
      <span class="dexName">${sp.name}<em>${sp.sci}</em></span>
      <span class="dexTag ${dietCls}">${dietTag}</span>`;
    row.onclick = () => onFocus(sp.id);
    list.appendChild(row);
  }
}

export function toggleDex() { toggle('dexPanel'); }
export function openDex() { show('dexPanel'); }

// 顯示某恐龍的教學資料卡。
export function showInfo(sp, following, onFollowToggle) {
  const body = $('infoBody');
  const dietText = sp.diet === 'carn' ? '肉食性' : sp.diet === 'herb' ? '植食性' : '雜食性';
  const facts = sp.facts.map((f) => `<li>${f}</li>`).join('');
  body.innerHTML = `
    <div class="infoTag ${sp.diet === 'carn' ? 'carn' : 'herb'}">${dietText}</div>
    <h2>${sp.name}</h2>
    <div class="sci">${sp.sci}</div>
    <p class="tagline">${sp.tagline}</p>
    <div class="statGrid">
      <div class="stat"><span>體長</span><b>${sp.lengthM} m</b></div>
      <div class="stat"><span>身高</span><b>${sp.heightM} m</b></div>
      <div class="stat"><span>體重</span><b>${fmtMass(sp.massKg)}</b></div>
      <div class="stat"><span>年代</span><b>${sp.periodMa[0]}–${sp.periodMa[1]} 百萬年前</b></div>
    </div>
    <div class="compareBar">
      <div class="cmpLabel">與人類比例</div>
      <div class="cmpTrack">
        <div class="cmpHuman" title="成年人約 1.7m"></div>
        <div class="cmpDino" style="width:${Math.min(100, sp.heightM / 12 * 100)}%"></div>
      </div>
      <div class="cmpNote">${sp.compare}</div>
    </div>
    <h3>重點</h3>
    <ul class="facts">${facts}</ul>
    <div class="funfact"><b>你知道嗎</b>${sp.funfact}</div>
    <div class="infoMeta">化石產地 · ${sp.region}</div>
    <button id="followBtn" class="followBtn ${following ? 'on' : ''}">${following ? '✓ 跟隨中(點擊取消)' : '跟隨這隻恐龍'}</button>
  `;
  show('infoPanel');
  $('followBtn').onclick = onFollowToggle;
}
export function hideInfo() { hide('infoPanel'); }

function fmtMass(kg) { return kg >= 1000 ? (kg / 1000).toFixed(kg >= 10000 ? 0 : 1) + ' 噸' : kg + ' kg'; }

// 更新時間顯示。
export function setClock(hour) {
  const h = Math.floor(hour), m = Math.floor((hour - h) * 60);
  $('clockText').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  $('dayPhase').textContent = phaseOf(hour);
  $('dayRange').value = hour;
}
export function setFlowIcon(flowing) { $('btnDayFlow').textContent = flowing ? '⏸' : '▶'; }

// 導覽卡。
export function showTour(step, total, sp, text) {
  $('tourStep').textContent = `第 ${step + 1} / ${total} 站`;
  $('tourTitle').textContent = sp.name;
  $('tourText').textContent = text;
  show('tourCard');
}
export function hideTour() { hide('tourCard'); }

// 麵包屑。
export function setBreadcrumb(text) { $('breadcrumb').textContent = text; }

// 漫遊 HUD。
export function setWalkHUD(on) {
  document.body.classList.toggle('walking', on);
}
export function showResumeTip(on) { $('resumeTip').classList.toggle('show', on); }

// 載入進度。
export function setLoad(pct, text) {
  $('loadBar').style.width = `${Math.round(pct * 100)}%`;
  if (text) $('loadText').textContent = text;
}
export function hideLoading() {
  const el = $('loading');
  el.classList.add('done');
  setTimeout(() => { el.style.display = 'none'; }, 700);
}
export function showHelp() { show('helpOverlay'); }
export function hideHelp() { hide('helpOverlay'); }
export function hidePeriodIntro() { hide('periodIntro'); }

// 紀元史詩:電影字幕與白光。
export function setEpic(on) {
  document.body.classList.toggle('epic', on);
  $('cinematic').classList.toggle('on', on);
}
export function showCinematic(title, caption) {
  $('epicChapter').textContent = '紀元史詩';
  $('epicTitle').textContent = title || '';
  const cap = $('epicCaption'); cap.textContent = caption || '';
  cap.style.display = caption ? '' : 'none';
  // 重播淡入動畫。
  const box = $('cineText'); box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
}
export function hideCinematic() { $('cinematic').classList.remove('on'); }
export function setFlash(op) { const f = $('flash'); f.style.opacity = op; }

// 高亮頂欄目前視角。
export function setActiveView(view) {
  $('navOverview').classList.toggle('active', view === 'overview');
  $('navWalk').classList.toggle('active', view === 'walk');
}
