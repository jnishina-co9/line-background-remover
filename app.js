/* No imports or network requests: works directly from index.html. */
'use strict';

// Smooth color-distance key, followed by local green-fringe correction.
function removeColor(source, key, tolerance, softness, correction, width = 0) {
  const steps = removeColorSteps(source, key, tolerance, softness, correction, width);
  let step;
  do { step = steps.next(); } while (!step.done);
  return step.value;
}

// The worker runs these steps continuously. If workers are unavailable, the
// page yields between steps so clicks and cursor updates can still be handled.
function* removeColorSteps(source, key, tolerance, softness, correction, width = 0) {
  const out = new Uint8ClampedArray(source);
  const greenKey = key[1] - Math.max(key[0], key[2]) >= 30;
  for (let i = 0; i < out.length; i += 4) {
    if (i % 65536 === 0) yield;
    if (!source[i + 3]) continue;
    // Dark, neutral photo pixels can be close to a green key in RGB distance.
    // Keep them opaque unless the pixel itself contains a visible green cast.
    if (greenKey && source[i + 1] - Math.max(source[i], source[i + 2]) <= 10) continue;
    const distance = Math.hypot(source[i] - key[0], source[i + 1] - key[1], source[i + 2] - key[2]);
    const t = softness === 0 ? (distance <= tolerance ? 0 : 1) : Math.max(0, Math.min(1, (distance - tolerance) / softness));
    const alpha = t * t * (3 - 2 * t);
    out[i + 3] = Math.round(source[i + 3] * alpha);
    if (alpha === 0) { out[i] = out[i + 1] = out[i + 2] = 0; continue; }
    if (alpha < 1 && correction > 0) {
      for (let c = 0; c < 3; c++) {
        const clean = Math.max(0, Math.min(255, (source[i + c] - key[c] * (1 - alpha)) / alpha));
        out[i + c] = source[i + c] + (clean - source[i + c]) * correction;
      }
    }
  }
  return yield* correctGreenEdgeSteps(out, key, correction, width, source);
}

