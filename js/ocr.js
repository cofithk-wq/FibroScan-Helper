/**
 * OCR + PDF text extraction for FibroScan reports.
 * Prefer CAP MEAN (dB/m) and E MEDIAN (kPa) = LSM.
 * Never invents values — returns null when not confirmed.
 */
(function (global) {
  const EMPTY_FIELDS = () => ({
    lsm: null,       // E (kPa) MEDIAN = Liver Stiffness
    cap: null,       // CAP (dB/m) MEAN
    capSd: null,
    iqr: null,
    iqrMedian: null, // fraction 0–1, or parsed from %
    probeType: null,
    validMeasurements: null,
    successRate: null,
    alt: null,
    otherNotes: [],
    rawText: '',
    source: null
  });

  function toNum(s) {
    if (s == null) return null;
    const n = parseFloat(String(s).replace(/,/g, '').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function parseReportText(text) {
    const fields = EMPTY_FIELDS();
    fields.rawText = text || '';
    if (!text || !String(text).trim()) return fields;

    const t = String(text).replace(/\u00a0/g, ' ');

    // --- E (kPa) MEDIAN = LSM ---
    // Real FibroScan UI shows: E (kPa) / MEDIAN / large number
    const ePatterns = [
      /E\s*\(\s*kPa\s*\)[^\d]{0,40}MEDIAN[^\d]{0,20}([0-9]+(?:[.,][0-9]+)?)/i,
      /MEDIAN[^\d]{0,20}([0-9]+(?:[.,][0-9]+)?)\s*kPa/i,
      /E\s*\(\s*kPa\s*\)[^\d]{0,30}([0-9]+(?:[.,][0-9]+)?)/i,
      /(?:^|\n)\s*E\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*kPa/im,
      /Liver\s*Stiffness\s*(?:Measurement)?\s*\(?\s*LSM\s*\)?\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*kPa/i,
      /(?:E\s*)?Median(?:\s*Liver\s*Stiffness)?\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*kPa/i,
      /(?:^|\n)\s*LSM\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*kPa/im,
      /Stiffness\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*kPa/i,
      /肝臟硬度[^0-9]{0,20}([0-9]+(?:[.,][0-9]+)?)\s*kPa/i
    ];
    for (const p of ePatterns) {
      const m = t.match(p);
      if (m) {
        const n = toNum(m[1].replace(',', '.'));
        if (n != null && n >= 1 && n <= 75) {
          fields.lsm = n;
          break;
        }
      }
    }
    // Last resort: first plausible kPa if labeled near E/MEDIAN elsewhere failed
    if (fields.lsm == null) {
      const loose = t.match(/([0-9]+(?:[.,][0-9]+)?)\s*kPa/i);
      if (loose) {
        const n = toNum(loose[1].replace(',', '.'));
        if (n != null && n >= 1 && n <= 75) fields.lsm = n;
      }
    }

    // --- CAP MEAN (dB/m) ---
    const capPatterns = [
      /CAP\s*\(\s*dB\s*\/?\s*m\s*\)[^\d]{0,40}MEAN[^\d]{0,20}([0-9]{2,3}(?:[.,][0-9]+)?)/i,
      /MEAN[^\d]{0,20}([0-9]{2,3}(?:[.,][0-9]+)?)\s*(?:dB\s*\/?\s*m)?/i,
      /Controlled\s*Attenuation\s*Parameter\s*\(?\s*CAP\s*\)?\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:dB\s*\/?\s*m|dB\/m)/i,
      /CAP\s*\(\s*dB\s*\/?\s*m\s*\)[^\d]{0,30}([0-9]{2,3}(?:[.,][0-9]+)?)/i,
      /(?:^|\n)\s*CAP\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:dB\s*\/?\s*m|dB\/m)?/im,
      /CAP[^0-9]{0,12}([0-9]{2,3}(?:[.,][0-9]+)?)/i,
      /([0-9]{2,3}(?:[.,][0-9]+)?)\s*dB\s*\/?\s*m/i
    ];
    for (const p of capPatterns) {
      const m = t.match(p);
      if (m) {
        const n = toNum(m[1].replace(',', '.'));
        if (n != null && n >= 100 && n <= 400) {
          fields.cap = Math.round(n);
          break;
        }
      }
    }

    // CAP SD
    const capSd = t.match(/\bSD\b\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)/i);
    if (capSd) {
      const n = toNum(capSd[1].replace(',', '.'));
      if (n != null && n >= 0 && n <= 80) fields.capSd = Math.round(n);
    }

    // IQR (absolute)
    const iqrOnly = t.match(/\bIQR\b(?!\s*\/)\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(kPa)?/i);
    if (iqrOnly) {
      const n = toNum(iqrOnly[1].replace(',', '.'));
      if (n != null && n < 50) fields.iqr = n;
    }

    // IQR/Med — report often shows "17 %"
    const iqrMed = t.match(/IQR\s*\/\s*(?:Median|Med)\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*%?/i)
      || t.match(/IQR\s*\/\s*M\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)/i);
    if (iqrMed) {
      let n = toNum(iqrMed[1].replace(',', '.'));
      if (n != null) {
        if (n > 1 && n <= 100) n = n / 100;
        if (n >= 0 && n <= 1) fields.iqrMedian = Math.round(n * 1000) / 1000;
      }
    }

    const probe = t.match(/Probe(?:\s*Type)?\s*[:：]?\s*(M|XL|S|S\+|M\+|XL\+)/i)
      || t.match(/\b(XL|M|S)\+?\s*probe\b/i);
    if (probe) fields.probeType = probe[1].toUpperCase();

    const valid = t.match(/(?:Valid(?:ated)?\s*)?(?:Measurements|measures|shots)\s*[:：]?\s*([0-9]{1,3})\s*(?:\/\s*([0-9]{1,3}))?/i)
      || t.match(/([0-9]{1,2})\s*valid/i);
    if (valid) fields.validMeasurements = valid[1] + (valid[2] ? ` / ${valid[2]}` : '');

    const sr = t.match(/Success(?:\s*Rate)?\s*[:：]?\s*([0-9]{1,3}(?:[.,][0-9]+)?)\s*%/i);
    if (sr) fields.successRate = toNum(sr[1].replace(',', '.'));

    const alt = t.match(/\bALT\b\s*[:：]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(U\/L|IU\/L)?/i);
    if (alt) fields.alt = toNum(alt[1].replace(',', '.'));

    return fields;
  }

  function imageToCanvas(img, maxSide = 2000) {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }

  async function ocrCanvas(canvas, onProgress) {
    if (!global.Tesseract) {
      throw new Error('Tesseract.js 尚未載入，請檢查網絡後重試，或改用手動輸入。');
    }
    const worker = await global.Tesseract.createWorker('eng+chi_tra', 1, {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(Math.round((m.progress || 0) * 100));
        }
      }
    });
    try {
      const { data } = await worker.recognize(canvas);
      return data.text || '';
    } finally {
      await worker.terminate();
    }
  }

  async function processImageFile(file, onProgress) {
    onProgress && onProgress(5, '讀取圖片…');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('無法讀取圖片'));
        i.src = url;
      });
      const canvas = imageToCanvas(img);
      onProgress && onProgress(15, 'OCR 辨識 CAP / E…');
      const text = await ocrCanvas(canvas, (p) => onProgress && onProgress(15 + Math.round(p * 0.8), 'OCR 辨識中…'));
      const fields = parseReportText(text);
      fields.source = 'image-ocr';
      onProgress && onProgress(100, '完成');
      return fields;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function processPdfFile(file, onProgress) {
    onProgress && onProgress(5, '讀取 PDF…');
    if (!global.pdfjsLib) {
      throw new Error('pdf.js 尚未載入，請檢查網絡後重試，或改用手動輸入。');
    }
    const buf = await file.arrayBuffer();
    const pdf = await global.pdfjsLib.getDocument({ data: buf }).promise;
    let combinedText = '';

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 3); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((it) => it.str).join(' ');
      combinedText += '\n' + pageText;
    }

    let fields = parseReportText(combinedText);
    if (fields.lsm != null || fields.cap != null) {
      fields.source = 'pdf-text';
      onProgress && onProgress(100, '完成（PDF 文字層）');
      fields.rawText = combinedText;
      return fields;
    }

    onProgress && onProgress(20, 'PDF 無文字層，改用 OCR…');
    let ocrText = '';
    const pagesToOcr = Math.min(pdf.numPages, 2);
    for (let pageNum = 1; pageNum <= pagesToOcr; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const base = 20 + ((pageNum - 1) / pagesToOcr) * 70;
      const pageText = await ocrCanvas(canvas, (p) => {
        onProgress && onProgress(base + (p / pagesToOcr) * 0.7, `OCR 第 ${pageNum} 頁…`);
      });
      ocrText += '\n' + pageText;
    }
    fields = parseReportText(ocrText || combinedText);
    fields.source = 'pdf-ocr';
    fields.rawText = (combinedText + '\n' + ocrText).trim();
    onProgress && onProgress(100, '完成');
    return fields;
  }

  async function processFile(file, onProgress) {
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return processPdfFile(file, onProgress);
    }
    return processImageFile(file, onProgress);
  }

  global.FibroOCR = {
    parseReportText,
    processFile,
    processImageFile,
    processPdfFile,
    EMPTY_FIELDS
  };
})(window);
