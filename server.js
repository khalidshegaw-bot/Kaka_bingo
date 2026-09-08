const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// ==========================================
// ⚙️ EASY BOT CONFIGURATION SETTINGS
// ==========================================
const BOT_CONFIG = {
  MIN_BOTS_PER_ROUND: 20,
  MAX_BOTS_PER_ROUND: 30,
  MIN_CARDS_PER_BOT: 1,
  MAX_CARDS_PER_BOT: 2,
  STARTING_BALANCE: 1000
};

const ADMIN_PASSWORD = 'Kaka_khalid';

const AI_BOTS = [
  { id: 'bot_101', name: 'Abebe', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_102', name: 'Kebede', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_103', name: 'Tigist', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_104', name: 'Mulugeta', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_105', name: 'Chala', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_106', name: 'Saba', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_107', name: 'Dawit', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_108', name: 'Helen', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_109', name: 'Yonas', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_110', name: 'Bethlehem', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_111', name: 'Solomon', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_112', name: 'Mahlet', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_113', name: 'Elias', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_114', name: 'Selam', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_115', name: 'Tewodros', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_116', name: 'Rahel', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_117', name: 'Kassahun', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_118', name: 'Meron', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_119', name: 'Getachew', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_120', name: 'Hana', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_121', name: 'Daniel', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_122', name: 'Eden', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_123', name: 'Biniyam', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_124', name: 'Frehiwot', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_125', name: 'Girma', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_126', name: 'Kidist', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_127', name: 'Ermias', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_128', name: 'Tsion', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_129', name: 'Henok', balance: BOT_CONFIG.STARTING_BALANCE },
  { id: 'bot_130', name: 'Alem', balance: BOT_CONFIG.STARTING_BALANCE }
];

const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ users: [] }).write();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 8080;
const TOKEN = process.env.TOKEN;
const WEB_APP_URL = 'https://colonialism-probable-gecko.abasthan.app';
const ADMIN_CHAT_ID = '5328605923';

