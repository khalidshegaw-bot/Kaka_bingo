const socket = io();

// Store telegram user data
let telegramUser = null;
if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
  telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
}

socket.emit('init_user', telegramUser);

let lastBallLabel = null;

// Initialize Web Audio on first user tap
document.addEventListener('click', () => { if (window.audioEngine) window.audioEngine.init(); }, { once: true });
document.addEventListener('touchstart', () => { if (window.audioEngine) window.audioEngine.init(); }, { once: true });

socket.on('user_balance_sync', (balance) => {
  const balEl = document.getElementById('user-balance');
  if (balEl) balEl.innerText = `${balance} ETB`;
});

socket.on('game_state_update', (data) => {
  const timerEl = document.getElementById('timer');
  const phaseEl = document.getElementById('game-phase');
  const derashEl = document.getElementById('derash-pool');
  const currentBallEl = document.getElementById('current-ball');
  const soldCountEl = document.getElementById('cards-sold');
  const playersCountEl = document.getElementById('players-count');

  if (timerEl) timerEl.innerText = data.timer;
  if (phaseEl) phaseEl.innerText = data.phase;
  if (derashEl) derashEl.innerText = `${data.derash} ETB`;
  if (soldCountEl) soldCountEl.innerText = data.soldCount;
  if (playersCountEl) playersCountEl.innerText = data.playersCount;

  if (data.currentBall) {
    if (currentBallEl) currentBallEl.innerText = data.currentBall.label;
    
    // Trigger Sound & Voice Announcer on new ball draw
    if (data.currentBall.label !== lastBallLabel) {
      lastBallLabel = data.currentBall.label;
      if (window.audioEngine) {
        window.audioEngine.playBallDrawnChime();
        setTimeout(() => window.audioEngine.announceBall(data.currentBall.label), 200);
      }
    }
  }
});

socket.on('card_purchased', (data) => {
  if (window.audioEngine) window.audioEngine.playSelectChime();
  // Render purchased card UI if applicable
});

socket.on('game_winner', (winner) => {
  if (window.audioEngine) window.audioEngine.playWinFanfare();
  alert(`🏆 BINGO! Winner: ${winner.winnerName}\nCard #${winner.cardNum}\nPrize: ${winner.prize} ETB`);
});

socket.on('error_msg', (msg) => {
  alert(msg);
});
