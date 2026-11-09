/**
 * Visual diagram helpers for 「簡單理解」— SVG/CSS only, no diagnosis language.
 */
(function (global) {
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Map value into 0–100% along a continuum with known min/max for display */
  function pctOnScale(value, min, max) {
    if (value == null || !Number.isFinite(Number(value))) return null;
    const v = Number(value);
    const p = ((v - min) / (max - min)) * 100;
    return Math.max(2, Math.min(98, p));
  }

  /**
   * Soft → stiff metaphor for E / LSM
   * Display scale 2–20 kPa for marker placement (visual only; not a cut-off).
   */
  function buildStiffnessDiagram(lsmR) {
    const v = lsmR.value;
    const markerPct = pctOnScale(v, 2, 20);
    const label = v == null ? '未能確認' : `${v} kPa`;
    const statusText = lsmR.statusLabel
      ? `${lsmR.statusLabel.emoji} ${lsmR.statusLabel.text}`
      : '';
    const codeLine = lsmR.code
      ? `參考範圍判讀：<strong>${esc(lsmR.code)}</strong>${lsmR.nameZh ? ` · ${esc(lsmR.nameZh)}` : ''}`
      : `參考範圍判讀：${esc(lsmR.nameZh || '需要醫護人員進一步確認')}`;

    return `
<div class="viz-block viz-e">
  <div class="viz-title">E (kPa) · Liver Stiffness 肝臟硬度</div>
  <p class="viz-lead">FibroScan 用輕微震動量度肝臟「有幾硬」。數值越高，一般代表肝組織較硬，可能與肝纖維化（Liver Fibrosis）程度有關。</p>

  <div class="viz-legend viz-legend-e" aria-hidden="true">
    <div class="legend-cell soft">
      <svg viewBox="0 0 64 64" width="44" height="44">
        <ellipse cx="32" cy="34" rx="22" ry="20" fill="#ffe8cc" stroke="#e67e22" stroke-width="2"/>
        <ellipse cx="32" cy="34" rx="14" ry="12" fill="#fff4e8" opacity="0.9"/>
        <path d="M18 30 Q32 22 46 30" fill="none" stroke="#e67e22" stroke-width="1.5" opacity="0.5"/>
      </svg>
      <div class="legend-label">較軟</div>
      <div class="legend-hint">數值較低</div>
    </div>
    <div class="legend-cell mid">
      <svg viewBox="0 0 64 64" width="44" height="44">
        <ellipse cx="32" cy="34" rx="20" ry="18" fill="#ffd19a" stroke="#e67e22" stroke-width="2.5"/>
        <path d="M20 28 L28 36 L36 26 L44 38" fill="none" stroke="#c46a12" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div class="legend-label">中等</div>
      <div class="legend-hint">需要留意</div>
    </div>
    <div class="legend-cell stiff">
      <svg viewBox="0 0 64 64" width="44" height="44">
        <rect x="14" y="16" width="36" height="36" rx="8" fill="#f0a35a" stroke="#b85c0a" stroke-width="3"/>
        <path d="M22 28 L42 28 M22 36 L42 36 M22 44 L42 44" stroke="#8a4200" stroke-width="2.5" opacity="0.7"/>
      </svg>
      <div class="legend-label">較硬</div>
      <div class="legend-hint">數值較高</div>
    </div>
  </div>

  <div class="viz-scale">
    <div class="scale-labels"><span>較軟</span><span>視覺參考尺（約 2–20 kPa）</span><span>較硬</span></div>
    <div class="scale-track e-track">
      <div class="scale-grad e-grad"></div>
      ${markerPct != null ? `<div class="scale-marker" style="left:${markerPct}%" title="${esc(label)}"><span class="pin"></span><span class="pin-label">${esc(label)}</span></div>` : ''}
    </div>
    <div class="scale-ticks"><span>2</span><span>6</span><span>10</span><span>15</span><span>20+</span></div>
  </div>

  <div class="viz-result-line">${codeLine}</div>
  <div class="viz-status${statusText ? '' : ' is-empty'}">${statusText ? esc(statusText) : '&nbsp;'}</div>
  <p class="viz-note">此圖幫助理解「軟→硬」概念。實際 Fibrosis Assessment 會按指定 2026 reference 及臨床背景解讀。</p>
  <p class="viz-text">${esc(lsmR.simple)}</p>
</div>`;
  }

  /**
   * Fat accumulation metaphor for CAP
   * Display scale 100–400 dB/m for marker (visual continuum).
   */
  function buildFatDiagram(capR) {
    const v = capR.value;
    const markerPct = pctOnScale(v, 100, 400);
    const label = v == null ? '未能確認' : `${v} dB/m`;
    const statusText = capR.statusLabel
      ? `${capR.statusLabel.emoji} ${capR.statusLabel.text}`
      : '';
    const codeLine = capR.code
      ? `參考範圍判讀：<strong>${esc(capR.code)}</strong> · ${esc(capR.nameZh || capR.name || '')}${capR.percent ? `（約 ${esc(capR.percent)}）` : ''}`
      : '參考範圍判讀：需要醫護人員進一步確認';

    return `
<div class="viz-block viz-cap">
  <div class="viz-title">CAP (dB/m) · 肝臟脂肪量化指標</div>
  <p class="viz-lead">CAP 反映肝臟脂肪積聚（Hepatic Steatosis）程度。數值越高，一般代表脂肪積聚較多。</p>

  <div class="viz-legend viz-legend-cap" aria-hidden="true">
    <div class="band s0">S0<br>&lt;248</div>
    <div class="band s1">S1<br>248–267</div>
    <div class="band s2">S2<br>268–279</div>
    <div class="band s3">S3<br>≥280</div>
  </div>

  <div class="viz-scale">
    <div class="scale-labels"><span>較少脂肪</span><span>視覺參考尺（約 100–400 dB/m）</span><span>較多脂肪</span></div>
    <div class="scale-track cap-track">
      <div class="scale-grad cap-grad"></div>
      ${markerPct != null ? `<div class="scale-marker" style="left:${markerPct}%" title="${esc(label)}"><span class="pin"></span><span class="pin-label">${esc(label)}</span></div>` : ''}
    </div>
    <div class="scale-ticks"><span>100</span><span>200</span><span>248</span><span>280</span><span>400</span></div>
  </div>

  <div class="viz-result-line">${codeLine}</div>
  <div class="viz-status${statusText ? '' : ' is-empty'}">${statusText ? esc(statusText) : '&nbsp;'}</div>
  <p class="viz-note">CAP 分段按指定 2026 reference（S0–S3）。圖示幫助理解「脂肪多少」的概念。</p>
  <p class="viz-text">${esc(capR.simple)}</p>
</div>`;
  }

  function buildSimpleUnderstanding(lsmR, capR) {
    return `
<div class="viz-wrap">
  <p class="viz-disclaimer">用圖幫助理解 CAP 與 E 兩個數字（按指定參考範圍說明）。</p>
  ${buildFatDiagram(capR)}
  ${buildStiffnessDiagram(lsmR)}
</div>`;
  }

  function buildWhatIsFibroScan() {
    const eSvg = `
<svg class="pr-svg pr-svg-e" viewBox="0 0 420 200" role="img" aria-label="E 肝臟硬度剪切波示意圖">
  <defs>
    <linearGradient id="eLiver" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff9a6b"/>
      <stop offset="55%" stop-color="#e67e22"/>
      <stop offset="100%" stop-color="#b85c0a"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="404" height="184" rx="16" fill="#fff8f1" stroke="#f0d2b0"/>
  <ellipse cx="250" cy="108" rx="120" ry="72" fill="#ffe8cc" opacity="0.45"/>
  <path d="M170 62 C210 38 300 42 340 78 C364 104 358 148 320 166 C282 184 214 178 184 150 C154 122 148 88 170 62 Z" fill="url(#eLiver)" opacity="0.92"/>
  <g transform="translate(24,80)">
    <rect x="0" y="10" width="78" height="36" rx="11" fill="#1a3348"/>
    <rect x="68" y="16" width="28" height="24" rx="7" fill="#e67e22"/>
    <circle cx="96" cy="28" r="9" fill="#f0a35a" opacity="0.85"/>
  </g>
  <path d="M108 66 v-10 M118 62 v-14 M128 66 v-10" stroke="#e67e22" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M150 108 C190 88 230 88 270 108 C300 124 320 124 340 108" fill="none" stroke="#fff" stroke-width="3" opacity="0.9"/>
  <path d="M150 108 C190 128 230 128 270 108 C300 92 320 92 340 108" fill="none" stroke="#fff" stroke-width="3" opacity="0.55"/>
  <rect x="286" y="36" width="108" height="48" rx="10" fill="#fff" stroke="#e67e22" stroke-width="1.5"/>
  <text x="340" y="56" text-anchor="middle" font-size="11" font-weight="700" fill="#e67e22">剪切波波速</text>
  <text x="340" y="72" text-anchor="middle" font-size="11" fill="#c46a12">→ E (kPa)</text>
  <text x="250" y="180" text-anchor="middle" font-size="11" fill="#5a6b7c">組織較硬 → 波速較快 → kPa 較高</text>
</svg>`;

    return `
<div class="principle-wrap">
  <div class="pr-card pr-hero">
    <div class="pr-h">FibroScan 是什麼？</div>
    <p class="pr-p">FibroScan 是一種用於評估肝臟硬度及肝臟脂肪含量的<strong>無創評估工具</strong>。探頭輕放於右上腹皮膚，過程快速，無需肝組織活檢（liver biopsy）。</p>
    <figure class="pr-figure">
      <img class="pr-photo" src="assets/ref-cap-intro.png" alt="FibroScan CAP 檢測簡介：肝脂肪含量與肝臟硬度" loading="lazy" />
      <figcaption class="pr-caption">參考圖：同一檢查可評估肝臟脂肪含量（CAP）與肝臟硬度（E／LSM）。</figcaption>
    </figure>
    <div class="pr-outcome-row">
      <div class="pr-outcome cap">
        <span class="pr-outcome-k">肝臟脂肪含量</span>
        <span class="pr-outcome-v">CAP MEAN · dB/m</span>
      </div>
      <div class="pr-outcome e">
        <span class="pr-outcome-k">肝臟硬度</span>
        <span class="pr-outcome-v">E MEDIAN · kPa（LSM）</span>
      </div>
    </div>
    <p class="pr-tech">同一檢查可同時取得 CAP 與 E（VCTE／瞬時彈性成像 + CAP 受控衰減參數）。</p>
  </div>

  <div class="pr-card pr-cap">
    <div class="pr-h">原理①　CAP（dB/m）· 肝臟脂肪</div>
    <figure class="pr-figure">
      <img class="pr-photo" src="assets/ref-cap-anatomy.png" alt="CAP 量度原理：探頭與肝組織樣本區" loading="lazy" />
      <figcaption class="pr-caption">參考圖：探頭經肋間量度約 3 cm³ 肝組織樣本區，用作 CAP 脂肪評估參考。</figcaption>
    </figure>
    <p class="pr-p">超音波通過肝組織時會衰減；脂肪積聚較多時，衰減訊號通常較高，儀器以 <strong>CAP MEAN（dB/m）</strong> 表示，用作肝臟脂肪含量的參考指標。</p>
  </div>

  <div class="pr-card pr-e">
    <div class="pr-h">原理②　E / LSM（kPa）· 肝臟硬度</div>
    <div class="pr-art" aria-hidden="true">${eSvg}</div>
    <p class="pr-p">探頭發出輕微震動，產生剪切波（shear wave）通過肝臟；儀器量度波速並換算為 <strong>E（kPa）</strong>＝LSM 肝臟硬度。組織較硬 → 波速較快 → kPa 較高。</p>
    <div class="pr-soft-stiff" aria-hidden="true">
      <div class="pr-meta soft"><span class="dot"></span>較軟 · 數值較低</div>
      <div class="pr-meta mid"><span class="dot"></span>中等</div>
      <div class="pr-meta stiff"><span class="dot"></span>較硬 · 數值較高</div>
    </div>
  </div>

  <div class="pr-card pr-duo-card">
    <div class="pr-h">前線核對的兩個數字</div>
    <div class="pr-duo">
      <div class="pr-num cap"><strong>CAP (dB/m)</strong><span>MEAN · 肝臟脂肪</span></div>
      <div class="pr-num e"><strong>E (kPa)</strong><span>MEDIAN · LSM 肝臟硬度</span></div>
    </div>
  </div>
</div>`;
  }

  const LIFE_ICONS = {
    sugar: `<svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true"><rect x="22" y="10" width="20" height="40" rx="6" fill="#e8f3fb" stroke="#1a6fb5" stroke-width="2"/><path d="M26 22h12M26 30h12M26 38h8" stroke="#1a6fb5" stroke-width="2" stroke-linecap="round"/><circle cx="42" cy="18" r="8" fill="#ff6b6b" opacity="0.9"/><path d="M38 18h8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    plate: `<svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true"><circle cx="32" cy="34" r="20" fill="#e8f7ee" stroke="#1f8a4c" stroke-width="2"/><circle cx="32" cy="34" r="14" fill="#fff" stroke="#1f8a4c" stroke-width="1.5"/><path d="M24 30c4-6 12-6 16 0" fill="#7ab56e"/><circle cx="28" cy="38" r="4" fill="#e67e22"/><circle cx="38" cy="36" r="3.5" fill="#c0392b"/></svg>`,
    walk: `<svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true"><circle cx="36" cy="14" r="6" fill="#e67e22"/><path d="M34 22 L28 34 L20 48 M28 34 L40 32 L48 46 M34 22 L42 28" fill="none" stroke="#e67e22" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 52h40" stroke="#d9e3ec" stroke-width="2"/></svg>`,
    sleep: `<svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true"><path d="M10 40h44v8H10z" fill="#1a3348"/><path d="M14 40c0-12 10-20 22-18 2 8 10 12 18 12v6H14z" fill="#5a6b7c"/><circle cx="46" cy="16" r="5" fill="#f1c40f"/><path d="M42 10h4M40 16h-4M42 22h4" stroke="#f1c40f" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    alcohol: `<svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true"><path d="M24 12h16l-2 10c2 4 2 8 0 14l-2 16H28l-2-16c-2-6-2-10 0-14z" fill="#e8f3fb" stroke="#1a6fb5" stroke-width="2"/><path d="M26 28h12" stroke="#1a6fb5" stroke-width="2"/><circle cx="48" cy="20" r="9" fill="#ff6b6b"/><path d="M44 20h8M48 16v8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    clinic: `<svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true"><rect x="12" y="18" width="40" height="34" rx="4" fill="#e8f3fb" stroke="#1a6fb5" stroke-width="2"/><path d="M28 18v-6h8v6" stroke="#1a6fb5" stroke-width="2"/><path d="M30 32h4v10h-4zM26 36h12v4H26z" fill="#c0392b"/><rect x="18" y="44" width="8" height="8" fill="#1a6fb5" opacity="0.35"/><rect x="38" y="44" width="8" height="8" fill="#1a6fb5" opacity="0.35"/></svg>`
  };

  function lifestyleIconSvg(key) {
    return LIFE_ICONS[key] || LIFE_ICONS.plate;
  }

  function buildLifestyleCardsHtml(tips) {
    if (!tips || !tips.items) return '';
    const cards = tips.items.map((it) => {
      const icon = typeof it === 'string' ? 'plate' : (it.icon || 'plate');
      const text = typeof it === 'string' ? it : it.text;
      return `<div class="life-card"><div class="life-icon">${lifestyleIconSvg(icon)}</div><div class="life-text">${esc(text)}</div></div>`;
    }).join('');
    return `<div class="life-grid">${cards}</div><p class="lifestyle-note">${esc(tips.note || '')}</p>`;
  }

  global.FibroDiagrams = {
    buildSimpleUnderstanding,
    buildStiffnessDiagram,
    buildFatDiagram,
    buildWhatIsFibroScan,
    lifestyleIconSvg,
    buildLifestyleCardsHtml
  };
})(window);