const userStates = {};

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Admin Control REST APIs
app.get('/api/admin/stats', (req, res) => {
  const auth = req.headers['x-admin-pass'];
  if (auth !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  const totalUsers = db.get('users').value().length;
  res.json({
    activePlayers: Object.keys(gameState.players).length,
    totalRegisteredUsers: totalUsers,
    totalDerash: gameState.derash,
    totalHouseCommission: gameState.houseCommission,
    botConfig: BOT_CONFIG
  });
});

app.post('/api/admin/update-bots', (req, res) => {
  const auth = req.headers['x-admin-pass'];
  if (auth !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  const { minBots, maxBots, minCards, maxCards } = req.body;
  if (minBots !== undefined) BOT_CONFIG.MIN_BOTS_PER_ROUND = parseInt(minBots);
  if (maxBots !== undefined) BOT_CONFIG.MAX_BOTS_PER_ROUND = parseInt(maxBots);
  if (minCards !== undefined) BOT_CONFIG.MIN_CARDS_PER_BOT = parseInt(minCards);
  if (maxCards !== undefined) BOT_CONFIG.MAX_CARDS_PER_BOT = parseInt(maxCards);

  res.json({ success: true, newConfig: BOT_CONFIG });
});

// Database Helpers
const getOrCreateUser = (telegramId, phone = null, first_name = null) => {
  if (telegramId.startsWith('bot_')) {
    const botUser = AI_BOTS.find(b => b.id === telegramId);
    return { telegram_id: botUser.id, name: botUser.name, balance: botUser.balance, phone: '0900000000' };
  }

  let user = db.get('users').find({ telegram_id: String(telegramId) }).value();
  const displayName = first_name || `Player ${String(telegramId).slice(-4)}`;
  if (!user) {
    user = { telegram_id: String(telegramId), name: displayName, balance: 100, phone: phone };
    db.get('users').push(user).write();
  } else {
    let updates = {};
    if (phone && user.phone !== phone) updates.phone = phone;
    if (first_name && user.name !== first_name) updates.name = first_name;
    if (Object.keys(updates).length > 0) {
      db.get('users').find({ telegram_id: String(telegramId) }).assign(updates).write();
      Object.assign(user, updates);
    }
  }
  return user;
};

const updateUserBalance = (telegramId, amount) => {
  if (telegramId.startsWith('bot_')) {
    const botUser = AI_BOTS.find(b => b.id === telegramId);
    if (botUser) {
      botUser.balance = Math.max(0, botUser.balance + amount);
      return botUser.balance;
    }
    return 0;
  }

  let user = getOrCreateUser(telegramId);
  if (user) {
    const newBalance = Math.max(0, user.balance + amount);
    db.get('users').find({ telegram_id: String(telegramId) }).assign({ balance: newBalance }).write();
    io.emit('user_balance_sync_global', { telegramId: String(telegramId), balance: newBalance });
    return newBalance;
  }
  return 0;
};

// Game Logic Functions
function generateBingoCard(cardSeed) {
  let grid = Array(5).fill(null).map(() => Array(5).fill(0));
  for (let col = 0; col < 5; col++) {
    let min = col * 15 + 1;
    let pool = Array.from({ length: 15 }, (_, i) => min + i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (cardSeed * 13 + i * 7 + col * 3) % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (let row = 0; row < 5; row++) {
      grid[row][col] = pool[row];
    }
  }
  grid[2][2] = 'FREE';
  return grid;
}

function checkWinningCard(cardGrid, calledSet) {
  for (let r = 0; r < 5; r++) {
    let rowWin = true;
    let coords = [];
    for (let c = 0; c < 5; c++) {
      let val = cardGrid[r][c];
      coords.push([r, c]);
      if (val !== 'FREE' && !calledSet.has(val)) { rowWin = false; break; }
    }
    if (rowWin) return { patternName: `HORIZONTAL LINE (ROW ${r + 1})`, winCells: coords };
  }

  for (let c = 0; c < 5; c++) {
    let colWin = true;
    let coords = [];
    for (let r = 0; r < 5; r++) {
      let val = cardGrid[r][c];
      coords.push([r, c]);
      if (val !== 'FREE' && !calledSet.has(val)) { colWin = false; break; }
    }
    if (colWin) return { patternName: `VERTICAL LINE (COL ${['B','I','N','G','O'][c]})`, winCells: coords };
  }

  let diag1 = true, diag2 = true;
  let d1Coords = [], d2Coords = [];
  for (let i = 0; i < 5; i++) {
    let v1 = cardGrid[i][i];
    d1Coords.push([i, i]);
    if (v1 !== 'FREE' && !calledSet.has(v1)) diag1 = false;

    let v2 = cardGrid[i][4 - i];
    d2Coords.push([i, 4 - i]);
    if (v2 !== 'FREE' && !calledSet.has(v2)) diag2 = false;
  }
  if (diag1) return { patternName: "DIAGONAL LINE ( \\ )", winCells: d1Coords };
  if (diag2) return { patternName: "DIAGONAL LINE ( / )", winCells: d2Coords };

  let corners = [[0, 0], [0, 4], [4, 0], [4, 4]];
  let cornerWin = corners.every(([r, c]) => {
    let val = cardGrid[r][c];
    return val === 'FREE' || calledSet.has(val);
  });
  if (cornerWin) return { patternName: "4 CORNERS", winCells: corners };

  return null;
}

function getBallLetter(num) {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}

let gameState = {
  gameId: '#' + Math.random().toString(36).substring(2, 8).toUpperCase(),
  phase: 'SELECTION',
  timer: 30,
  cardPrice: 10,
  soldCards: {},
  userPurchases: {},
  players: {},
  derash: 0,
  houseCommission: 0,
  calledBalls: [],
  calledSet: new Set(),
  currentBall: null,
  availableBalls: Array.from({ length: 75 }, (_, i) => i + 1),
  winner: null
};

function resetGame() {
  gameState = {
    gameId: '#' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    phase: 'SELECTION',
    timer: 30,
    cardPrice: 10,
    soldCards: {},
    userPurchases: {},
    players: {},
    derash: 0,
    houseCommission: 0,
    calledBalls: [],
    calledSet: new Set(),
    currentBall: null,
    availableBalls: Array.from({ length: 75 }, (_, i) => i + 1),
    winner: null
  };
  io.emit('game_reset');
}

function processAIBotPurchases() {
  if (gameState.phase !== 'SELECTION') return;

  const botCount = Math.floor(Math.random() * (BOT_CONFIG.MAX_BOTS_PER_ROUND - BOT_CONFIG.MIN_BOTS_PER_ROUND + 1)) + BOT_CONFIG.MIN_BOTS_PER_ROUND;
  const activeBots = [...AI_BOTS].sort(() => 0.5 - Math.random()).slice(0, botCount);

  activeBots.forEach((botUser) => {
    const cardsToBuy = Math.floor(Math.random() * (BOT_CONFIG.MAX_CARDS_PER_BOT - BOT_CONFIG.MIN_CARDS_PER_BOT + 1)) + BOT_CONFIG.MIN_CARDS_PER_BOT;

    for (let i = 0; i < cardsToBuy; i++) {
      let randomCardNum = Math.floor(Math.random() * 100) + 1;
      
      if (!gameState.soldCards[randomCardNum]) {
        if (!gameState.userPurchases[botUser.id]) {
          gameState.userPurchases[botUser.id] = [];
        }

        if (gameState.userPurchases[botUser.id].length < 2) {
          updateUserBalance(botUser.id, -gameState.cardPrice);

          const cardGrid = generateBingoCard(randomCardNum);
          gameState.soldCards[randomCardNum] = {
            ownerId: botUser.id,
            grid: cardGrid
          };

          gameState.userPurchases[botUser.id].push(randomCardNum);

          const commission = gameState.cardPrice * 0.20;
          const netPool = gameState.cardPrice * 0.80;

          gameState.derash += netPool;
          gameState.houseCommission += commission;

          gameState.players[botUser.id] = botUser.id;
        }
      }
    }
  });
}

setInterval(() => {
  if (gameState.phase === 'SELECTION') {
    gameState.timer--;

    if (gameState.timer === 20 || gameState.timer === 10) {
      processAIBotPurchases();
    }

    if (gameState.timer <= 0) {
      gameState.phase = 'PLAYING';
      gameState.timer = 0;
    }
  }
}, 1000);

setInterval(() => {
  if (gameState.phase === 'PLAYING') {
    if (!gameState.winner && gameState.availableBalls.length > 0) {
      const randomIndex = Math.floor(Math.random() * gameState.availableBalls.length);
      const drawn = gameState.availableBalls.splice(randomIndex, 1)[0];
      const letter = getBallLetter(drawn);
      gameState.currentBall = { num: drawn, label: `${letter}-${drawn}` };
      gameState.calledBalls.push(gameState.currentBall);
      gameState.calledSet.add(drawn);

      for (const [cardNum, cardData] of Object.entries(gameState.soldCards)) {
        const winInfo = checkWinningCard(cardData.grid, gameState.calledSet);
        if (winInfo) {
          const winnerUser = getOrCreateUser(cardData.ownerId);
          
          gameState.winner = {
            telegramId: cardData.ownerId,
            winnerName: winnerUser.name || `Player ${String(cardData.ownerId).slice(-4)}`,
            cardNum: cardNum,
            cardGrid: cardData.grid,
            patternName: winInfo.patternName,
            winCells: winInfo.winCells,
            prize: gameState.derash,
            calledSet: Array.from(gameState.calledSet)
          };

          updateUserBalance(cardData.ownerId, gameState.derash);

          io.emit('game_winner', gameState.winner);

          let resetCountdown = 7;
          const resetInterval = setInterval(() => {
            resetCountdown--;
            io.emit('winner_countdown', resetCountdown);
            if (resetCountdown <= 0) {
              clearInterval(resetInterval);
              resetGame();
            }
          }, 1000);
          break;
        }
      }
    } else if (!gameState.winner && gameState.availableBalls.length === 0) {
      setTimeout(() => { resetGame(); }, 5000);
    }
  }

  io.emit('game_state_update', {
    gameId: gameState.gameId,
    phase: gameState.phase,
    timer: gameState.timer,
    soldCount: Object.keys(gameState.soldCards).length,
    derash: gameState.derash,
    calledBalls: gameState.calledBalls,
    currentBall: gameState.currentBall,
    playersCount: Object.keys(gameState.players).length,
    winner: gameState.winner
  });
}, 4000);

io.on('connection', (socket) => {
  socket.on('init_user', (userData) => {
    socket.telegramId = String(userData ? userData.id : '5328605923');
    const firstName = userData ? userData.first_name : 'Player';
    const user = getOrCreateUser(socket.telegramId, null, firstName);
    gameState.players[socket.id] = socket.telegramId;

    socket.emit('user_balance_sync', user.balance);

    const userCards = gameState.userPurchases[socket.telegramId] || [];
    userCards.forEach(cNum => {
      if (gameState.soldCards[cNum]) {
        socket.emit('card_purchased', { cardNum: cNum, cardGrid: gameState.soldCards[cNum].grid });
      }
    });
  });

  socket.on('select_card', (cardNum) => {
    if (gameState.phase !== 'SELECTION' || gameState.soldCards[cardNum]) return;

    if (!gameState.userPurchases[socket.telegramId]) {
      gameState.userPurchases[socket.telegramId] = [];
    }

    if (gameState.userPurchases[socket.telegramId].length >= 2) {
      socket.emit('error_msg', 'Maximum 2 cards allowed per round!');
      return;
    }

    const user = getOrCreateUser(socket.telegramId);
    if (user.balance < gameState.cardPrice) {
      socket.emit('error_msg', 'Insufficient balance!');
      return;
    }

    updateUserBalance(socket.telegramId, -gameState.cardPrice);

    const cardGrid = generateBingoCard(cardNum);

    gameState.soldCards[cardNum] = {
      ownerId: socket.telegramId,
      grid: cardGrid
    };

    gameState.userPurchases[socket.telegramId].push(cardNum);

    const commission = gameState.cardPrice * 0.20;
    const netPool = gameState.cardPrice * 0.80;

    gameState.derash += netPool;
    gameState.houseCommission += commission;

    socket.emit('user_balance_sync', user.balance - gameState.cardPrice);
    socket.emit('card_purchased', { cardNum, cardGrid });
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
  });
});

// Telegram Bot Controls
const promptPhoneShare = (bot, chatId) => {
  bot.sendMessage(
    chatId,
    '👋 **ሰላም! እንኳን ወደ Kaka Bingo በደህና መጡ!** 🎯\n\n' +
    'ለመጫወት እና ሽልማቶችን ለማሸነፍ እባክዎን አስቀድመው ስልክ ቁጥርዎን ያጋሩ::\n\n' +
    '👇 **ለመመዝገብ ከታች ያለውን ቁልፍ ይጫኑ:**',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [[{ text: '📱 Share Phone Number / ስልክ ቁጥር ያጋሩ', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    }
  );
};

const sendMainMenu = (bot, chatId) => {
  bot.sendMessage(chatId, '🎉 **እንኳን ወደ Kaka Bingo Plus በደህና መጡ!** 🎲\n\nከታች ባሉት አዝራሮች በመጠቀም መጫወት እና ሂሳብዎን ማስተዳደር ይችላሉ::', {
    parse_mode: 'Markdown',
    reply_markup: {
      remove_keyboard: true,
      inline_keyboard: [
        [{ text: '🎮 Play Kaka Bingo', web_app: { url: WEB_APP_URL } }],
        [{ text: '💳 Deposit', callback_data: 'deposit' }, { text: '🏧 Withdraw', callback_data: 'withdraw' }],
        [{ text: '💰 Balance', callback_data: 'balance' }, { text: '👥 Invite Friends', callback_data: 'invite' }],
        [{ text: '💬 Support', callback_data: 'support' }]
      ]
    }
  });
};

const bot = new TelegramBot(TOKEN, { polling: true });
bot.on('polling_error', (err) => console.log('TELEGRAM ERROR:', err.code, err.message));

bot.setMyCommands([
  { command: 'play', description: 'Play 🎮' },
  { command: 'balance', description: 'My balance' },
  { command: 'deposit', description: 'Deposit' },
  { command: 'withdraw', description: 'Withdraw' },
  { command: 'myref', description: 'My referral link & earnings' },
  { command: 'support', description: 'Contact support' }
]).then(() => console.log('Bot commands menu updated!'));

const requirePhone = (chatId, callback) => {
  const user = getOrCreateUser(chatId);
  if (!user || !user.phone) {
    promptPhoneShare(bot, chatId);
    return false;
  }
  callback(user);
  return true;
};

bot.onText(/\/start|\/menu|\/play/, (msg) => {
  const chatId = msg.chat.id.toString();
  delete userStates[chatId];
  requirePhone(chatId, () => sendMainMenu(bot, chatId));
});

bot.onText(/\/balance/, (msg) => {
  const chatId = msg.chat.id.toString();
  delete userStates[chatId];
  requirePhone(chatId, (user) => {
    bot.sendMessage(chatId, `💰 **የእርስዎ ቀሪ ሂሳብ:** ${user.balance} ETB`, { parse_mode: 'Markdown' });
  });
});

bot.onText(/\/deposit/, (msg) => {
  const chatId = msg.chat.id.toString();
  requirePhone(chatId, () => {
    bot.sendMessage(chatId, '💳 **ለመሙላት (Deposit) የመክፈያ ዘዴ ይምረጡ:**', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Telebirr', callback_data: 'dep_telebirr' }],
          [{ text: '🏦 CBE (ንግድ ባንክ)', callback_data: 'dep_cbe' }]
        ]
      }
    });
  });
});

bot.onText(/\/withdraw/, (msg) => {
  const chatId = msg.chat.id.toString();
  requirePhone(chatId, () => {
    bot.sendMessage(chatId, '🏧 **ገንዘብ ለማውጣት (Withdraw) የመቀበያ ዘዴ ይምረጡ:**', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Telebirr', callback_data: 'with_telebirr' }],
          [{ text: '🏦 CBE (ንግድ ባንክ)', callback_data: 'with_cbe' }]
        ]
      }
    });
  });
});

