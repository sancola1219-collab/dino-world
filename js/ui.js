// ui.js — 全部 DOM 介面。只反映狀態 + 發出回呼,不持有任何遊戲邏輯。
import { SPECIES, SPECIES_BY_ID, phaseOf } from './data.js';

const $ = (id) => document.getElementById(id);

export function initUI(handlers) {
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

  buildDex(handlers.onFocus);
}

function toggle(id) { $(id).classList.toggle('open'); }
function hide(id) { $(id).classList.remove('open'); }
function show(id) { $(id).classList.add('open'); }

// 建左側圖鑑清單。
function buildDex(onFocus) {
  const list = $('dexList');
  list.innerHTML = '';
  for (const sp of SPECIES) {
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

// 高亮頂欄目前視角。
export function setActiveView(view) {
  $('navOverview').classList.toggle('active', view === 'overview');
  $('navWalk').classList.toggle('active', view === 'walk');
}
