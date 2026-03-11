const mediaInput = document.getElementById('mediaInput');
const previewContainer = document.getElementById('previewContainer');
const aiScoreEl = document.getElementById('aiScore');
const realScoreEl = document.getElementById('realScore');
const verdictEl = document.getElementById('verdict');
const signalListEl = document.getElementById('signalList');

mediaInput.addEventListener('change', async () => {
  const file = mediaInput.files?.[0];
  if (!file) {
    return;
  }

  renderPreview(file);

  verdictEl.textContent = 'Analyzing...';
  verdictEl.className = 'verdict';
  signalListEl.innerHTML = '';

  const result = file.type.startsWith('image/')
    ? await analyzeImage(file)
    : await analyzeVideo(file);

  aiScoreEl.textContent = result.aiScore.toFixed(1);
  realScoreEl.textContent = result.realScore.toFixed(1);
  verdictEl.textContent = result.verdict;
  verdictEl.classList.add(result.aiScore >= result.realScore ? 'ai-likely' : 'real-likely');

  for (const signal of result.signals) {
    const li = document.createElement('li');
    li.textContent = signal;
    signalListEl.appendChild(li);
  }
});

function renderPreview(file) {
  previewContainer.innerHTML = '';
  const url = URL.createObjectURL(file);

  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Uploaded media preview';
    previewContainer.appendChild(img);
    return;
  }

  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.muted = true;
  previewContainer.appendChild(video);
}

async function analyzeImage(file) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = Math.min(512, img.width);
  canvas.height = Math.min(512, img.height);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const noiseSignal = estimateNoise(pixels);
  const saturationSignal = estimateSaturation(pixels);

  const width = img.width;
  const height = img.height;
  const megapixels = (width * height) / 1_000_000;

  let aiScore = 5;
  aiScore += normalizeSignal(noiseSignal, 0.05, 0.2) * 2.8;
  aiScore += normalizeSignal(1 - saturationSignal, 0.05, 0.6) * 1.8;
  aiScore += normalizeSignal(megapixels, 0.5, 1.5) * 0.8;

  if (file.name.toLowerCase().includes('generated') || file.name.toLowerCase().includes('ai')) {
    aiScore += 0.8;
  }

  aiScore = clamp(aiScore, 0, 10);
  const realScore = clamp(10 - aiScore, 0, 10);

  const signals = [
    `Resolution analyzed: ${width}x${height}`,
    `Noise pattern score: ${noiseSignal.toFixed(3)}`,
    `Color saturation score: ${saturationSignal.toFixed(3)}`,
  ];

  const verdict = aiScore >= realScore
    ? 'Likely AI-generated content.'
    : 'Likely real-world captured content.';

  return { aiScore, realScore, verdict, signals };
}

async function analyzeVideo(file) {
  const video = await loadVideo(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = Math.min(426, video.videoWidth || 426);
  canvas.height = Math.min(240, video.videoHeight || 240);

  const frameSamples = Math.min(6, Math.max(3, Math.floor((video.duration || 6) / 2)));
  const noiseScores = [];

  for (let i = 1; i <= frameSamples; i++) {
    const t = Math.min((video.duration || frameSamples) * (i / (frameSamples + 1)), (video.duration || 1) - 0.05);
    await seekTo(video, Math.max(0, t));
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    noiseScores.push(estimateNoise(pixels));
  }

  const avgNoise = noiseScores.reduce((a, b) => a + b, 0) / noiseScores.length;
  const temporalVariance = variance(noiseScores);

  let aiScore = 5;
  aiScore += normalizeSignal(avgNoise, 0.04, 0.16) * 2.2;
  aiScore += normalizeSignal(0.02 - temporalVariance, 0, 0.02) * 2.0;
  aiScore += normalizeSignal(file.size / 1_000_000, 1, 15) * 1.0;

  if (file.name.toLowerCase().includes('render') || file.name.toLowerCase().includes('synth')) {
    aiScore += 0.8;
  }

  aiScore = clamp(aiScore, 0, 10);
  const realScore = clamp(10 - aiScore, 0, 10);

  const verdict = aiScore >= realScore
    ? 'Likely AI-generated video.'
    : 'Likely real recorded video.';

  const signals = [
    `Frames sampled: ${frameSamples}`,
    `Average frame noise: ${avgNoise.toFixed(3)}`,
    `Temporal noise variance: ${temporalVariance.toExponential(2)}`,
  ];

  return { aiScore, realScore, verdict, signals };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function loadVideo(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => resolve(video);
    video.onerror = reject;
  });
}

function seekTo(video, time) {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}

function estimateNoise(data) {
  let totalDiff = 0;
  let count = 0;
  for (let i = 4; i < data.length; i += 4) {
    const lumNow = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    const lumPrev = 0.2126 * data[i - 4] + 0.7152 * data[i - 3] + 0.0722 * data[i - 2];
    totalDiff += Math.abs(lumNow - lumPrev);
    count++;
  }
  return (totalDiff / count) / 255;
}

function estimateSaturation(data) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    total += max === 0 ? 0 : (max - min) / max;
    count++;
  }
  return total / count;
}

function variance(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

function normalizeSignal(value, low, high) {
  if (value <= low) return 0;
  if (value >= high) return 1;
  return (value - low) / (high - low);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
