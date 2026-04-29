const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// FIREBASE SETUP
const admin = require('firebase-admin');
let db = null;

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ?
        process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    })
  });
  db = admin.firestore();
  console.log('✓ Firebase connected');
} catch (err) {
  console.log('Firebase not connected - running without database');
}

// MEDICAL PROMPT
const MEDICAL_PROMPT = `You are Dr. Telmed, an autonomous AI medical agent helping patients in Nigeria, West Africa and worldwide with vast medical knowledge and experience.

RULES:
- Keep responses under 100 words unless emergency
- Be warm, direct and conversational
- Never repeat disclaimers in every message

AUTONOMOUS BEHAVIOR:
- EMERGENCY: Start with 🚨 - urge immediate hospital visit
- SEVERE: Strongly recommend seeing a doctor today
- MODERATE: Suggest home care and monitor symptoms
- MILD: Give simple friendly home remedy advice

RESPONSE FORMAT:
1. Acknowledge symptom warmly
2. State most likely condition
3. Give 2-3 clear action steps
4. Add disclaimer ONLY if SEVERE or EMERGENCY`;

// SEVERITY ASSESSMENT
function assessSeverity(message) {
  const msg = message.toLowerCase();

  const emergency = [
    'chest pain','heart attack','stroke','cant breathe',
    'cannot breathe','difficulty breathing','unconscious',
    'seizure','severe bleeding','overdose','suicide',
    'poisoning','choking','no pulse','collapsed'
  ];

  const severe = [
    'high fever','severe pain','blood in urine','blood in stool',
    'coughing blood','vomiting blood','severe headache',
    'confusion','numbness','paralysis','severe allergic',
    'swollen throat','cant swallow','yellow eyes','jaundice'
  ];

  const moderate = [
    'fever','persistent','getting worse','three days',
    'one week','two weeks','infection','swollen',
    'discharge','painful urination','rash spreading'
  ];

  for (let k of emergency) { if (msg.includes(k)) return 'EMERGENCY'; }
  for (let k of severe) { if (msg.includes(k)) return 'SEVERE'; }
  for (let k of moderate) { if (msg.includes(k)) return 'MODERATE'; }
  return 'MILD';
}

// AI FUNCTIONS - Gemini PRIMARY, Groq SECOND, OpenRouter THIRD
async function getGeminiResponse(messages, severity) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;
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

async function getGroqResponse(messages, severity) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: MEDICAL_PROMPT + '\nSeverity: ' + severity },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      ],
      temperature: 0.7,
      max_tokens: 300
    },
    {
      headers: {
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );
  return {
    text: response.data.choices[0].message.content,
    provider: 'Groq'
  };
}

async function getOpenRouterResponse(messages, severity) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'mistralai/mistral-nemo',
      messages: [
        { role: 'system', content: MEDICAL_PROMPT + '\nSeverity: ' + severity },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      ],
      temperature: 0.7,
      max_tokens: 300
    },
    {
      headers: {
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://telmed-ai-doctor.onrender.com',
        'X-Title': 'Telmed AI Doctor'
      }
    }
  );
  return {
    text: response.data.choices[0].message.content,
    provider: 'OpenRouter'
  };
}

async function getAIResponse(messages, severity) {
  // Gemini FIRST (most intelligent)
  try {
    return await getGeminiResponse(messages, severity);
  } catch (e) {
    console.log('Gemini failed, trying Groq...');
    // Groq SECOND
    try {
      return await getGroqResponse(messages, severity);
    } catch (e2) {
      console.log('Groq failed, trying OpenRouter...');
      // OpenRouter THIRD
      return await getOpenRouterResponse(messages, severity);
    }
  }
}

// FIREBASE SAVE
async function saveConsultation(sessionId, userMessage, aiResponse, severity) {
  if (!db) return;
  try {
    await db.collection('consultations').add({
      sessionId,
      userMessage,
      aiResponse,
      severity,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      platform: 'Telmed AI Doctor'
    });
    console.log('✓ Saved to Firebase');
  } catch (err) {
    console.log('Firebase save failed:', err.message);
  }
}

async function saveEmergencyAlert(sessionId, message, severity) {
  if (!db) return;
  if (severity !== 'EMERGENCY' && severity !== 'SEVERE') return;
  try {
    await db.collection('emergency_alerts').add({
      sessionId,
      message,
      severity,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'unresolved'
    });
    console.log('🚨 Emergency alert saved!');
  } catch (err) {
    console.log('Firebase emergency save failed:', err.message);
  }
}

// ROUTES
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Telmed AI Doctor v4.0 - Autonomous Agent',
    firebase: db ? 'connected' : 'not connected',
    aiOrder: 'Gemini → Groq → OpenRouter'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, sessionId } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const severity = assessSeverity(message);
    console.log('Severity: ' + severity + ' | ' + message.substring(0, 40));

    const messages = [...(history || []), { role: 'user', content: message }];
    const result = await getAIResponse(messages, severity);

    const sid = sessionId || 'anon_' + Date.now();
    await saveConsultation(sid, message, result.text, severity);
    await saveEmergencyAlert(sid, message, severity);

    console.log('✓ Response from ' + result.provider + ' | Severity: ' + severity);

    res.json({
      success: true,
      response: result.text,
      severity: severity,
      sessionId: sid
    });

  } catch (error) {
    const err = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('All APIs failed:', err);
    res.status(500).json({
      success: false,
      error: 'AI service unavailable. Please try again.'
    });
  }
});

app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType, message, sessionId } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Image is required' });
    }

    const severity = assessSeverity(message || '');

    // Always use Gemini for image analysis
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;
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
    const sid = sessionId || 'anon_' + Date.now();
    await saveConsultation(sid, 'IMAGE: ' + (message || 'No description'), result, severity);

    res.json({
      success: true,
      response: result,
      severity: severity,
      sessionId: sid
    });

  } catch (error) {
    const err = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('Image error:', err);
    res.status(500).json({
      success: false,
      error: 'Image analysis failed. Please try again.'
    });
  }
});

app.get('/api/history/:sessionId', async (req, res) => {
  if (!db) return res.json({ success: true, history: [] });
  try {
    const snapshot = await db.collection('consultations')
      .where('sessionId', '==', req.params.sessionId)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    const history = [];
    snapshot.forEach(doc => history.push({ id: doc.id, ...doc.data() }));
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch history' });
  }
});

app.get('/api/emergencies', async (req, res) => {
  if (!db) return res.json({ success: true, alerts: [] });
  try {
    const snapshot = await db.collection('emergency_alerts')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    const alerts = [];
    snapshot.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch alerts' });
  }
});

app.listen(PORT, function() {
  console.log('========================================');
  console.log('  Telmed AI Doctor v4.0 - Autonomous');
  console.log('  Running on http://localhost:' + PORT);
  console.log('  AI: Gemini → Groq → OpenRouter');
  console.log('========================================');
});