// Recover edge color from the original pixels, before the distance key changes
// their color. Fit C = alpha * foreground + (1 - alpha) * background using a
// nearby clean foreground sample. Color distance alone is not coverage.
function* correctGreenEdgeSteps(pixels, key, correction, width, source = pixels) {
  if (correction <= 0 || !Number.isInteger(width) || width <= 0 ||
      pixels.length % (width * 4) !== 0 || key[1] - Math.max(key[0], key[2]) < 30) return pixels;
  const height = pixels.length / (width * 4);
  const out = new Uint8ClampedArray(pixels);
  const strength = Math.min(1, correction);
  const edgeRadius = 8, referenceRadius = 12;
  let hasKeyBackground = false;
  for (let i = 0; i < source.length; i += 4) {
    if (i % 65536 === 0) yield;
    // JPEG compression shifts a flat backdrop by several RGB values.
    if (source[i + 3] >= 240 && Math.hypot(source[i] - key[0], source[i + 1] - key[1], source[i + 2] - key[2]) <= 30) {
      hasKeyBackground = true;
      break;
    }
  }
  // A bounded distance map also reaches pale fringes wider than three pixels.
  // It is computed once; corrected pixels never become new reference samples.
  const distance = new Uint8Array(width * height).fill(edgeRadius + 1);
  for (let p = 0; p < distance.length; p++) {
    if (p % 16384 === 0) yield;
    if (pixels[p * 4 + 3] <= 16) distance[p] = 0;
  }
  for (let y = 0; y < height; y++) {
    if (y % 32 === 0) yield;
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (x > 0) distance[p] = Math.min(distance[p], distance[p - 1] + 1);
      if (y > 0) {
        distance[p] = Math.min(distance[p], distance[p - width] + 1);
        if (x > 0) distance[p] = Math.min(distance[p], distance[p - width - 1] + 1);
        if (x + 1 < width) distance[p] = Math.min(distance[p], distance[p - width + 1] + 1);
      }
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    if (y % 32 === 0) yield;
    for (let x = width - 1; x >= 0; x--) {
      const p = y * width + x;
      if (x + 1 < width) distance[p] = Math.min(distance[p], distance[p + 1] + 1);
      if (y + 1 < height) {
        distance[p] = Math.min(distance[p], distance[p + width] + 1);
        if (x > 0) distance[p] = Math.min(distance[p], distance[p + width - 1] + 1);
        if (x + 1 < width) distance[p] = Math.min(distance[p], distance[p + width + 1] + 1);
      }
    }
  }
  // Index eligible reference pixels once, keeping exactly the original search
  // order and arithmetic. Each row can then skip ineligible pixels in one hop.
  const nextReference = new Int32Array(width * height);
  const referenceLength = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    if (y % 32 === 0) yield;
    let next = width;
    for (let x = width - 1; x >= 0; x--) {
      const p = y * width + x, j = p * 4;
      if (source[j + 3] >= 240 && pixels[j + 3] >= 240 &&
          source[j + 1] - Math.max(source[j], source[j + 2]) <= 1) {
        const dr = source[j] - key[0], dg = source[j + 1] - key[1], db = source[j + 2] - key[2];
        referenceLength[p] = dr * dr + dg * dg + db * db;
        if (referenceLength[p] > 0) next = x;
      }
      nextReference[p] = next;
    }
  }
  for (let y = 0; y < height; y++) {
    if (y % 2 === 0) yield;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!source[i + 3] || distance[y * width + x] > edgeRadius ||
          source[i + 1] - Math.max(source[i], source[i + 2]) <= 1) continue;
      let best = -1, bestScore = Infinity, bestAlpha = 1;
      const r = source[i], g = source[i + 1], b = source[i + 2];
      const kr = key[0], kg = key[1], kb = key[2];
      const minX = Math.max(0, x - referenceRadius), maxX = Math.min(width - 1, x + referenceRadius);
      for (let ny = Math.max(0, y - referenceRadius); ny <= Math.min(height - 1, y + referenceRadius); ny++) {
        const row = ny * width;
        for (let nx = nextReference[row + minX]; nx <= maxX;
             nx = nx + 1 < width ? nextReference[row + nx + 1] : width) {
          const p = row + nx, j = p * 4;
          const dr = source[j] - kr, dg = source[j + 1] - kg, db = source[j + 2] - kb;
          const dot = (r - kr) * dr + (g - kg) * dg + (b - kb) * db;
          const alpha = Math.max(0, Math.min(1, dot / referenceLength[p]));
          const error = (r - (kr + alpha * dr)) ** 2 +
            (g - (kg + alpha * dg)) ** 2 + (b - (kb + alpha * db)) ** 2;
          // Reject unrelated colors rather than recoloring every green edge.
          if (error > 24 ** 2) continue;
          const score = error + 0.25 * ((nx - x) ** 2 + (ny - y) ** 2);
          if (score < bestScore) { bestScore = score; best = j; bestAlpha = alpha; }
        }
      }
      if (best < 0) continue;
      for (let c = 0; c < 3; c++) {
        out[i + c] = pixels[i + c] + (source[best + c] - pixels[i + c]) * strength;
      }
      // Transparent PNGs may already have their matte: clean their color without
      // applying coverage a second time. Opaque green-screen inputs need both.
      const alpha = source[i + 3] * (hasKeyBackground ? bestAlpha : 1);
      out[i + 3] = pixels[i + 3] + (alpha - pixels[i + 3]) * strength;
      if (!out[i + 3]) out[i] = out[i + 1] = out[i + 2] = 0;
    }
  }
  return out;
}

function removalWorkerScript() {
  return `${removeColor.toString()}\n${removeColorSteps.toString()}\n${correctGreenEdgeSteps.toString()}\n
    self.onmessage = ({ data }) => {
      const pixels = removeColor(data.source, data.key, 80, 100, 1, data.width);
      self.postMessage(pixels, [pixels.buffer]);
    };`;
}