bot.onText(/\/myref/, (msg) => {
  const chatId = msg.chat.id.toString();
  requirePhone(chatId, () => {
    bot.sendMessage(chatId, `👥 **የእርስዎ የመጋበዣ ሊንክ (Referral Link):**\nhttps://t.me/Kaka_bingo_bot?start=${chatId}`);
  });
});

bot.onText(/\/support/, (msg) => {
  delete userStates[msg.chat.id.toString()];
  bot.sendMessage(msg.chat.id.toString(), '💬 **እርዳታ ለማግኘት:**\nAdmin: @Kaka_admins');
});

bot.on('contact', (msg) => {
  const chatId = msg.chat.id.toString();
  const phoneNumber = msg.contact.phone_number;
  getOrCreateUser(chatId, phoneNumber, msg.from ? msg.from.first_name : null);

  bot.sendMessage(chatId, `✅ **ምዝገባው በተሳካ ሁኔታ ተጠናቋል!**\n\nተመዝግቧል: \`${phoneNumber}\``, { 
    parse_mode: 'Markdown',
    reply_markup: { remove_keyboard: true }
  }).then(() => sendMainMenu(bot, chatId));
});

bot.onText(/\/approve (?:<)?(\d+)(?:>)? (?:<)?(\d+)(?:>)?/, (msg, match) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID) return;
  const targetUserId = match[1];
  const amount = parseFloat(match[2]);
  const newBal = updateUserBalance(targetUserId, amount);
  bot.sendMessage(targetUserId, `🎉 **Deposit Approved!** ${amount} ETB has been added to your balance. Current balance: ${newBal} ETB`);
  bot.sendMessage(ADMIN_CHAT_ID, `✅ Deposit approved: Added ${amount} ETB to User ${targetUserId}. New Balance: ${newBal} ETB`);
});

