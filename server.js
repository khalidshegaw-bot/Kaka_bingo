const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// 1. Setup Database
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ users: [], transactions: [] }).write();

// 2. Setup Express & Config
const app = express();
const PORT = process.env.PORT || 8080;
const BOT_TOKEN = process.env.BOT_TOKEN || "8653812435:AAGXxyGwclpmsGUOEYPMtJ6zcbs5GMyNfns";
const WEB_APP_URL = process.env.WEB_APP_URL || "https://colonialism-probable-gecko.abasthan.app";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 3. Setup Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Handle /start Command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const user = db.get('users').find({ id: chatId }).value();

  if (!user) {
    bot.sendMessage(chatId, "👋 ሰላም! እንኳን ወደ Kaka Bingo በደህና መጡ! ለመጫወት እና ሽልማቶችን ለማሸነፍ ስልክ ቁጥርዎን ያጋሩ።", {
      reply_markup: {
        keyboard: [[{ text: "📱 ስልክ ቁጥር ያጋሩ", request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  } else {
    sendMainMenu(chatId);
  }
});

// Handle Phone Contact Sharing (Strictly 0 ETB balance for new users)
bot.on('contact', (msg) => {
  const chatId = msg.chat.id;
  const phone = msg.contact.phone_number;

  let user = db.get('users').find({ id: chatId }).value();

  if (!user) {
    db.get('users').push({
      id: chatId,
      phone: phone,
      balance: 0
    }).write();
  }

  bot.sendMessage(chatId, `✅ ምዝገባው በተሳካ ሁኔታ ተጠናቋል! ስልክ ቁጥርዎ: ${phone}`);
  sendMainMenu(chatId);
});

// Send Main Menu Function
function sendMainMenu(chatId) {
  bot.sendMessage(chatId, "🎲 እንኳን ወደ Kaka Bingo Plus በደህና መጡ! ጨዋታ ለመጀመር ወይም ሂሳብ ለመሙላት ከታች ያሉትን አማራጮች ይጠቀሙ።", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 Play Kaka Bingo", web_app: { url: WEB_APP_URL } }],
        [{ text: "💳 Deposit", callback_data: "deposit" }, { text: "🏧 Withdraw", callback_data: "withdraw" }],
        [{ text: "💰 Balance", callback_data: "balance" }, { text: "👥 Invite Friends", callback_data: "invite" }],
        [{ text: "💬 Support", callback_data: "support" }]
      ]
    }
  });
}

// Handle Callback Queries
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "deposit") {
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(chatId,
      "💳 **የሂሳብ መሙያ (Deposit)**\n\n" +
      "እባክዎን በ Telebirr ወይም CBE ብር ካስገቡ በኋላ **የላኩበትን Transaction ID** ወይም **የደረሰኝ ፎቶ** ይላኩ።\n" +
      "⚠️ **ማስጠንቀቂያ:** የተደገመ ወይም የተጭበረበረ ደረሰኝ ቁጥር መላክ መለያዎን ያታግዳል።"
    );
  }
});

// Serve Web App Static Files
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Kaka Bingo running on port ${PORT}`);
});// Keep-alive ping to prevent idle sleep
const https = require('https');
setInterval(() => {
  if (WEB_APP_URL) {
    https.get(WEB_APP_URL, (res) => {
      console.log('Keep-alive ping sent');
    }).on('error', (err) => {
      console.error('Ping error:', err.message);
    });
  }
}, 10 * 60 * 1000);

