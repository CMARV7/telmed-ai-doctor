const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

// Load environment variables for local testing
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
- Be conversational and warm, like a real doctor (be friendly, empathetic, and supportive).
- Keep responses under 120 words unless condition is serious or complex.
- Suggest possible conditions when symptoms are described (clear these are possibilities, not a diagnosis).
- Recommend medications available in Nigeria (like paracetamol, amoxicillin, etc.) when appropriate.
- Give simple treatment steps generic enough to be safe (rest, hydration).
- Urge immediate hospital visit for emergency symptoms (chest pain, breathing issues).
- Talk naturally: "Based on what you've described, this sounds like it could be... but it's important to see a doctor for an accurate diagnosis."`; 

// --- API PROVIDER FUNCTIONS ---

async function getGeminiResponse(messages) {
  // Using the 2026 stable Gemini 3.1 Flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await axios.post(url, {
    system_instruction: { parts: [{ text: MEDICAL_PROMPT }] },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  }, { headers: { 'Content-Type': 'application/json' } });
  return { text: response.data.candidates[0].content.parts[0].text, provider: 'Gemini' };
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

async function getGroqResponse(messages) {
  // Using the latest stable Llama 3.3 model
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama-3.3-70b-versatile', 
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

// --- LOGIC FOR ORDER: GEMINI -> OPENROUTER -> GROQ ---

async function getAIResponse(messages) {
  // 1. TRY GEMINI FIRST
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('Attempting Gemini (Primary)...');
      return await getGeminiResponse(messages);
    } catch (e) {
      console.error('Gemini failed, falling back to OpenRouter...');
    }
  }

  // 2. TRY OPENROUTER SECOND
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log('Attempting OpenRouter (Secondary)...');
      return await getOpenRouterResponse(messages);
    } catch (e2) {
      console.error('OpenRouter failed, falling back to Groq...');
    }
  }

  // 3. TRY GROQ LAST
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('Attempting Groq (Final Fallback)...');
      return await getGroqResponse(messages);
    } catch (e3) {
      console.error('Groq Error Detail:', e3.response ? e3.response.data : e3.message);
    }
  }

  throw new Error("All AI services failed. Check API keys and quotas.");
}

// --- ROUTES ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'Telmed AI Doctor is running', version: '3.0' });
});

// Regular Chat Route
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
    const messages = [...(history || []), { role: 'user', content: message }];
    const result = await getAIResponse(messages);
    console.log('Chat success with ' + result.provider);
    res.json({ success: true, response: result.text, provider: result.provider });
  } catch (error) {
    console.error('Chat failed:', error.message);
    res.status(500).json({ success: false, error: 'AI service currently unavailable. Please try again.' });
  }
});

// Image Analysis Route (Always uses Gemini)
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType, message } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: 'Image is required' });
    
    console.log('Processing medical image with Gemini Vision...');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await axios.post(url, {
      system_instruction: { parts: [{ text: MEDICAL_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [
          { text: message || 'Please analyze this medical image for any visible health concerns.' },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
        ]
      }]
    }, { headers: { 'Content-Type': 'application/json' } });
    
    const result = response.data.candidates[0].content.parts[0].text;
    res.json({ success: true, response: result, provider: 'Gemini Vision' });
  } catch (error) {
    console.error('Image analysis error:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, error: 'Image analysis failed. Please ensure your Gemini API key is valid.' });
  }
});

app.listen(PORT, function() {
  console.log('Telmed AI Doctor v3.0 running on port ' + PORT);
});
