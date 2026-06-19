// ── State ──────────────────────────────────────────
let board       = Array(9).fill(null);
let currentPlayer = 'X';
let gameOver    = false;
let mode        = 'pvp'; // 'pvp' | 'ai'
let scores      = { X: 0, O: 0, Draw: 0 };

const WIN_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6]          // diags
];

// ── DOM ────────────────────────────────────────────
const cells       = document.querySelectorAll('.cell');
const statusEl    = document.getElementById('status');
const xScoreEl    = document.getElementById('xScore');
const oScoreEl    = document.getElementById('oScore');
const drawScoreEl = document.getElementById('drawScore');
const scoreXBox   = document.getElementById('scoreX');
const scoreOBox   = document.getElementById('scoreO');
const oLabel      = document.getElementById('oLabel');
const overlay     = document.getElementById('overlay');
const overlayTitle= document.getElementById('overlayTitle');
const overlayEmoji= document.getElementById('overlayEmoji');
const modeBtns    = document.querySelectorAll('.mode-btn');

// ── Mode toggle ────────────────────────────────────
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    oLabel.textContent = mode === 'ai' ? 'AI' : 'Player O';
    resetGame();
  });
});

// ── Cell click ─────────────────────────────────────
cells.forEach(cell => {
  cell.addEventListener('click', () => {
    const i = parseInt(cell.dataset.index);
    if (gameOver || board[i]) return;
    if (mode === 'ai' && currentPlayer === 'O') return;
    makeMove(i);
  });
});

// ── Make a move ────────────────────────────────────
function makeMove(index) {
  board[index] = currentPlayer;
  renderCell(index);

  const result = checkResult();
  if (result) { endGame(result); return; }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatus();

  if (mode === 'ai' && currentPlayer === 'O' && !gameOver) {
    setTimeout(aiMove, 420);
  }
}

// ── Render a cell ──────────────────────────────────
function renderCell(index) {
  const cell = cells[index];
  cell.textContent = board[index];
  cell.classList.add(board[index].toLowerCase(), 'taken', 'pop');
}

// ── Check win / draw ───────────────────────────────
function checkResult() {
  for (const combo of WIN_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo };
    }
  }
  if (board.every(cell => cell)) return { winner: null }; // draw
  return null;
}

// ── End the game ───────────────────────────────────
function endGame(result) {
  gameOver = true;

  if (result.winner) {
    result.combo.forEach(i => cells[i].classList.add('winner'));
    scores[result.winner]++;
    updateScoreboard();

    const name = mode === 'ai' && result.winner === 'O' ? 'AI' : `Player ${result.winner}`;
    statusEl.textContent = `${name} wins! 🎉`;
    statusEl.className = 'status win';

    overlayEmoji.textContent = result.winner === 'X' ? '🎉' : mode === 'ai' ? '🤖' : '🎊';
    overlayTitle.textContent = `${name} Wins!`;
  } else {
    scores.Draw++;
    updateScoreboard();
    statusEl.textContent = "It's a draw!";
    statusEl.className = 'status draw';
    overlayEmoji.textContent = '🤝';
    overlayTitle.textContent = "It's a Draw!";
  }

  setTimeout(() => overlay.classList.remove('hidden'), 600);
}

// ── Update status text ─────────────────────────────
function updateStatus() {
  const isAI = mode === 'ai' && currentPlayer === 'O';
  statusEl.textContent = isAI ? 'AI is thinking...' : `Player ${currentPlayer}'s turn`;
  statusEl.className = `status ${currentPlayer.toLowerCase()}-turn`;

  scoreXBox.classList.toggle('active-x', currentPlayer === 'X');
  scoreOBox.classList.toggle('active-o', currentPlayer === 'O');
}

// ── Update scoreboard ──────────────────────────────
function updateScoreboard() {
  xScoreEl.textContent   = scores.X;
  oScoreEl.textContent   = scores.O;
  drawScoreEl.textContent = scores.Draw;
}

// ── Reset game (keep scores) ───────────────────────
function resetGame() {
  board = Array(9).fill(null);
  currentPlayer = 'X';
  gameOver = false;
  overlay.classList.add('hidden');

  cells.forEach(cell => {
    cell.textContent = '';
    cell.className = 'cell';
  });

  scoreXBox.classList.remove('active-x');
  scoreOBox.classList.remove('active-o');
  updateStatus();
}

// ── Clear scores ───────────────────────────────────
document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('clearBtn').addEventListener('click', () => {
  scores = { X: 0, O: 0, Draw: 0 };
  updateScoreboard();
  resetGame();
});
document.getElementById('overlayBtn').addEventListener('click', resetGame);

// ── AI: Minimax ────────────────────────────────────
function aiMove() {
  const index = getBestMove();
  makeMove(index);
}

function getBestMove() {
  // Try to win first, then block, then minimax
  let best = minimax(board, 'O', 0);
  return best.index;
}

function minimax(boardState, player, depth) {
  const result = checkResultFor(boardState);
  if (result === 'O') return { score:  10 - depth };
  if (result === 'X') return { score: -10 + depth };
  if (boardState.every(c => c)) return { score: 0 };

  const moves = [];
  for (let i = 0; i < 9; i++) {
    if (boardState[i]) continue;
    const newBoard = [...boardState];
    newBoard[i] = player;
    const score = minimax(newBoard, player === 'O' ? 'X' : 'O', depth + 1).score;
    moves.push({ index: i, score });
  }

  if (player === 'O') {
    return moves.reduce((best, m) => m.score > best.score ? m : best, { score: -Infinity });
  } else {
    return moves.reduce((best, m) => m.score < best.score ? m : best, { score:  Infinity });
  }
}

function checkResultFor(b) {
  for (const [a, bi, c] of WIN_COMBOS) {
    if (b[a] && b[a] === b[bi] && b[a] === b[c]) return b[a];
  }
  return null;
}

// ── Init ───────────────────────────────────────────
updateStatus();
