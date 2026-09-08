const fs = require('fs');

const serverJs = `const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let currentGame = {
  gameId: 1,
  sold: [],
  playerPicks: {}, // { socketId: [numbers] }
  status: 'open'
};

function newBingoGame() {
  currentGame = {
    gameId: currentGame.gameId + 1,
    sold: [],
    playerPicks: {},
    status: 'open'
  };
  io.emit('game_state', currentGame);
}

io.on('connection', (socket) => {
  socket.emit('game_state', currentGame);

  socket.on('select_number', (number) => {
    number = Number(number);
    if (!Number.isInteger(number) || number < 1 || number > 96) return;
    if (currentGame.status !== 'open') return;
    if (currentGame.sold.includes(number)) return;

    if (!currentGame.playerPicks[socket.id]) {
      currentGame.playerPicks[socket.id] = [];
    }

    currentGame.sold.push(number);
    currentGame.playerPicks[socket.id].push(number);

    io.emit('game_state', currentGame);
  });

  socket.on('reset_game', () => {
    newBingoGame();
  });

  socket.on('disconnect', () => {
    if (currentGame.playerPicks[socket.id]) {
      delete currentGame.playerPicks[socket.id];
    }
  });
});

server.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`;

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kaka Bingo</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    body { background: #0f172a; color: #fff; font-family: sans-serif; padding: 15px; margin: 0; text-align: center; }
    .header { display: flex; justify-content: space-around; background: #1e293b; padding: 10px; border-radius: 8px; margin-bottom: 15px; }
    .stat { font-size: 14px; }
    .stat span { font-weight: bold; color: #f59e0b; }
    .grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
    .num-btn { background: #334155; padding: 12px 0; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; }
    .num-btn.my-pick { background: #10b981; color: #fff; }
    .num-btn.sold { background: #ef4444; color: #fff; opacity: 0.6; cursor: not-allowed; }
    .reset-btn { margin-top: 15px; background: #f59e0b; color: #000; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <div class="stat">GAME ID: <span id="game-id">--</span></div>
    <div class="stat">SOLD: <span id="sold-count">0</span>/96</div>
  </div>

  <div class="grid" id="bingo-grid"></div>
  <button class="reset-btn" onclick="socket.emit('reset_game')">New Round</button>

  <script>
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    const socket = io();
    const grid = document.getElementById('bingo-grid');
    const gameIdEl = document.getElementById('game-id');
    const soldCountEl = document.getElementById('sold-count');

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

      const myPicks = game.playerPicks[socket.id] || [];

      document.querySelectorAll('.num-btn').forEach((btn) => {
        const number = Number(btn.dataset.number);
        btn.classList.remove('selected', 'my-pick', 'sold');

        if (myPicks.includes(number)) {
          btn.classList.add('my-pick');
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
console.log('Files updated successfully!');
