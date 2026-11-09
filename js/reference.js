/**
 * Fibroscan Interpretation Cut-off Table_2026 — ONLY source of cut-offs.
 * Do not invent or mix other ranges.
 */
window.FIBROSCAN_REF = {
  version: '2026',
  sourceName: 'Fibroscan Interpretation Cut-off Table_2026',

  healthy: {
    label: 'Healthy individual without liver disease',
    labelZh: '沒有已知肝病（健康參考範圍）',
    min: 2.3,
    max: 5.9,
    cautionAt: 6.0,
    note: 'For LSM ≥ 6 kPa, possible fibrotic liver or other abnormal liver condition is suggested which requires further investigation.'
  },

  /** Disease-specific F-staging. Boundaries match table inclusivity. */
  fibrosis: {
    hbv_normal_alt: {
      id: 'hbv_normal_alt',
      label: 'Hepatitis B (HBV) — Normal ALT',
      labelZh: 'Hepatitis B (HBV) 乙型肝炎 — Normal ALT',
      ranges: [
        { code: 'F0-F1', name: 'No – Probable Minimal Fibrosis', nameZh: '無至可能輕微肝纖維化', max: 6.0, inclusiveMax: true },
        { code: 'F2', name: 'Borderline Fibrosis', nameZh: '臨界肝纖維化', minExclusive: 6.0, max: 9.0, inclusiveMax: true },
        { code: 'F3', name: 'Probable Advanced Fibrosis', nameZh: '可能為進階肝纖維化', minExclusive: 9.0, max: 12.0, inclusiveMax: true },
        { code: 'F4', name: 'Probable Cirrhosis', nameZh: '可能為肝硬化（cirrhosis）參考範圍', minExclusive: 12.0 }
      ]
    },
    hbv_elevated_alt: {
      id: 'hbv_elevated_alt',
      label: 'Hepatitis B (HBV) — Elevated ALT',
      labelZh: 'Hepatitis B (HBV) 乙型肝炎 — Elevated ALT',
      note: 'LSM likely overestimates fibrosis severity when ALT > 5× ULN.',
      ranges: [
        { code: 'F0-F1', name: 'No – Probable Minimal Fibrosis', nameZh: '無至可能輕微肝纖維化', max: 7.5, inclusiveMax: true },
        { code: 'F2', name: 'Borderline Fibrosis', nameZh: '臨界肝纖維化', minExclusive: 7.5, max: 12.0, inclusiveMax: true },
        { code: 'F3', name: 'Probable Advanced Fibrosis', nameZh: '可能為進階肝纖維化', minExclusive: 12.0, max: 13.4, inclusiveMax: true },
        { code: 'F4', name: 'Probable Cirrhosis', nameZh: '可能為肝硬化（cirrhosis）參考範圍', minExclusive: 13.4 }
      ]
    },
    hcv: {
      id: 'hcv',
      label: 'Hepatitis C (HCV)',
      labelZh: 'Hepatitis C (HCV) 丙型肝炎',
      ranges: [
        { code: 'F0-F1', name: 'No – Probable Minimal Fibrosis', nameZh: '無至可能輕微肝纖維化', max: 7.0, inclusiveMax: true },
        { code: 'F2', name: 'Borderline Fibrosis', nameZh: '臨界肝纖維化', minExclusive: 7.0, max: 9.5, inclusiveMax: true },
        { code: 'F3', name: 'Probable Advanced Fibrosis', nameZh: '可能為進階肝纖維化', minExclusive: 9.5, max: 12.5, inclusiveMax: true },
        { code: 'F4', name: 'Probable Cirrhosis', nameZh: '可能為肝硬化（cirrhosis）參考範圍', minExclusive: 12.5 }
      ]
    },
    nafld: {
      id: 'nafld',
      label: 'NAFLD / MASLD',
      labelZh: 'NAFLD / MASLD 脂肪性肝病（採用 NAFLD row）',
      ranges: [
        { code: 'F0-F1', name: 'No – Probable Minimal Fibrosis', nameZh: '無至可能輕微肝纖維化', max: 5.8, inclusiveMax: true },
        { code: 'F2', name: 'Borderline Fibrosis', nameZh: '臨界肝纖維化', minExclusive: 5.8, max: 9.6, inclusiveMax: true },
        { code: 'F3', name: 'Probable Advanced Fibrosis', nameZh: '可能為進階肝纖維化', minExclusive: 9.6, max: 11.5, inclusiveMax: true },
        { code: 'F4', name: 'Probable Cirrhosis', nameZh: '可能為肝硬化（cirrhosis）參考範圍', minExclusive: 11.5 }
      ]
    },
    /**
     * Alcoholic Liver Disease from table:
     * F0-F1 < 5.9 | F2 > 7.8 | F3 > 11 | F4 > 19.5
     * Gap 5.9–7.8 inclusive is UNDEFINED.
     * Progressive mapping: >7.8 and ≤11 → F2; >11 and ≤19.5 → F3; >19.5 → F4
     */
    alcohol: {
      id: 'alcohol',
      label: 'Alcohol-related Liver Disease',
      labelZh: 'Alcohol-related Liver Disease 酒精相關肝病',
      hasUndefinedGap: true,
      undefinedGap: { min: 5.9, max: 7.8, inclusive: true },
      ranges: [
        { code: 'F0-F1', name: 'No – Probable Minimal Fibrosis', nameZh: '無至可能輕微肝纖維化', maxExclusive: 5.9 },
        { code: 'F2', name: 'Borderline Fibrosis', nameZh: '臨界肝纖維化', minExclusive: 7.8, max: 11, inclusiveMax: true },
        { code: 'F3', name: 'Probable Advanced Fibrosis', nameZh: '可能為進階肝纖維化', minExclusive: 11, max: 19.5, inclusiveMax: true },
        { code: 'F4', name: 'Probable Cirrhosis', nameZh: '可能為肝硬化（cirrhosis）參考範圍', minExclusive: 19.5 }
      ]
    }
  },

  steatosis: {
    label: 'Controlled Attenuation Parameter (CAP)',
    labelZh: '受控衰減參數 / 肝臟脂肪量化指標',
    ranges: [
      { code: 'S0', name: 'No – Minimal Steatosis', nameZh: '無至極輕微肝脂肪積聚', percent: '<10%', maxExclusive: 248 },
      { code: 'S1', name: 'Mild Steatosis', nameZh: '輕度肝脂肪積聚', percent: '10–33%', min: 248, max: 267, inclusiveMax: true },
      { code: 'S2', name: 'Moderate Steatosis', nameZh: '中度肝脂肪積聚', percent: '34–66%', min: 268, max: 279, inclusiveMax: true },
      { code: 'S3', name: 'Severe Steatosis', nameZh: '重度肝脂肪積聚', percent: '>66%', min: 280 }
    ]
  }
};
