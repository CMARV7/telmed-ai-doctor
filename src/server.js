const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

// Only use dotenv for local development
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
- Be conversational and warm, like a real doctor (be friendly, empathetic, and supportive)
- Keep responses under 120 words unless condition is serious or complex
- Suggest possible conditions when symptoms are described (as many as you can, but make it clear these are just possibilities, not a diagnosis)
- Recommend medications available in Nigeria (like paracetamol, amoxicillin, etc.) when appropriate, but always suggest seeing a doctor for proper diagnosis
- Give simple treatment steps generic enough to be safe for most conditions (like rest, hydration, over-the-counter meds) but avoid specific medical advice without diagnosis
- Provide emotional support when needed and encourage users to seek in-person care when symptoms are severe or worsening
- If emergency symptoms (chest pain, difficulty breathing, severe bleeding), urge immediate hospital visit
- Never repeat long disclaimers in every message
- Talk naturally: "Based on what you've described, this sounds like it could be... but it's important to see a doctor for an accurate diagnosis."`; 

async function getGeminiResponse(messages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await axios.post(url, {
    system_instruction: { parts: [{ text: MEDICAL_PROMPT }] },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  }, { headers: { 'Content-Type': 'application/json' } });
  return { text: response.data.candidates[0].content.parts[0].text, provider: 'Gemini' };
}

async function getGroqResponse(messages) {
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama3-8b-8192',
    messages: [
      { role: 'system', content: MEDICAL_PROMPT },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    ],
    temperature: 0.7,
    max_tokens: 300
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return { text: response.data.choices[0].message.content, provider: 'Groq' };
}

async function getOpenRouterResponse(messages) {
  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'mistralai/mistral-7b-instruct:free',
    messages: [
      { role: 'system', content: MEDICAL_PROMPT },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    ],
    temperature: 0.7,
    max_tokens: 300
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://telmed-ai-doctor.onrender.com',
      'X-Title': 'Telmed AI Doctor'
    }
  });
  return { text: response.data.choices[0].message.content, provider: 'OpenRouter' };
}

async function getAIResponse(messages) {
  // Try Groq First
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('Attempting Groq...');
      return await getGroqResponse(messages);
    } catch (e) {
      console.error('Groq Error:', e.response ? e.response.data : e.message);
    }
  }

  // Fallback to Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('Attempting Gemini...');
      return await getGeminiResponse(messages);
    } catch (e2) {
      console.error('Gemini Error:', e2.response ? e2.response.data : e2.message);
    }
  }

  // Final Fallback to OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log('Attempting OpenRouter...');
      return await getOpenRouterResponse(messages);
    } catch (e3) {
      console.error('OpenRouter Error:', e3.response ? e3.response.data : e3.message);
    }
  }

  throw new Error("No active AI services responded or keys are missing.");
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'Telmed AI Doctor is running', version: '3.0' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
    const messages = [...(history || []), { role: 'user', content: message }];
    const result = await getAIResponse(messages);
    console.log('Response delivered by ' + result.provider);
    res.json({ success: true, response: result.text, provider: result.provider });
  } catch (error) {
    console.error('Chat controller failed:', error.message);
    res.status(500).json({ success: false, error: 'All AI services unavailable. Please try again later.' });
  }
});

app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType, message } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: 'Image is required' });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await axios.post(url, {
      system_instruction: { parts: [{ text: MEDICAL_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [
          { text: message || 'Please analyze this medical image and provide your assessment.' },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
        ]
      }]
    }, { headers: { 'Content-Type': 'application/json' } });
    const result = response.data.candidates[0].content.parts[0].text;
    res.json({ success: true, response: result, provider: 'Gemini Vision' });
  } catch (error) {
    console.error('Image analysis error:', error.message);
    res.status(500).json({ success: false, error: 'Image analysis failed.' });
  }
});

app.listen(PORT, function() {
  console.log('Telmed AI Doctor v3.0 running on port ' + PORT);
});
