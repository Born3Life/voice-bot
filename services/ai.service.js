const axios = require("axios");
const config = require("../config");

// простая AI-переписка через OpenAI-подобный API (можешь заменить позже)
async function rewriteText(text, style) {
  try {
    const prompt = `
Перепиши сообщение пользователя.

Стиль: ${style}

Сделай текст:
- естественным
- коротким
- понятным
- живым

Сообщение:
${text}
`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Ты переписчик сообщений." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.log("AI error:", err.message);
    return text; // fallback
  }
}

module.exports = { rewriteText };