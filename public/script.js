
// Sound & Vibration Trigger
function playFX(type) {
  if (navigator.vibrate) {
    if (type === 'click') navigator.vibrate(40);
    if (type === 'number') navigator.vibrate([30, 50, 30]);
    if (type === 'bingo') navigator.vibrate([100, 50, 100, 50, 200]);
  }

  const sound = document.getElementById(`sound-${type}`);
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => console.log('Audio playback waiting for interaction'));
  }
}

// Live Leaderboard Handler
socket.on('updateLeaderboard', (topPlayers) => {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;

  list.innerHTML = topPlayers.map((player, index) => `
    <div class="flex justify-between items-center bg-slate-700/50 p-2 rounded border border-slate-600/50">
      <span class="font-bold text-slate-300">
        ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`} ${player.name}
      </span>
      <span class="text-amber-400 font-bold">${player.wins} Wins</span>
    </div>
  `).join('');
});
