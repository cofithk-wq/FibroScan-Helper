(function () {
  const state = {
    fields: {
      lsm: null,
      cap: null,
      capSd: null,
      iqr: null,
      iqrMedian: null,
      probeType: null,
      validMeasurements: null,
      successRate: null,
      alt: null,
      otherNotes: []
    },
    background: null,
    altStatus: null,
    confirmed: false,
    ocrRaw: ''
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function fillWhatIsFibroScan() {
    if (!window.FibroDiagrams || !FibroDiagrams.buildWhatIsFibroScan) return;
    const html = FibroDiagrams.buildWhatIsFibroScan();
    const home = $('#what-fibro-home');
    const result = $('#what-fibro-result');
    if (home && !home.dataset.filled) {
      home.innerHTML = html;
      home.dataset.filled = '1';
    }
    if (result && !result.dataset.filled) {
      result.innerHTML = html;
      result.dataset.filled = '1';
    }
  }

  function showScreen(id) {
    $$('.screen').forEach((el) => el.classList.remove('active'));
    const screen = $(`#screen-${id}`);
    if (screen) screen.classList.add('active');

    const bar = $('#bottom-bar');
    bar.classList.toggle('show', id === 'result');
    if (id === 'home' || id === 'result') fillWhatIsFibroScan();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function displayOrEmpty(v) {
    return v == null || v === '' ? '' : String(v);
  }

  function fieldDisplay(v) {
    return v == null || v === '' ? '未能確認' : String(v);
  }

  function parseOptionalNumber(str) {
    const s = String(str ?? '').trim();
    if (!s || s === '未能確認') return null;
    const n = parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  /** IQR/Med may be entered as 17 (% ) or 0.17 */
  function parseIqrMedian(str) {
    let n = parseOptionalNumber(str);
    if (n == null) return null;
    if (n > 1 && n <= 100) n = n / 100;
    if (n < 0 || n > 1) return null;
    return Math.round(n * 1000) / 1000;
  }

  function fillConfirmForm(fields) {
    $('#input-lsm').value = displayOrEmpty(fields.lsm);
    $('#input-cap').value = displayOrEmpty(fields.cap);
    $('#input-cap-sd').value = displayOrEmpty(fields.capSd);
    $('#input-iqr').value = displayOrEmpty(fields.iqr);
    // show as % if we have fraction
    if (fields.iqrMedian != null) {
      $('#input-iqr-median').value = String(Math.round(fields.iqrMedian * 1000) / 10); // e.g. 17
    } else {
      $('#input-iqr-median').value = '';
    }
    $('#input-probe').value = displayOrEmpty(fields.probeType);
    $('#input-valid').value = displayOrEmpty(fields.validMeasurements);
    $('#input-success').value = displayOrEmpty(fields.successRate);
    $('#input-alt-value').value = displayOrEmpty(fields.alt);
    $('#confirm-check').checked = false;
    $('#btn-confirm-continue').disabled = true;
  }

  function readConfirmForm() {
    return {
      lsm: parseOptionalNumber($('#input-lsm').value),
      cap: parseOptionalNumber($('#input-cap').value),
      capSd: parseOptionalNumber($('#input-cap-sd').value),
      iqr: parseOptionalNumber($('#input-iqr').value),
      iqrMedian: parseIqrMedian($('#input-iqr-median').value),
      probeType: ($('#input-probe').value || '').trim() || null,
      validMeasurements: ($('#input-valid').value || '').trim() || null,
      successRate: parseOptionalNumber($('#input-success').value),
      alt: parseOptionalNumber($('#input-alt-value').value),
      otherNotes: state.fields.otherNotes || []
    };
  }

  async function handleFile(file) {
    if (!file) return;
    showScreen('processing');
    $('#process-status').textContent = '準備擷取 CAP MEAN 與 E MEDIAN…';
    $('#process-bar').style.width = '0%';
    $('#process-error').classList.add('hidden');

    try {
      const fields = await FibroOCR.processFile(file, (pct, msg) => {
        $('#process-bar').style.width = `${pct}%`;
        if (msg) $('#process-status').textContent = msg;
      });
      state.fields = fields;
      state.ocrRaw = fields.rawText || '';
      state.confirmed = false;
      fillConfirmForm(fields);
      showScreen('confirm');
    } catch (err) {
      console.error(err);
      $('#process-error').textContent = (err && err.message) || '處理失敗';
      $('#process-error').classList.remove('hidden');
      $('#process-status').textContent = '無法完成自動擷取';
    }
  }

  function startManualEntry() {
    state.fields = FibroOCR.EMPTY_FIELDS();
    state.ocrRaw = '';
    state.confirmed = false;
    fillConfirmForm(state.fields);
    showScreen('confirm');
  }

  function onConfirmContinue() {
    if (!$('#confirm-check').checked) return;
    state.fields = readConfirmForm();
    state.confirmed = true;
    $$('input[name="background"]').forEach((r) => { r.checked = false; });
    $$('input[name="alt-status"]').forEach((r) => { r.checked = false; });
    $('#hbv-alt-block').classList.add('hidden');
    $('#btn-clinical-continue').disabled = true;
    showScreen('clinical');
  }

  function updateClinicalContinue() {
    const bg = $('input[name="background"]:checked');
    if (!bg) {
      $('#btn-clinical-continue').disabled = true;
      return;
    }
    if (bg.value === 'hbv') {
      $('#hbv-alt-block').classList.remove('hidden');
      const alt = $('input[name="alt-status"]:checked');
      $('#btn-clinical-continue').disabled = !alt;
    } else {
      $('#hbv-alt-block').classList.add('hidden');
      $('#btn-clinical-continue').disabled = false;
    }
  }

  function renderResult() {
    const bg = state.background;
    const alt = state.altStatus;
    const f = state.fields;

    const lsmR = FibroInterpret.interpretLSM(f.lsm, bg, alt);
    const capR = FibroInterpret.interpretCAP(f.cap);

    // CAP card (left / blue)
    $('#cap-value').innerHTML = f.cap == null
      ? `未能確認<span class="u">dB/m</span>`
      : `${f.cap}<span class="u">dB/m</span>`;
    $('#cap-sd-line').textContent = f.capSd != null ? `SD ${f.capSd}` : '';
    const capAssess = capR.code
      ? `<strong>Steatosis Grade:</strong> ${capR.code}<br>${capR.name}<br><span class="muted">${capR.nameZh}${capR.percent ? `（約 ${capR.percent}）` : ''}</span>`
      : `<strong>Steatosis Grade:</strong> 需要醫護人員進一步確認`;
    $('#cap-assess').innerHTML = capAssess;
    const capPill = $('#cap-pill');
    capPill.className = `pill ${capR.status}`;
    capPill.textContent = `${capR.statusLabel.emoji} ${capR.statusLabel.text}`;

    // E / LSM card (right / orange)
    $('#lsm-value').innerHTML = f.lsm == null
      ? `未能確認<span class="u">kPa</span>`
      : `${f.lsm}<span class="u">kPa</span>`;
    $('#iqr-med-line').textContent = f.iqrMedian != null
      ? `IQR/Med ${Math.round(f.iqrMedian * 100)} %`
      : '';
    const lsmAssess = lsmR.code
      ? `<strong>Fibrosis Assessment:</strong> ${lsmR.code}` +
        (lsmR.nameZh ? `<br><span class="muted">${lsmR.nameZh}</span>` : '')
      : `<strong>Fibrosis Assessment:</strong> ${lsmR.nameZh || '需要醫護人員進一步確認'}`;
    $('#lsm-assess').innerHTML = lsmAssess;
    $('#lsm-ref-used').innerHTML = `<strong>Reference Used:</strong> ${lsmR.referenceUsed || '—'}`;
    const lsmPill = $('#lsm-pill');
    lsmPill.className = `pill ${lsmR.status}`;
    lsmPill.textContent = `${lsmR.statusLabel.emoji} ${lsmR.statusLabel.text}`;

    $('#simple-body').innerHTML = (window.FibroDiagrams
      ? FibroDiagrams.buildSimpleUnderstanding(lsmR, capR)
      : `<p>【CAP】${capR.simple}</p><p>【E / LSM】${lsmR.simple}</p>`);

    $('#talk-body').textContent = FibroInterpret.buildTalkingPoints(lsmR, capR, bg, alt);

    const missing = [...(lsmR.missing || [])];
    if (f.lsm == null) missing.push('E (kPa) MEDIAN / LSM');
    if (f.cap == null) missing.push('CAP MEAN');
    const considerations = [...(lsmR.considerations || [])];
    if (f.iqrMedian != null && f.iqrMedian > 0.3) {
      considerations.push(`IQR/Med = ${Math.round(f.iqrMedian * 100)}%（>30% 可能影響可靠性，供醫護參考）。`);
    }
    if (bg === 'hbv' && alt === 'elevated') {
      considerations.push('Elevated ALT：LSM 可能高估肝纖維化嚴重程度（尤其 ALT > 5× ULN）。');
    }
    considerations.push('影響判讀的常見因素：急性肝炎、膽汁淤積、右心衰竭、近期進食、探頭選擇、操作技術等（非詳盡列表）。');
    considerations.push('報告標示 E (kPa) MEDIAN 即 Liver Stiffness Measurement (LSM)；CAP (dB/m) MEAN 用於 steatosis 評估。');

    $('#prof-body').innerHTML = `
<strong>Selected Clinical Reference</strong>
${lsmR.referenceUsed || '—'}

<strong>Fibrosis Reference Range</strong>
${lsmR.referenceRangesText || '（未套用疾病專屬 F-staging）'}

<strong>Steatosis Reference Range</strong>
${capR.referenceRangesText}

<strong>專業解讀（E / LSM）</strong>
${lsmR.professional}

<strong>專業解讀（CAP）</strong>
${capR.professional}

<strong>Relevant clinical considerations</strong>
${considerations.map((c) => '• ' + c).join('\n') || '• —'}

<strong>Missing information</strong>
${missing.length ? missing.map((m) => '• ' + m).join('\n') : '• 主要欄位已填寫（仍須核對原始報告）'}

<strong>Report extras</strong>
• CAP SD: ${fieldDisplay(f.capSd)}
• IQR: ${fieldDisplay(f.iqr)}${f.iqr != null ? ' kPa' : ''}
• IQR/Med: ${f.iqrMedian != null ? Math.round(f.iqrMedian * 100) + ' %' : '未能確認'}
• Probe Type: ${fieldDisplay(f.probeType)}
• Valid Measurements: ${fieldDisplay(f.validMeasurements)}
• Success Rate: ${fieldDisplay(f.successRate)}${f.successRate != null ? '%' : ''}
• ALT (報告上): ${fieldDisplay(f.alt)}
`.trim();

    const lifestyle = FibroInterpret.buildLifestyleTips(lsmR, capR);
    $('#lifestyle-body').innerHTML = window.FibroDiagrams && FibroDiagrams.buildLifestyleCardsHtml
      ? FibroDiagrams.buildLifestyleCardsHtml(lifestyle)
      : '<ul class="lifestyle-list">' + lifestyle.items.map((s) => `<li>${s.text || s}</li>`).join('') + '</ul>' +
        `<p class="lifestyle-note">${lifestyle.note}</p>`;

    const steps = FibroInterpret.buildNextSteps(lsmR, capR, bg, alt, f);
    $('#next-body').innerHTML = '<ul>' + steps.map((s) => `<li>${s}</li>`).join('') + '</ul>';
    $('#warn-body').innerHTML = '<ul>' + FibroInterpret.buildWarnings().map((s) => `<li>${s}</li>`).join('') + '</ul>';

    showScreen('result');
  }

  function onClinicalContinue() {
    const bg = $('input[name="background"]:checked');
    if (!bg) return;
    state.background = bg.value;
    if (state.background === 'hbv') {
      const alt = $('input[name="alt-status"]:checked');
      if (!alt) return;
      state.altStatus = alt.value;
    } else {
      state.altStatus = null;
    }
    renderResult();
  }

  function resetAll() {
    state.fields = FibroOCR.EMPTY_FIELDS();
    state.background = null;
    state.altStatus = null;
    state.confirmed = false;
    state.ocrRaw = '';
    $('#file-image').value = '';
    $('#file-camera').value = '';
    $('#file-pdf').value = '';
    showScreen('home');
  }


  function openCutoffModal() {
    const body = $('#cutoff-body');
    if (body && window.FibroCutoffView) {
      body.innerHTML = FibroCutoffView.buildCutoffHtml();
    }
    const modal = $('#cutoff-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeCutoffModal() {
    const modal = $('#cutoff-modal');
    if (modal) modal.classList.add('hidden');
  }

  function bind() {
    $('#btn-camera').addEventListener('click', () => $('#file-camera').click());
    $('#btn-image').addEventListener('click', () => $('#file-image').click());
    $('#btn-pdf').addEventListener('click', () => $('#file-pdf').click());
    $('#btn-manual').addEventListener('click', startManualEntry);

    $('#file-camera').addEventListener('change', (e) => handleFile(e.target.files?.[0]));
    $('#file-image').addEventListener('change', (e) => handleFile(e.target.files?.[0]));
    $('#file-pdf').addEventListener('change', (e) => handleFile(e.target.files?.[0]));

    $('#confirm-check').addEventListener('change', (e) => {
      $('#btn-confirm-continue').disabled = !e.target.checked;
    });
    $('#btn-confirm-continue').addEventListener('click', onConfirmContinue);
    $('#btn-confirm-back').addEventListener('click', () => showScreen('home'));

    $$('input[name="background"]').forEach((r) => r.addEventListener('change', updateClinicalContinue));
    $$('input[name="alt-status"]').forEach((r) => r.addEventListener('change', updateClinicalContinue));
    $('#btn-clinical-continue').addEventListener('click', onClinicalContinue);
    $('#btn-clinical-back').addEventListener('click', () => showScreen('confirm'));

    $('#btn-edit').addEventListener('click', () => {
      fillConfirmForm(state.fields);
      showScreen('confirm');
    });
    $('#btn-rescan').addEventListener('click', resetAll);
    $('#btn-done').addEventListener('click', () => showScreen('done'));
    $('#btn-home').addEventListener('click', resetAll);
    $('#btn-process-manual').addEventListener('click', startManualEntry);
    $('#btn-process-home').addEventListener('click', () => showScreen('home'));

    const cutoffBtns = ['btn-open-cutoff', 'btn-home-cutoff', 'btn-result-cutoff'];
    cutoffBtns.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', openCutoffModal);
    });
    const closeBtn = $('#btn-close-cutoff');
    if (closeBtn) closeBtn.addEventListener('click', closeCutoffModal);
    const backdrop = $('#cutoff-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeCutoffModal);
  }

  window.__fibroTest = function (lsm, cap, background, altStatus) {
    state.fields = Object.assign(FibroOCR.EMPTY_FIELDS(), { lsm, cap });
    state.background = background;
    state.altStatus = altStatus || null;
    state.confirmed = true;
    renderResult();
  };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    fillWhatIsFibroScan();
    showScreen('home');
  });
})();
