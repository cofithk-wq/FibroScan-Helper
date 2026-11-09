/**
 * Interpretation engine — maps LSM/CAP to 2026 reference only.
 */
(function (global) {
  const REF = () => global.FIBROSCAN_REF;

  function inRange(value, r) {
    if (r.maxExclusive != null && !(value < r.maxExclusive)) return false;
    if (r.max != null && r.inclusiveMax) {
      if (!(value <= r.max)) return false;
    } else if (r.max != null) {
      if (!(value <= r.max)) return false;
    }
    if (r.minExclusive != null && !(value > r.minExclusive)) return false;
    if (r.min != null && !(value >= r.min)) return false;
    // open-ended high: only minExclusive
    if (r.minExclusive != null && r.max == null && r.maxExclusive == null) {
      return value > r.minExclusive;
    }
    // open-ended low: only max or maxExclusive
    if ((r.max != null || r.maxExclusive != null) && r.min == null && r.minExclusive == null) {
      if (r.maxExclusive != null) return value < r.maxExclusive;
      return value <= r.max;
    }
    return true;
  }

  function matchRange(value, ranges) {
    for (const r of ranges) {
      if (inRange(value, r)) return r;
    }
    return null;
  }

  function formatRangeText(profile) {
    if (!profile || !profile.ranges) return '';
    return profile.ranges.map((r) => {
      let band = '';
      if (r.maxExclusive != null && r.minExclusive == null && r.min == null) {
        band = `< ${r.maxExclusive}`;
      } else if (r.max != null && r.minExclusive == null && r.min == null) {
        band = `≤ ${r.max}`;
      } else if (r.minExclusive != null && r.max != null) {
        band = `> ${r.minExclusive} – ${r.max}`;
      } else if (r.minExclusive != null && r.max == null) {
        band = `> ${r.minExclusive}`;
      } else if (r.min != null && r.max != null) {
        band = `${r.min} – ${r.max}`;
      } else if (r.min != null) {
        band = `≥ ${r.min}`;
      }
      return `${r.code}: ${band} kPa`;
    }).join('\n');
  }

  function formatCapRangeText() {
    const ranges = REF().steatosis.ranges;
    return ranges.map((r) => {
      let band = '';
      if (r.maxExclusive != null) band = `< ${r.maxExclusive}`;
      else if (r.min != null && r.max != null) band = `${r.min} – ${r.max}`;
      else if (r.min != null) band = `≥ ${r.min}`;
      return `${r.code} ${r.name}: ${band} dB/m`;
    }).join('\n');
  }

  /**
   * @param {'none'|'unknown'|'hbv'|'hcv'|'nafld'|'alcohol'} background
   * @param {'normal'|'elevated'|'unknown'|null} altStatus
   */
  function resolveFibrosisProfile(background, altStatus) {
    const f = REF().fibrosis;
    if (background === 'hbv') {
      if (altStatus === 'normal') return { profile: f.hbv_normal_alt, blocked: false };
      if (altStatus === 'elevated') return { profile: f.hbv_elevated_alt, blocked: false };
      return {
        profile: null,
        blocked: true,
        reason: 'Hepatitis B (HBV) 已選擇，但 Alanine Aminotransferase (ALT) 丙氨酸轉氨酶情況未明，不可假設為 Normal ALT，亦不可套用 HBV cut-off。'
      };
    }
    if (background === 'hcv') return { profile: f.hcv, blocked: false };
    if (background === 'nafld') return { profile: f.nafld, blocked: false };
    if (background === 'alcohol') return { profile: f.alcohol, blocked: false };
    // none / unknown — no F staging
    return { profile: null, blocked: false, noStaging: true, background };
  }

  function statusFromFibrosis(code, special) {
    if (special === 'undefined' || special === 'needs_confirm') return 'red';
    if (special === 'healthy_ok') return 'green';
    if (special === 'healthy_caution') return 'yellow';
    if (!code) return 'yellow';
    if (code === 'F0-F1') return 'green';
    if (code === 'F2') return 'yellow';
    if (code === 'F3' || code === 'F4') return 'red';
    return 'yellow';
  }

  function statusFromSteatosis(code) {
    if (!code) return 'yellow';
    if (code === 'S0') return 'green';
    if (code === 'S1' || code === 'S2') return 'yellow';
    if (code === 'S3') return 'red';
    return 'yellow';
  }

  const STATUS_LABEL = {
    green: { emoji: '🟢', text: '大致正常範圍' },
    yellow: { emoji: '🟡', text: '需要留意' },
    red: { emoji: '🔴', text: '需要儘快交由醫護解釋' }
  };

  function interpretLSM(lsm, background, altStatus) {
    const result = {
      value: lsm,
      unit: 'kPa',
      applicable: true,
      code: null,
      name: null,
      nameZh: null,
      status: 'yellow',
      statusLabel: STATUS_LABEL.yellow,
      referenceUsed: null,
      referenceRangesText: '',
      professional: '',
      simple: '',
      missing: [],
      considerations: [],
      special: null
    };

    if (lsm == null || Number.isNaN(Number(lsm))) {
      result.applicable = false;
      result.code = null;
      result.special = 'missing';
      result.status = 'yellow';
      result.statusLabel = STATUS_LABEL.yellow;
      result.professional = '未能確認 Liver Stiffness Measurement (LSM) 數值，無法按指定 reference 判讀。需要醫護人員進一步確認。';
      result.simple = '報告上的肝臟硬度數值未能確認，請核對原始報告或交由醫護人員處理。';
      result.missing.push('LSM');
      return result;
    }

    const v = Number(lsm);
    result.value = v;

    const resolved = resolveFibrosisProfile(background, altStatus);

    // Healthy / no known liver disease
    if (background === 'none') {
      const h = REF().healthy;
      result.referenceUsed = h.labelZh;
      result.referenceRangesText = `健康參考範圍：${h.min} – ${h.max} kPa\n（LSM ≥ ${h.cautionAt} kPa 需進一步檢查）`;
      result.considerations.push(h.note);
      result.considerations.push('沒有已知肝病時，本系統不會套用 F0–F4 staging，只對照健康參考範圍。');

      if (v >= h.min && v <= h.max) {
        result.special = 'healthy_ok';
        result.code = 'Healthy range';
        result.name = 'Within healthy individual range';
        result.nameZh = '落在沒有已知肝病之健康參考範圍';
        result.status = 'green';
        result.statusLabel = STATUS_LABEL.green;
        result.professional = `按照指定 reference，${v} kPa 落在健康個體（沒有已知肝病）參考範圍 ${h.min}–${h.max} kPa。此處不作 F0–F4 Fibrosis Assessment。`;
        result.simple = '肝臟硬度數值落在沒有已知肝病人士常見的參考範圍內。FibroScan 只是評估工具，仍須配合病歷及醫護人員判斷。';
      } else if (v >= h.cautionAt) {
        result.special = 'healthy_caution';
        result.code = '≥ 6 kPa';
        result.name = 'Outside healthy range — further investigation suggested';
        result.nameZh = '高於健康參考範圍 — 建議進一步檢查';
        result.status = 'yellow';
        result.statusLabel = STATUS_LABEL.yellow;
        result.professional = `按照指定 reference，${v} kPa ≥ ${h.cautionAt} kPa。表格註明：possible fibrotic liver or other abnormal liver condition is suggested which requires further investigation。不作 F-staging。`;
        result.simple = '肝臟硬度數值高於沒有已知肝病人士的常見參考範圍，結果提示需要留意，建議配合醫護人員進一步評估。';
      } else {
        // below 2.3
        result.special = 'healthy_low';
        result.code = '< 2.3 kPa';
        result.name = 'Below published healthy range lower bound';
        result.nameZh = '低於健康參考範圍下限';
        result.status = 'yellow';
        result.statusLabel = STATUS_LABEL.yellow;
        result.professional = `${v} kPa 低於表格列出的健康範圍下限 ${h.min} kPa。不自行補充 classification，建議醫護人員確認測量質素及臨床情況。`;
        result.simple = '數值低於健康參考範圍下限，需要醫護人員進一步確認，不要自行解釋為「一定正常」。';
      }
      return result;
    }

    // Unknown background
    if (background === 'unknown' || resolved.noStaging) {
      const h = REF().healthy;
      result.referenceUsed = '臨床背景未明 — 未套用疾病專屬 F-staging';
      result.referenceRangesText = `健康參考範圍（僅供方向）：${h.min}–${h.max} kPa\n（未選擇已知肝病時不作 F0–F4 判讀）`;
      result.special = 'needs_confirm';
      result.code = null;
      result.name = 'Clinical background unclear';
      result.nameZh = '臨床背景未明，需要醫護人員進一步確認';
      result.status = 'yellow';
      result.statusLabel = STATUS_LABEL.yellow;
      result.missing.push('已知肝臟情況');
      result.professional = `客人肝臟情況選擇「不清楚」。系統不會自行選擇 Hepatitis B / C、NAFLD 或酒精相關肝病的 cut-off。LSM = ${v} kPa 僅可對照健康範圍作方向參考（${h.min}–${h.max} kPa），Fibrosis Assessment 需由醫護人員決定適用 reference。`;
      result.simple = '由於未清楚客人是否有已知肝病，系統不會自行判斷肝纖維化分期。建議交由醫護人員按病歷選擇合適參考範圍再解釋。';
      if (v >= h.cautionAt) {
        result.considerations.push(`LSM ≥ ${h.cautionAt} kPa：表格對健康個體提示可能需要進一步檢查。`);
        result.status = 'red';
        result.statusLabel = STATUS_LABEL.red;
      }
      return result;
    }

    // HBV ALT unknown blocked
    if (resolved.blocked) {
      result.special = 'needs_confirm';
      result.referenceUsed = 'Hepatitis B (HBV) — ALT 未明（未套用 cut-off）';
      result.referenceRangesText =
        'Normal ALT：F0-F1 ≤6.0；F2 >6.0–9.0；F3 >9.0–12.0；F4 >12.0\n' +
        'Elevated ALT：F0-F1 ≤7.5；F2 >7.5–12.0；F3 >12.0–13.4；F4 >13.4';
      result.code = null;
      result.name = 'ALT status unknown';
      result.nameZh = 'ALT 情況未明，未能按指定 HBV reference 分類';
      result.status = 'red';
      result.statusLabel = STATUS_LABEL.red;
      result.missing.push('ALT 情況（Normal / Elevated）');
      result.professional = resolved.reason + ` 目前 LSM = ${v} kPa。請先確認 ALT 後再判讀，或交由醫護人員處理。`;
      result.simple = '乙型肝炎客人需要先知道 ALT 是正常還是升高，系統才可以安全使用對應參考範圍。現階段請交由醫護人員解釋。';
      result.considerations.push('不可假設 ALT 為 Normal。');
      return result;
    }

    const profile = resolved.profile;
    result.referenceUsed = profile.labelZh;
    result.referenceRangesText = formatRangeText(profile);
    if (profile.note) result.considerations.push(profile.note);

    // Alcohol gap
    if (profile.hasUndefinedGap) {
      const g = profile.undefinedGap;
      if (v >= g.min && v <= g.max) {
        result.special = 'undefined';
        result.code = null;
        result.name = 'Undefined in reference';
        result.nameZh = '未能按指定 reference 分類／需要醫護人員進一步確認';
        result.status = 'red';
        result.statusLabel = STATUS_LABEL.red;
        result.professional = `按照 Alcohol-related Liver Disease 指定 reference，F0–F1 為 < 5.9 kPa，F2 為 > 7.8 kPa。${v} kPa 落在 5.9–7.8 kPa 之間，表格未有定義 classification，系統不會自行補充。需要醫護人員進一步確認。`;
        result.simple = '這個肝臟硬度數值落在酒精相關肝病參考表沒有明確分類的區間，前線不應自行判斷分期，請交由醫護人員解釋。';
        result.considerations.push('Alcohol-related Liver Disease：5.9 ≤ LSM ≤ 7.8 kPa 為 undefined gap。');
        return result;
      }
    }

    const matched = matchRange(v, profile.ranges);
    if (!matched) {
      result.special = 'undefined';
      result.code = null;
      result.nameZh = '未能按指定 reference 分類／需要醫護人員進一步確認';
      result.status = 'red';
      result.statusLabel = STATUS_LABEL.red;
      result.professional = `${v} kPa 未能對應所選 reference 的既有區間。需要醫護人員進一步確認。`;
      result.simple = '數值未能按指定參考表分類，請交由醫護人員處理。';
      return result;
    }

    result.code = matched.code;
    result.name = matched.name;
    result.nameZh = matched.nameZh;
    result.status = statusFromFibrosis(matched.code);
    result.statusLabel = STATUS_LABEL[result.status];
    result.professional = `按照指定 reference（${profile.label}），${v} kPa 落在 ${matched.code} reference range（${matched.name}）。此為 Fibrosis Assessment / Reference Range，並非臨床確診。`;
    result.simple = `肝臟硬度（Liver Stiffness Measurement, LSM）可以協助評估肝纖維化（Liver Fibrosis）的可能程度。數值落在 ${matched.code} 參考範圍，結果提示需要${result.status === 'green' ? '按常規跟進' : '留意'}；醫護人員會按需要配合病歷及其他檢查一併評估。`;
    return result;
  }

  function interpretCAP(cap) {
    const result = {
      value: cap,
      unit: 'dB/m',
      code: null,
      name: null,
      nameZh: null,
      percent: null,
      status: 'yellow',
      statusLabel: STATUS_LABEL.yellow,
      referenceRangesText: formatCapRangeText(),
      professional: '',
      simple: ''
    };

    if (cap == null || Number.isNaN(Number(cap))) {
      result.professional = '未能確認 Controlled Attenuation Parameter (CAP) 數值，無法按指定 reference 判讀。需要醫護人員進一步確認。';
      result.simple = '肝臟脂肪相關數值未能確認，請核對原始報告。';
      return result;
    }

    const v = Number(cap);
    result.value = v;
    const matched = matchRange(v, REF().steatosis.ranges);
    if (!matched) {
      result.professional = `${v} dB/m 未能對應 CAP reference。需要醫護人員進一步確認。`;
      result.simple = 'CAP 數值未能分類，請交由醫護人員處理。';
      return result;
    }

    result.code = matched.code;
    result.name = matched.name;
    result.nameZh = matched.nameZh;
    result.percent = matched.percent;
    result.status = statusFromSteatosis(matched.code);
    result.statusLabel = STATUS_LABEL[result.status];
    result.professional =
      `Controlled Attenuation Parameter (CAP) 用作非侵入性評估 hepatic steatosis（肝脂肪變性 / 肝臟脂肪積聚）。` +
      `按照指定 reference，${v} dB/m 落在 ${matched.code}（${matched.name} / ${matched.nameZh}；約 ${matched.percent}）。\n\n` +
      `S0 <248 dB/m；S1 248–267；S2 268–279；S3 ≥280。`;
    result.simple =
      'CAP（受控衰減參數 / 肝臟脂肪量化指標）主要反映肝臟脂肪積聚程度。CAP 越高，一般代表肝臟脂肪積聚程度越高。';
    return result;
  }

  function buildTalkingPoints(lsmR, capR, background, altStatus) {
    const bgLabel = {
      none: '目前資料顯示客人沒有已知肝病',
      unknown: '目前尚未清楚客人是否有已知肝病',
      hbv: '目前資料顯示客人有 Hepatitis B (HBV) 乙型肝炎' + (altStatus === 'normal' ? '（ALT normal）' : altStatus === 'elevated' ? '（ALT elevated）' : '（ALT 情況未明）'),
      hcv: '目前資料顯示客人有 Hepatitis C (HCV) 丙型肝炎',
      nafld: '目前資料顯示客人有 NAFLD / MASLD 脂肪性肝病相關背景',
      alcohol: '目前資料顯示客人有 Alcohol-related Liver Disease 酒精相關肝病背景'
    }[background] || '';

    let capLine = '';
    if (capR.value == null || Number.isNaN(Number(capR.value))) {
      capLine = '第一個是 CAP（MEAN），主要反映肝臟脂肪積聚程度。這份報告未能確認 CAP，需要再核對。';
    } else {
      const grade = capR.code ? `${capR.code} range，即${capR.nameZh}` : '未能分類';
      capLine = `第一個是 CAP（MEAN），主要反映肝臟脂肪積聚程度。今次是 ${capR.value} dB/m，落在 ${grade}的參考範圍。`;
    }

    let lsmLine = '';
    if (lsmR.value == null || Number.isNaN(Number(lsmR.value))) {
      lsmLine = '第二個是 E（MEDIAN），即 Liver Stiffness Measurement (LSM) 肝臟硬度。這份報告未能確認這個數值，需要與醫護人員再核對。';
    } else if (lsmR.special === 'undefined' || lsmR.special === 'needs_confirm') {
      lsmLine = `第二個是 E（MEDIAN），即肝臟硬度（LSM）。今次是 ${lsmR.value} kPa。按照目前資料與指定參考表，這個數值未能直接完成安全分類／需要醫護人員進一步確認，會請醫護同事詳細解釋。`;
    } else if (background === 'none') {
      lsmLine = `第二個是 E（MEDIAN），即肝臟硬度（LSM）。今次是 ${lsmR.value} kPa，對照沒有已知肝病的健康參考範圍（2.3–5.9 kPa），${lsmR.status === 'green' ? '落在這個參考範圍內' : '高於常見健康參考範圍，所以有需要留意'}。`;
    } else {
      lsmLine = `第二個是 E（MEDIAN），即肝臟硬度（LSM）。今次是 ${lsmR.value} kPa，按照目前資料與使用的參考範圍，屬於 ${lsmR.code} range，所以這個數值${lsmR.status === 'green' ? '大致落在較低風險的參考範圍' : '有需要留意'}。`;
    }

    const tips = buildLifestyleTips(lsmR, capR);
    const tipLine = tips.talkLine || '';

    return (
      `FibroScan 報告主要看兩個數字：CAP 與 E。\n\n` +
      `${capLine}\n\n` +
      `${lsmLine}\n\n` +
      `（${bgLabel}。）\n\n` +
      (tipLine ? `${tipLine}\n\n` : '') +
      `不過 FibroScan 是一項評估工具，不能單靠這兩個數字診斷肝病。`
    );
  }

  /**
   * Lifestyle tips with icon keys for SVG cards.
   * icon: sugar | plate | walk | sleep | alcohol | clinic
   */
  function buildLifestyleTips(lsmR, capR) {
    const capHigh = capR && (capR.status === 'yellow' || capR.status === 'red');
    const capSevere = capR && capR.status === 'red';
    const eHigh = lsmR && (lsmR.status === 'yellow' || lsmR.status === 'red' || lsmR.special === 'healthy_caution');
    const eSevere = lsmR && lsmR.status === 'red';
    const bothOk = !capHigh && !eHigh && lsmR?.status === 'green' && capR?.status === 'green';

    // Core practical HK clinic tips
    const base = [
      { icon: 'sugar', text: '少喝含糖飲料與手搖飲；日常改為白開水或無糖茶。' },
      { icon: 'plate', text: '減少油炸及重油外賣；煮食多用蒸、煮、焗。' },
      { icon: 'plate', text: '每餐先吃蔬菜；主食可部分改為糙米或燕麥。' },
      { icon: 'walk', text: '每週累計至少 150 分鐘快走（可拆成每日 20–30 分鐘）。' },
      { icon: 'sleep', text: '避免夜宵；睡前 2–3 小時勿進食大餐。' },
      { icon: 'alcohol', text: '酒精：能停止最好；若仍飲用，請與醫護人員確認可接受限量，切勿空腹大量飲酒。' }
    ];

    let items = base.slice();
    let talkLine = '';

    if (capSevere || eSevere || (capHigh && eHigh)) {
      items.push({ icon: 'clinic', text: '請按診所安排覆查 FibroScan、肝功能（如 ALT）及其他跟進，不要自行停藥或改藥。' });
      talkLine = '日常可先做到：少甜飲、少油炸、每日快走，並按診所安排覆查。';
    } else if (capHigh) {
      items = [
        { icon: 'sugar', text: '優先減少含糖飲料、手搖飲與甜品；改白開水或無糖茶。' },
        { icon: 'plate', text: '少吃油炸、肥膩外賣與宵夜；多用蒸、煮、焗，每餐先吃蔬菜。' },
        { icon: 'plate', text: '主食可部分改為糙米／燕麥；減少精緻麵包與甜點。' },
        { icon: 'walk', text: '每週至少 150 分鐘快走（例如每日 20–30 分鐘）。' },
        { icon: 'alcohol', text: '限制酒精；能停則停。' },
        { icon: 'clinic', text: '按診所建議覆查 CAP／肝功能，評估生活調整是否足夠。' }
      ];
      talkLine = '脂肪相關數值需留意時，可先由少甜飲、少油炸、每日快走開始。';
    } else if (eHigh) {
      items = [
        { icon: 'plate', text: '保持均衡飲食：多蔬菜、適量蛋白質；減少油炸與含糖飲料。' },
        { icon: 'walk', text: '每週至少 150 分鐘快走或其他中等強度運動。' },
        { icon: 'sleep', text: '避免長期熬夜與夜宵；睡前 2–3 小時勿大吃。' },
        { icon: 'alcohol', text: '酒精：能停止最好；否則請與醫護人員確認限量。' },
        { icon: 'clinic', text: '按診所安排覆查 FibroScan（E／LSM）及肝功能，並遵循醫護人員建議。' }
      ];
      talkLine = '硬度相關數值需留意時，請配合健康飲食、規律運動，並按診所覆查。';
    } else {
      items = [
        { icon: 'plate', text: '維持均衡飲食：多蔬菜水果，少加工食品與過甜飲品。' },
        { icon: 'walk', text: '維持每週至少 150 分鐘快走或同等運動。' },
        { icon: 'sleep', text: '保持規律睡眠，避免經常夜宵。' },
        { icon: 'alcohol', text: '限制酒精；能少則少。' },
        { icon: 'clinic', text: '按診所建議定期檢查；有疑問可詢問醫護人員。' }
      ];
      talkLine = bothOk
        ? '目前可繼續保持少甜飲、規律運動與均衡飲食。'
        : '日常保持少甜飲、少油炸、規律快走，是穩妥的做法。';
    }

    return {
      title: '日常生活小建議',
      items,
      talkLine,
      note: '以上為一般生活習慣參考，並非處方；如有慢性病、懷孕或特別飲食限制，請遵循醫護人員意見。'
    };
  }

  function buildNextSteps(lsmR, capR, background, altStatus, extras) {
    const steps = [];
    if (lsmR.missing?.length || capR.value == null) {
      steps.push('核對原始報告上未能確認的欄位，必要時重新掃描或手動輸入。');
    }
    if (background === 'unknown') {
      steps.push('向醫護人員釐清客人已知肝臟情況後，再選擇適用 reference。');
    }
    if (background === 'hbv' && altStatus === 'unknown') {
      steps.push('先確認 ALT（Normal / Elevated）後再作 HBV Fibrosis Assessment。');
    }
    if (lsmR.special === 'undefined' || lsmR.status === 'red' || capR.status === 'red') {
      steps.push('安排／提示醫護人員盡快向客人解釋結果。');
    } else if (lsmR.status === 'yellow' || capR.status === 'yellow') {
      steps.push('結果提示需要留意，按診所流程交由醫護人員覆核並向客人說明。');
    } else {
      steps.push('可按診所流程完成基本說明；客人有疑問可轉介醫護人員。');
    }
    if (extras?.iqrMedian != null && Number(extras.iqrMedian) > 0.3) {
      steps.push('IQR/Median 偏高可能影響測量可靠性，建議醫護人員一併評估。');
    }
    steps.push('可一併分享「日常生活小建議」中的飲食／運動習慣提示。');
    return steps;
  }

  function buildWarnings() {
    return [
      '向前線說明時，使用「數值落在這個參考範圍」「結果提示需要留意」「建議配合醫護人員評估」。',
      '請勿說：「你有肝硬化」「你確診脂肪肝」「你的肝有問題」「你不用看醫生」「這個結果一定沒有問題」。',
      '如果不確定，標示「需要醫護人員進一步確認」，不要自行推測。'
    ];
  }

  global.FibroInterpret = {
    interpretLSM,
    interpretCAP,
    buildTalkingPoints,
    buildLifestyleTips,
    buildNextSteps,
    buildWarnings,
    formatCapRangeText,
    formatRangeText,
    STATUS_LABEL
  };
})(window);
