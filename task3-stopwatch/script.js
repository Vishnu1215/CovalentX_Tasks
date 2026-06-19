// ── State ──────────────────────────────────────────
let startTime   = 0;
let elapsed     = 0;
let timerID     = null;
let running     = false;
let laps        = [];
let lastLapTime = 0;

// ── DOM ────────────────────────────────────────────
const timeMain  = document.getElementById('timeMain');
const timeMs    = document.getElementById('timeMs');
const startBtn  = document.getElementById('startBtn');
const lapBtn    = document.getElementById('lapBtn');
const resetBtn  = document.getElementById('resetBtn');
const lapsList  = document.getElementById('lapsList');
const lapsHeader= document.getElementById('lapsHeader');
const ringFill  = document.getElementById('ringFill');

// Inject SVG gradient
const svg = document.querySelector('.ring-svg');
const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
defs.innerHTML = `
  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#7c5cfc"/>
    <stop offset="100%" stop-color="#2dd4bf"/>
  </linearGradient>`;
svg.prepend(defs);
ringFill.setAttribute('stroke', 'url(#ringGradient)');

const CIRC = 603.19;
const RING_PERIOD = 60000; // full ring = 60 seconds

// ── Format helpers ─────────────────────────────────
function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function formatMs(ms) {
  return '.' + String(Math.floor((ms % 1000) / 10)).padStart(2,'0');
}

function formatFull(ms) {
  return formatTime(ms) + formatMs(ms);
}

// ── Tick ───────────────────────────────────────────
function tick() {
  elapsed = Date.now() - startTime;
  render();
}

function render() {
  timeMain.textContent = formatTime(elapsed);
  timeMs.textContent   = formatMs(elapsed);

  // Ring: fills every 60 seconds, resets
  const progress = (elapsed % RING_PERIOD) / RING_PERIOD;
  const offset   = CIRC - progress * CIRC;
  ringFill.style.strokeDashoffset = offset;
}

// ── Start / Pause ──────────────────────────────────
startBtn.addEventListener('click', () => {
  if (!running) {
    startTime = Date.now() - elapsed;
    timerID   = setInterval(tick, 30);
    running   = true;

    startBtn.textContent = 'Pause';
    startBtn.classList.add('running');
    lapBtn.disabled   = false;
    resetBtn.disabled = false;
  } else {
    clearInterval(timerID);
    running = false;

    startBtn.textContent = 'Resume';
    startBtn.classList.remove('running');
    lapBtn.disabled = true;
  }
});

// ── Lap ────────────────────────────────────────────
lapBtn.addEventListener('click', () => {
  if (!running) return;

  const lapTime  = elapsed - lastLapTime;
  lastLapTime    = elapsed;
  laps.unshift({ lapTime, total: elapsed }); // newest on top

  renderLaps();
});

function renderLaps() {
  if (laps.length === 0) {
    lapsHeader.style.display = 'none';
    lapsList.innerHTML = '';
    return;
  }

  lapsHeader.style.display = 'grid';

  // Find best & worst lap times (ignore if only 1 lap)
  const times   = laps.map(l => l.lapTime);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  lapsList.innerHTML = laps.map((lap, i) => {
    const lapNum = laps.length - i;
    let cls = '';
    if (laps.length > 1) {
      if (lap.lapTime === minTime) cls = 'best';
      else if (lap.lapTime === maxTime) cls = 'worst';
    }
    return `
      <li class="lap-item ${cls}">
        <span class="lap-num">Lap ${lapNum}</span>
        <span class="lap-time">${formatFull(lap.lapTime)}</span>
        <span class="lap-total">${formatFull(lap.total)}</span>
      </li>`;
  }).join('');
}

// ── Reset ──────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  clearInterval(timerID);
  running     = false;
  elapsed     = 0;
  lastLapTime = 0;
  laps        = [];

  startBtn.textContent  = 'Start';
  startBtn.classList.remove('running');
  lapBtn.disabled   = true;
  resetBtn.disabled = true;

  timeMain.textContent = '00:00';
  timeMs.textContent   = '.00';
  ringFill.style.strokeDashoffset = CIRC;

  renderLaps();
});
