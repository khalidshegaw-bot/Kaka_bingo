const fs = require('fs');

const serverJs = `const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function generateGameId() {
  return '#' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

let currentGame = {
  gameId: generateGameId(),
  sold: [],
  playerPicks: {},
  status: 'open',
  timeLeft: 15,
  lastBall: 'I-19'
};

setInterval(() => {
  if (currentGame.timeLeft > 0) {
    currentGame.timeLeft--;
  } else {
    currentGame.gameId = generateGameId();
    currentGame.sold = [];
    currentGame.playerPicks = {};
    currentGame.timeLeft = 15;
  }
  io.emit('game_state', currentGame);
}, 1000);

io.on('connection', (socket) => {
  socket.emit('game_state', currentGame);

  socket.on('select_number', (number) => {
    number = Number(number);
    if (!Number.isInteger(number) || number < 1 || number > 96) return;
    if (currentGame.sold.includes(number)) return;

    if (!currentGame.playerPicks[socket.id]) {
      currentGame.playerPicks[socket.id] = [];
    }

    if (currentGame.playerPicks[socket.id].length >= 2) return;

    currentGame.sold.push(number);
    currentGame.playerPicks[socket.id].push(number);

    io.emit('game_state', currentGame);
  });
});

server.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`;

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kaka bingo</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0b111d; color: #fff; margin: 0; padding: 12px; }
    
    /* Header stats */
    .header-bar { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; align-items: center; }
    .card-box { background: #172033; border-radius: 10px; padding: 10px 6px; text-align: center; }
    .card-box.orange { background: #f59e0b; color: #000; font-weight: bold; }
    .card-title { font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; font-weight: 600; }
    .card-box.orange .card-title { color: #000; }
    .card-val { font-size: 14px; font-weight: bold; }
    .time-val { color: #ef4444; }
    .ball-badge { background: #f59e0b; color: #000; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; margin: 0 auto; }
    
    .toggle-row { display: flex; justify-content: flex-end; align-items: center; gap: 6px; font-size: 12px; color: #94a3b8; margin-bottom: 10px; }

    /* 8x12 Number Grid */
    .grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin-bottom: 15px; }
    .num-btn { background: #172033; color: #fff; border-radius: 8px; height: 38px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; cursor: pointer; }
    .num-btn.selected { background: #f59e0b; color: #000; }
    .num-btn.sold { background: #1e293b; color: #475569; cursor: not-allowed; }

    /* Selected cards footer */
    .footer-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card-slot { border: 1px dashed #334155; border-radius: 10px; height: 60px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 13px; font-weight: 500; background: #0f172a; }
    .card-slot.active { border: 1px solid #f59e0b; color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
  </style>
</head>
<body>

  <div class="header-bar">
    <div class="card-box orange">
      <div class="card-title">GAME ID</div>
      <div class="card-val" id="game-id">#MGGH7O</div>
    </div>
    <div class="card-box">
      <div class="card-title">SOLD</div>
      <div class="card-val" id="sold-count">0</div>
    </div>
    <div class="card-box">
      <div class="card-title">TIME</div>
      <div class="card-val time-val" id="timer">15s</div>
    </div>
    <div>
      <div class="ball-badge" id="last-ball">I-19</div>
    </div>
  </div>

  <div class="toggle-row">
    <span>Dark Mode</span>
    <input type="checkbox" checked disabled>
  </div>

  <div class="grid" id="bingo-grid"></div>

  <div class="footer-cards">
    <div class="card-slot" id="slot-1">Card #--</div>
    <div class="card-slot" id="slot-2">Card #--</div>
  </div>

  <script>
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    const socket = io();
    const grid = document.getElementById('bingo-grid');
    const gameIdEl = document.getElementById('game-id');
    const soldCountEl = document.getElementById('sold-count');
    const timerEl = document.getElementById('timer');
    const lastBallEl = document.getElementById('last-ball');
    const slot1 = document.getElementById('slot-1');
    const slot2 = document.getElementById('slot-2');

    for (let i = 1; i <= 96; i++) {
      const btn = document.createElement('div');
      btn.className = 'num-btn';
      btn.innerText = i;
      btn.dataset.number = i;
      btn.addEventListener('click', () => {
        socket.emit('select_number', i);
      });
      grid.appendChild(btn);
    }

    socket.on('game_state', (game) => {
      gameIdEl.textContent = game.gameId;
      soldCountEl.textContent = game.sold.length;
      timerEl.textContent = game.timeLeft + 's';
      lastBallEl.textContent = game.lastBall || 'I-19';

      const myPicks = game.playerPicks[socket.id] || [];

      // Update footer card slots
      if (myPicks[0]) {
        slot1.textContent = 'Card #' + myPicks[0];
        slot1.classList.add('active');
      } else {
        slot1.textContent = 'Card #--';
        slot1.classList.remove('active');
      }

      if (myPicks[1]) {
        slot2.textContent = 'Card #' + myPicks[1];
        slot2.classList.add('active');
      } else {
        slot2.textContent = 'Card #--';
        slot2.classList.remove('active');
      }

      // Update grid states
      document.querySelectorAll('.num-btn').forEach((btn) => {
        const number = Number(btn.dataset.number);
        btn.classList.remove('selected', 'sold');

        if (myPicks.includes(number)) {
          btn.classList.add('selected');
        } else if (game.sold.includes(number)) {
          btn.classList.add('sold');
        }
      });
    });
  </script>
</body>
</html>
`;

fs.writeFileSync('server.js', serverJs);
fs.writeFileSync('public/index.html', indexHtml);
console.log('UI updated successfully!');
