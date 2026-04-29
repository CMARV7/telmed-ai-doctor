const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const MEDICAL_PROMPT = `You are Dr. Telmed, a warm, experienced medical doctor, psychologist and therapist helping patients in Nigeria and West Africa.
Rules:
- Be conversational and warm, like a real doctor.
- Suggest possible conditions (clear these are possibilities, not a diagnosis).
- Recommend medications available in Nigeria (paracetamol, amoxicillin, etc.) when appropriate.
- Urge immediate hospital visit for emergency symptoms (chest pain, breathing issues).`; 

// --- UPDATED STABLE MODELS FOR APRIL 2026 ---
const GEMINI_MODEL = "gemini-2.5-flash"; // Stable version for 2026
const GROQ_MODEL = "llama-3.3-70b-versatile"; 
const OPENROUTER_MODEL = "google/gemini-2.5-flash:free"; // More reliable free model on OpenRouter

async function getGeminiResponse(messages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await axios.post(url, {
    system_instruction: {
      parts: [{ text: MEDICAL_PROMPT + '\nSeverity: ' + severity }]
    },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  }, { headers: { 'Content-Type': 'application/json' } });
  return {
    text: response.data.candidates[0].content.parts[0].text,
    provider: 'Gemini'
  };
}

async function getOpenRouterResponse(messages) {
  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: OPENROUTER_MODEL,
    messages: [{ role: 'system', content: MEDICAL_PROMPT }, ...messages],
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return { text: response.data.choices[0].message.content, provider: 'OpenRouter' };
}

async function getGroqResponse(messages) {
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: GROQ_MODEL, 
    messages: [{ role: 'system', content: MEDICAL_PROMPT }, ...messages],
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    }
  );
  return {
    text: response.data.choices[0].message.content,
    provider: 'Groq'
  };
}

async function getAIResponse(messages) {
  // PRIORITY: 1. Gemini -> 2. OpenRouter -> 3. Groq
  if (process.env.GEMINI_API_KEY) {
    try { return await getGeminiResponse(messages); } catch (e) { console.error('Gemini Failed'); }
  }
  if (process.env.OPENROUTER_API_KEY) {
    try { return await getOpenRouterResponse(messages); } catch (e) { console.error('OpenRouter Failed'); }
  }
  if (process.env.GROQ_API_KEY) {
    try { return await getGroqResponse(messages); } catch (e) { console.error('Groq Failed'); }
  }
  throw new Error("All services failed.");
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    const messages = [...(history || []), { role: 'user', content: message }];
    const result = await getAIResponse(messages);
    res.json({ success: true, response: result.text, provider: result.provider });
  } catch (error) {
    res.status(500).json({ success: false, error: 'AI unavailable' });
  }
});

app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType, message } = req.body;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await axios.post(url, {
      system_instruction: { parts: [{ text: MEDICAL_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [
          { text: message || 'Analyze this image.' },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
        ]
      }]
    }, { headers: { 'Content-Type': 'application/json' } });
    res.json({ success: true, response: response.data.candidates[0].content.parts[0].text, provider: 'Gemini Vision' });
  } catch (error) {
    console.error('Image analysis failed');
    res.status(500).json({ success: false, error: 'Image analysis failed.' });
  }
});

app.listen(PORT, () => console.log('Doctor is live on ' + PORT));
