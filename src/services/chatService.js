const axios = require('axios');

const MEDICAL_SYSTEM_PROMPT = `You are Telmed AI Doctor, a medical assistant 
helping users in Nigeria and West Africa. When a user describes symptoms:

1. Suggest possible conditions (list 2-3 possibilities)
2. Recommend medications available in Nigeria
3. Give simple treatment steps
4. Always end with this disclaimer

DISCLAIMER: This is an AI assistant. Always consult a real doctor 
for confirmed diagnosis and treatment.

Be clear, simple, and compassionate. Respond in plain English.`;

async function getChatResponse(userMessage, conversationHistory = []) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      response: response.data.choices[0].message.content
    };

  } catch (error) {
    console.log('DeepSeek failed, trying Gemini...');
    return await getGeminiResponse(userMessage, conversationHistory);
  }
}

async function getGeminiResponse(userMessage, conversationHistory = []) {
  try {
    const messages = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    messages.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        system_instruction: {
          parts: [{ text: MEDICAL_SYSTEM_PROMPT }]
        },
        contents: messages
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return {
      success: true,
      response: response.data.candidates[0].content.parts[0].text
    };

  } catch (error) {
    return {
      success: false,
      response: 'Sorry, the AI doctor is temporarily unavailable. Please try again.'
    };
  }
}

module.exports = { getChatResponse };