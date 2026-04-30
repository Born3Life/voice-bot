const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const config = require('./config');

const express = require("express");
const app = express();
app.use(express.json());

// ❗ webhook-режим (без polling)
const bot = new TelegramBot(config.TELEGRAM_TOKEN);

// память
const userSettings = {};
const userLimits = {};
const paidUsers = {};

const FREE_LIMIT = 3;

// старт
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Выбери стиль:", {
    reply_markup: {
      keyboard: [
        ["😎 Уверенный", "😂 Смешной"],
        ["😏 Флирт"]
      ],
      resize_keyboard: true
    }
  });
});

// выбор стиля + обработка сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // защита от команды /start дублирования
  if (text === "/start") return;

  // стили
  if (text === "😎 Уверенный") {
    userSettings[chatId] = { voice: "EXAVITQu4vr4xnSDxMaL" };
    return bot.sendMessage(chatId, "Стиль: уверенный 😎");
  }

  if (text === "😂 Смешной") {
    userSettings[chatId] = { voice: "TxGEqnHWrfWFTfGW9XjX" };
    return bot.sendMessage(chatId, "Стиль: смешной 😂");
  }

  if (text === "😏 Флирт") {
    userSettings[chatId] = { voice: "ErXwobaYiN019PkySvjV" };
    return bot.sendMessage(chatId, "Стиль: флирт 😏");
  }

  // лимиты
  if (!userLimits[chatId]) {
    userLimits[chatId] = { used: 0 };
  }

  if (!paidUsers[chatId] && userLimits[chatId].used >= FREE_LIMIT) {
    return bot.sendMessage(chatId, "Лимит закончился 😢\nОплата: /pay");
  }

  const voiceId = userSettings[chatId]?.voice || config.DEFAULT_VOICE;

  try {
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      headers: {
        'xi-api-key': config.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        text: text,
        model_id: "eleven_monolingual_v1"
      },
      responseType: 'stream'
    });

    const filePath = `voice_${chatId}.mp3`;
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

// оплата (ручная)
bot.onText(/\/pay/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "Доступ стоит $5 💰\nНапиши @yourusername после оплаты"
  );
});

// ======================
// WEBHOOK SERVER (Render)
// ======================

const PORT = process.env.PORT || 3000;

// Telegram webhook endpoint
app.post(`/bot${config.TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// проверка сервера
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

// запуск сервера
app.listen(PORT, () => {
  console.log("Bot started on port", PORT);
});