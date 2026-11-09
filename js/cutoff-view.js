/**
 * In-app Fibroscan Interpretation Cut-off Table_2026 (HTML).
 */
(function (global) {
  function buildCutoffHtml() {
    return `
<div class="cutoff-panel">
  <h3 class="cutoff-h">Interpretation of Liver Stiffness in kPa</h3>
  <p class="cutoff-note">健康個體（沒有已知肝病）參考範圍：<strong>2.3 – 5.9 kPa</strong>＊</p>
  <div class="table-scroll">
    <table class="cutoff-table">
      <thead>
        <tr>
          <th rowspan="2">臨床背景</th>
          <th>No – Probable Minimal Fibrosis<br>(F0–F1)</th>
          <th>Borderline Fibrosis<br>(F2)</th>
          <th>Probable Advanced Fibrosis<br>(F3)</th>
          <th>Probable Cirrhosis<br>(F4)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Hepatitis B — Normal ALT</td>
          <td>≤ 6.0</td>
          <td>&gt; 6.0 – 9.0</td>
          <td>&gt; 9.0 – 12.0</td>
          <td>&gt; 12.0</td>
        </tr>
        <tr>
          <td>Hepatitis B — Elevated ALT＾</td>
          <td>≤ 7.5</td>
          <td>&gt; 7.5 – 12.0</td>
          <td>&gt; 12.0 – 13.4</td>
          <td>&gt; 13.4</td>
        </tr>
        <tr>
          <td>Hepatitis C</td>
          <td>≤ 7.0</td>
          <td>&gt; 7.0 – 9.5</td>
          <td>&gt; 9.5 – 12.5</td>
          <td>&gt; 12.5</td>
        </tr>
        <tr>
          <td>NAFLD / MASLD</td>
          <td>≤ 5.8</td>
          <td>&gt; 5.8 – 9.6</td>
          <td>&gt; 9.6 – 11.5</td>
          <td>&gt; 11.5</td>
        </tr>
        <tr>
          <td>Alcoholic Liver Disease</td>
          <td>&lt; 5.9</td>
          <td>&gt; 7.8 <span class="muted-cell">（5.9–7.8 未定義）</span></td>
          <td>&gt; 11</td>
          <td>&gt; 19.5</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3 class="cutoff-h">Interpretation of Controlled Attenuation Parameter (CAP) in dB/m</h3>
  <div class="table-scroll">
    <table class="cutoff-table">
      <thead>
        <tr>
          <th>Liver Steatosis</th>
          <th>No – Minimal (S0)<br>&lt;10%</th>
          <th>Mild (S1)<br>10–33%</th>
          <th>Moderate (S2)<br>34–66%</th>
          <th>Severe (S3)<br>&gt;66%</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CAP (dB/m)</td>
          <td>&lt; 248</td>
          <td>248 – 267</td>
          <td>268 – 279</td>
          <td>≥ 280</td>
        </tr>
      </tbody>
    </table>
  </div>

  <ul class="cutoff-footnotes">
    <li>＊ Liver stiffness ≥ 6 kPa：表格提示可能需要進一步檢查。</li>
    <li>＾ ALT = Alanine aminotransferase。當 ALT &gt; 5× 正常上限時，LSM 可能高估肝纖維化嚴重程度。</li>
    <li>來源：Fibroscan Interpretation Cut-off Table_2026</li>
  </ul>

  <p class="cutoff-pdf">
    <a class="btn btn-secondary btn-block" href="assets/Fibroscan_Interpretation_Cut-off_Table_2026.pdf" target="_blank" rel="noopener">開啟 PDF 原件</a>
  </p>
</div>`;
  }

  global.FibroCutoffView = { buildCutoffHtml };
})(window);