function startRemovalTask(source, key, width, onResult, onError) {
  let worker = null, workerUrl = null, timer = null, stopped = false, usingFallback = false;
  function disposeWorker() {
    if (worker) { worker.terminate(); worker = null; }
    if (workerUrl) { URL.revokeObjectURL(workerUrl); workerUrl = null; }
  }
  function cancel() {
    stopped = true;
    clearTimeout(timer);
    disposeWorker();
  }
  function complete(pixels) {
    if (stopped) return;
    cancel();
    onResult(pixels);
  }
  function fallback() {
    if (stopped || usingFallback) return;
    usingFallback = true;
    disposeWorker();
    const steps = removeColorSteps(source, key, 80, 100, 1, width);
    function tick() {
      if (stopped) return;
      try {
        const until = performance.now() + 8;
        do {
          const step = steps.next();
          if (step.done) { complete(step.value); return; }
        } while (performance.now() < until);
        timer = setTimeout(tick, 0);
      } catch (error) {
        cancel();
        onError(error);
      }
    }
    timer = setTimeout(tick, 0);
  }
  try {
    workerUrl = URL.createObjectURL(new Blob([removalWorkerScript()], { type: 'text/javascript' }));
    worker = new Worker(workerUrl);
    worker.onmessage = e => complete(e.data);
    worker.onerror = e => { e.preventDefault(); fallback(); };
    worker.onmessageerror = fallback;
    // Copy the source into the worker: the original canvas data stays available
    // for the color picker while processing. The result buffer is transferred.
    worker.postMessage({ source, key, width });
  } catch (error) {
    fallback();
  }
  return { cancel };
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const original = $('original'), result = $('result');
  const uploadPreview = $('upload-preview');
  const previewWrap = $('upload-preview-wrap');
  let previewUrl = null;
  previewWrap.addEventListener('click', e => e.stopPropagation());
  const ctx = original.getContext('2d', { willReadFrequently: true });
  const resultCtx = result.getContext('2d');
  let source = null, name = '', generation = 0, timer = null, revision = 0;
  let task = null, requestedKey = null, completedKey = null;
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const hex = values => '#' + values.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  function setColor(value) { $('color').value = value; $('hex').value = value.toUpperCase(); }
  function cancelRemoval() {
    clearTimeout(timer);
    if (task) { task.cancel(); task = null; }
    requestedKey = null;
  }
  function schedule() {
    const value = $('hex').value.toUpperCase();
    if (source && value === requestedKey) return;
    cancelRemoval();
    revision++;
    $('save').disabled = true;
    $('reset-top').hidden = true;
    if (!source) return;
    if (!/^#[\da-f]{6}$/i.test(value)) {
      $('status').textContent = '色コードは #00B900 のように # と6桁の英数字で入力してください。';
      return;
    }
    // Clicking the same uniform background needs no second identical run.
    if (value === completedKey) {
      $('save').disabled = false;
      $('reset-top').hidden = false;
      $('status').textContent = '背景を除去しました。透過PNGで保存できます。';
      return;
    }
    requestedKey = value;
    const token = revision, input = source;
    $('status').textContent = '背景を除去しています…';
    timer = setTimeout(() => {
      function failed(error) {
        if (token !== revision) return;
        task = null;
        requestedKey = null;
        $('status').textContent = '画像の処理に失敗しました。大きすぎる画像は縮小して、もう一度選択してください。';
        console.error(error);
      }
      task = startRemovalTask(input.data, rgb(value), input.width, pixels => {
        if (token !== revision) return;
        try {
          resultCtx.putImageData(new ImageData(pixels, input.width, input.height), 0, 0);
          task = null;
          requestedKey = null;
          completedKey = value;
          result.dataset.loaded = 'true';
          $('result-preview-panel').hidden = false;
          $('save').disabled = false;
          $('reset-top').hidden = false;
          $('status').textContent = '背景を除去しました。透過PNGで保存できます。';
        } catch (error) { failed(error); }
      }, failed);
    }, 100);
  }
  function estimateColor(data, width, height) {
    const samples = [];
    for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 240) samples.push(Array.from(data.slice(i, i + 3)));
    }
    if (!samples.length) return null;
    // Select the corner that agrees most closely with the other corners.
    return samples.reduce((best, sample) => {
      const score = value => samples.reduce((sum, s) => sum + Math.hypot(...s.map((v, c) => v - value[c])), 0);
      return score(sample) < score(best) ? sample : best;
    });
  }
  async function load(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const token = ++generation;
    cancelRemoval();
    completedKey = null;
    revision++;
    source = null;
    $('save').disabled = true;
    $('reset-top').hidden = true;
    $('original-preview-panel').hidden = true;
    $('original-status').textContent = '';
    $('result-preview-panel').hidden = true;
    delete original.dataset.loaded;
    delete result.dataset.loaded;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    previewUrl = url;
    uploadPreview.src = url;
    previewWrap.hidden = false;
    $('status').textContent = '画像を読み込んでいます…';
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (token !== generation) return;
      original.width = result.width = image.naturalWidth;
      original.height = result.height = image.naturalHeight;
      ctx.drawImage(image, 0, 0);
      source = ctx.getImageData(0, 0, original.width, original.height);
      name = file.name.replace(/\.[^.]+$/, '');
      original.dataset.loaded = 'true';
      $('original-preview-panel').hidden = false;
      $('original-status').textContent = '画像をクリックして背景色を取得してください。';
      const estimated = estimateColor(source.data, source.width, source.height);
      if (estimated) setColor(hex(estimated));
      schedule();
    } catch (error) {
      if (token !== generation) return;
      source = null;
      $('status').textContent = '画像を読み込めませんでした。ブラウザで表示できる画像か確認してください。';
      console.error(error);
    }
  }
  function handleFiles(files) {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    load(imageFiles[0]);
  }
  $('file').addEventListener('change', e => { handleFiles(e.target.files); e.target.value = ''; });
  const dropzone = $('dropzone');
  dropzone.addEventListener('click', () => $('file').click());
  $('file').addEventListener('click', e => e.stopPropagation());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragging'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
  dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('dragging'); handleFiles(e.dataTransfer.files); });
  original.addEventListener('click', e => {
    if (!source) return;
    const rect = original.getBoundingClientRect();
    const x = Math.max(0, Math.min(source.width - 1, Math.floor((e.clientX - rect.left) * source.width / rect.width)));
    const y = Math.max(0, Math.min(source.height - 1, Math.floor((e.clientY - rect.top) * source.height / rect.height)));
    const i = (y * source.width + x) * 4;
    if (!source.data[i + 3]) { $('status').textContent = 'すでに透明な場所です。色のある背景部分を選んでください。'; return; }
    setColor(hex(Array.from(source.data.slice(i, i + 3))));
    schedule();
  });
  $('color').addEventListener('input', e => { setColor(e.target.value); schedule(); });
  $('hex').addEventListener('input', e => {
    if (/^#[\da-f]{6}$/i.test(e.target.value)) $('color').value = e.target.value;
    schedule();
  });
  $('preview-bg').addEventListener('change', e => { $('result-wrap').className = 'canvas-wrap ' + e.target.value; });
  $('save').addEventListener('click', () => {
    if (!source || $('save').disabled) return;
    const savedName = name, savedRevision = revision;
    $('save').disabled = true;
    result.toBlob(blob => {
      if (savedRevision !== revision) return;
      $('save').disabled = false;
      if (!blob) { $('status').textContent = 'PNGの作成に失敗しました。画像を縮小してやり直してください。'; return; }
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = savedName + '_nobg.png';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      $('status').textContent = '保存を開始しました。ブラウザのダウンロード先を確認してください。';
    }, 'image/png');
  });
  $('reset-top').addEventListener('click', () => {
    generation++;
    revision++;
    cancelRemoval();
    source = null;
    completedKey = null;
    $('file').value = '';
    $('save').disabled = true;
    $('reset-top').hidden = true;
    $('original-preview-panel').hidden = true;
    $('result-preview-panel').hidden = true;
    $('original-status').textContent = '';
    $('status').textContent = '';
    delete original.dataset.loaded;
    delete result.dataset.loaded;
    original.width = result.width = 0;
    original.height = result.height = 0;
    previewWrap.hidden = true;
    uploadPreview.removeAttribute('src');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    setColor('#00FF00');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  if (window.lucide) window.lucide.createIcons();
}

