const { rewriteText } = require("./services/ai.service");
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const config = require('./config');

const express = require("express");
const app = express();
app.use(express.json());

// webhook-режим
const bot = new TelegramBot(config.TELEGRAM_TOKEN);

// память
const userSettings = {};
const userLimits = {};
const paidUsers = {};

const FREE_LIMIT = 3;

// ======================
// СТАРТ + СТИЛИ
// ======================

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Выбери стиль:", {
    reply_markup: {
      keyboard: [
        ["😎 Уверенный", "😂 Смешной"],
        ["😏 Флирт", "🧠 Умный"],
        ["🔥 Бизнес", "💬 Дружелюбный"]
      ],
      resize_keyboard: true
    }
  });
});

// ======================
// ОБРАБОТКА СООБЩЕНИЙ
// ======================

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;
  if (text === "/start") return;

  // ======================
  // СТИЛИ (фикс: теперь style сохраняется правильно)
  // ======================

  const styles = {
    "😎 Уверенный": "confident",
    "😂 Смешной": "funny",
    "😏 Флирт": "flirty",
    "🧠 Умный": "smart",
    "🔥 Бизнес": "business",
    "💬 Дружелюбный": "friendly"
  };

  if (styles[text]) {
    userSettings[chatId] = {
      style: styles[text],
      voice: userSettings[chatId]?.voice || config.DEFAULT_VOICE
    };

    return bot.sendMessage(chatId, `Стиль установлен: ${text}`);
  }

  // ======================
  // ЛИМИТЫ
  // ======================

  if (!userLimits[chatId]) {
    userLimits[chatId] = { used: 0 };
  }

  if (!paidUsers[chatId] && userLimits[chatId].used >= FREE_LIMIT) {
    return bot.sendMessage(chatId, "Лимит закончился 😢\nОплата: /pay");
  }

  const voiceId = userSettings[chatId]?.voice || config.DEFAULT_VOICE;
  const style = userSettings[chatId]?.style || "friendly";

  try {

const style = userSettings[chatId]?.style || "neutral";

    // ======================
    // 1. AI ПЕРЕПИСЫВАЕТ ТЕКСТ
    // ======================

    const improvedText = await rewriteText(text, style);

    // ======================
    // 2. TTS (ElevenLabs)
    // ======================

    const response = await axios({
  method: 'POST',
  url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  headers: {
    'xi-api-key': config.ELEVENLABS_API_KEY,
    'Content-Type': 'application/json'
  },
  data: {
    text: improvedText, // 🔥 ВОТ ТУТ ИЗМЕНЕНИЕ
    model_id: "eleven_monolingual_v1"
  },
  responseType: 'stream'
});

    // ======================
    // 3. ФАЙЛ
    // ======================

    const filePath = `voice_${chatId}_${Date.now()}.mp3`;
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    writer.on('finish', async () => {
      await bot.sendVoice(chatId, filePath);
      fs.unlinkSync(filePath);

      userLimits[chatId].used += 1;
    });

  } catch (err) {
    console.log(err.message);
    bot.sendMessage(chatId, "Ошибка 😢");
  }
});

// ======================
// ОПЛАТА
// ======================

bot.onText(/\/pay/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "Доступ стоит $5 💰\nНапиши @yourusername после оплаты"
  );
});

// ======================
// WEBHOOK SERVER (Render)
// ======================

const PORT = process.env.PORT || 3000;

app.post(`/bot${config.TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

app.listen(PORT, () => {
  console.log("Bot started on port", PORT);
});