bot.onText(/\/withdraw_approve (?:<)?(\d+)(?:>)? (?:<)?(\d+)(?:>)?/, (msg, match) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID) return;
  const targetUserId = match[1];
  const amount = parseFloat(match[2]);
  const newBal = updateUserBalance(targetUserId, -amount);
  bot.sendMessage(targetUserId, `🎉 **Withdrawal Approved!** ${amount} ETB has been processed and deducted from your balance. Current balance: ${newBal} ETB`);
  bot.sendMessage(ADMIN_CHAT_ID, `✅ Withdrawal approved: Deducted ${amount} ETB from User ${targetUserId}. New Balance: ${newBal} ETB`);
});

bot.onText(/\/reject (?:<)?(\d+)(?:>)?/, (msg, match) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID) return;
  const targetUserId = match[1];
  bot.sendMessage(targetUserId, '❌ **Transaction Rejected!** Your request could not be verified. Please contact support.');
  bot.sendMessage(ADMIN_CHAT_ID, `❌ Rejected transaction for User ${targetUserId}.`);
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id.toString();
  const messageId = query.message.message_id;
  const data = query.data;
  bot.answerCallbackQuery(query.id).catch(() => {});

  const user = getOrCreateUser(chatId);
  if ((!user || !user.phone) && !data.startsWith('approve_') && !data.startsWith('reject_')) {
    return promptPhoneShare(bot, chatId);
  }

  if (data === 'balance') {
    delete userStates[chatId];
    bot.sendMessage(chatId, `💰 **የእርስዎ ቀሪ ሂሳብ:** ${user.balance} ETB`, { parse_mode: 'Markdown' });
  } else if (data === 'deposit') {
    delete userStates[chatId];
    bot.editMessageText('💳 **ለመሙላት (Deposit) የመክፈያ ዘዴ ይምረጡ:**', {
      chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Telebirr', callback_data: 'dep_telebirr' }],
          [{ text: '🏦 CBE (ንግድ ባንክ)', callback_data: 'dep_cbe' }],
          [{ text: '⬅️ Back', callback_data: 'back_main' }]
        ]
      }
    }).catch(() => {});
  } else if (data === 'dep_telebirr') {
    userStates[chatId] = 'awaiting_deposit';
    bot.editMessageText('📲 **በ Telebirr ለማስገባት:**\n\nቁጥር: `0906968137`\nስም: Halid Shegaw\n\nገንዘቡን ገቢ ካደረጉ በኋላ የተላከውን Transaction ID ወይም የደረሰኝ ስክሪንሾት እዚህ ይላኩ::', {
      chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'deposit' }]] }
    }).catch(() => {});
  } else if (data === 'dep_cbe') {
    userStates[chatId] = 'awaiting_deposit';
    bot.editMessageText('🏦 **በ CBE (ንግድ ባንክ) ለማስገባት:**\n\nየሂሳብ ቁጥር: `1000562046805`\nስም: Halid Shegaw\n\nገንዘቡን ገቢ ካደረጉ በኋላ የትራንስፈር ቁጥር (Transaction Reference) ወይም ስክሪንሾት እዚህ ይላኩ::', {
      chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'deposit' }]] }
    }).catch(() => {});
  } else if (data === 'withdraw') {
    delete userStates[chatId];
    bot.editMessageText('🏧 **ገንዘብ ለማውጣት (Withdraw) የመቀበያ ዘዴ ይምረጡ:**', {
      chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Telebirr', callback_data: 'with_telebirr' }],
          [{ text: '🏦 CBE (ንግድ ባንክ)', callback_data: 'with_cbe' }],
          [{ text: '⬅️ Back', callback_data: 'back_main' }]
        ]
      }
    }).catch(() => {});
  } else if (data === 'with_telebirr') {
    userStates[chatId] = 'awaiting_withdrawal';
    bot.editMessageText('📱 **በ Telebirr ለማውጣት:**\n\nማውጣት የሚፈልጉትን የገንዘብ መጠን እና የ Telebirr ስልክ ቁጥርዎን አስገብተው ይላኩ::', {
      chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'withdraw' }]] }
    }).catch(() => {});
  } else if (data === 'with_cbe') {
    userStates[chatId] = 'awaiting_withdrawal';
    bot.editMessageText('🏦 **በ CBE ለማውጣት:**\n\nማውጣት የሚፈልጉትን የገንዘብ መጠን፣ የባንክ ሂሳብ ቁጥር እና የባንኩን ባለቤት ስም አስገብተው ይላኩ::', {
      chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'withdraw' }]] }
    }).catch(() => {});
  } else if (data === 'back_main') {
    delete userStates[chatId];
    bot.editMessageText('🎉 **እንኳን ወደ Kaka Bingo Plus በደህና መጡ!** 🎲\n\nከታች ባሉት አዝራሮች በመጠቀም መጫወት እና ሂሳብዎን ማስተዳደር ይችላሉ::', {
      chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Play Kaka Bingo', web_app: { url: WEB_APP_URL } }],
          [{ text: '💳 Deposit', callback_data: 'deposit' }, { text: '🏧 Withdraw', callback_data: 'withdraw' }],
          [{ text: '💰 Balance', callback_data: 'balance' }, { text: '👥 Invite Friends', callback_data: 'invite' }],
          [{ text: '💬 Support', callback_data: 'support' }]
        ]
      }
    }).catch(() => {});
  } else if (data === 'invite') {
    delete userStates[chatId];
    bot.sendMessage(chatId, `👥 **የእርስዎ የመጋበዣ ሊንክ (Referral Link):**\nhttps://t.me/Kaka_bingo_bot?start=${chatId}`);
  } else if (data === 'support') {
    delete userStates[chatId];
    bot.sendMessage(chatId, '💬 **እርዳታ ለማግኘት:**\nAdmin: @Kaka_admins');
  } else if (data.startsWith('approve_dep_')) {
    const parts = data.split('_');
    const targetUserId = parts[2];
    const amount = parseFloat(parts[3]);
    const newBal = updateUserBalance(targetUserId, amount);
    bot.sendMessage(targetUserId, `🎉 **Deposit Approved!** ${amount} ETB has been added to your balance. Current balance: ${newBal} ETB`);
    bot.sendMessage(ADMIN_CHAT_ID, `✅ Approved deposit of ${amount} ETB for user ${targetUserId}.`);
  } else if (data.startsWith('approve_with_')) {
    const parts = data.split('_');
    const targetUserId = parts[2];
    const amount = parseFloat(parts[3]);
    const newBal = updateUserBalance(targetUserId, -amount);
    bot.sendMessage(targetUserId, `🎉 **Withdrawal Approved!** ${amount} ETB has been processed and deducted from your balance. Current balance: ${newBal} ETB`);
    bot.sendMessage(ADMIN_CHAT_ID, `✅ Approved withdrawal of ${amount} ETB for user ${targetUserId}.`);
  } else if (data.startsWith('reject_trans_')) {
    const targetUserId = data.split('_')[2];
    bot.sendMessage(targetUserId, '❌ **Transaction Rejected!** Your request could not be verified. Please contact support.');
    bot.sendMessage(ADMIN_CHAT_ID, `❌ Rejected request for user ${targetUserId}.`);
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id.toString();
  if (msg.text && msg.text.startsWith('/')) return;
  if (msg.contact) return; 
  if (chatId === ADMIN_CHAT_ID) return; 

  const user = getOrCreateUser(chatId);
  if (!user || !user.phone) {
    promptPhoneShare(bot, chatId);
    return;
  }

  const currentState = userStates[chatId];
  if (!currentState && !msg.photo) return;

  if (msg.text) {
    const requestType = currentState === 'awaiting_withdrawal' ? 'Withdrawal' : 'Deposit';
    bot.sendMessage(chatId, `✅ ${requestType} request sent to Admin! Please wait for verification.`);
    
    bot.sendMessage(
      ADMIN_CHAT_ID, 
      `📥 **New ${requestType} Request from User:** \`<${chatId}>\`\n` +
      `📱 **Phone:** \`${user.phone || 'N/A'}\`\n` +
      `💰 **Current Balance:** \`${user.balance} ETB\`\n\n` +
      `**Details:** ${msg.text}\n\n` +
      `*To approve deposit:* \`/approve <${chatId}> <amount>\`\n` +
      `*To approve withdrawal:* \`/withdraw_approve <${chatId}> <amount>\`\n` +
      `*To reject:* \`/reject <${chatId}>\``, 
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Deposit +100 ETB', callback_data: `approve_dep_${chatId}_100` }, { text: 'Withdraw -100 ETB', callback_data: `approve_with_${chatId}_100` }],
            [{ text: '❌ Reject Request', callback_data: `reject_trans_${chatId}` }]
          ]
        }
      }
    );
    delete userStates[chatId];
  }

  if (msg.photo) {
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    bot.sendMessage(chatId, '✅ Receipt screenshot sent to Admin! Please wait for verification.');

    bot.sendPhoto(ADMIN_CHAT_ID, photoId, {
      caption: 
        `📸 **New Deposit Screenshot from User:** \`<${chatId}>\`\n` +
        `📱 **Phone:** \`${user.phone || 'N/A'}\`\n` +
        `💰 **Current Balance:** \`${user.balance} ETB\`\n\n` +
        `*To approve deposit:* \`/approve <${chatId}> <amount>\`\n` +
        `*To reject:* \`/reject <${chatId}>\``,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '+50 ETB', callback_data: `approve_dep_${chatId}_50` },
            { text: '+100 ETB', callback_data: `approve_dep_${chatId}_100` },
            { text: '+200 ETB', callback_data: `approve_dep_${chatId}_200` },
            { text: '+500 ETB', callback_data: `approve_dep_${chatId}_500` }
          ],
          [{ text: '❌ Reject Request', callback_data: `reject_trans_${chatId}` }]
        ]
      }
    });
    delete userStates[chatId];
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`Kaka Bingo Live on port ${PORT}`));
