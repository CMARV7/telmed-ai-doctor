# Telmed AI Doctor

> **Specialist-level medical guidance. Any device. Any location. 24/7.**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange.svg)](https://firebase.google.com)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-blue.svg)](https://ai.google.dev)
[![lablab.ai](https://img.shields.io/badge/lablab.ai-Top%20100%20Project-gold.svg)](https://lablab.ai)

---

## Overview

Telmed AI Doctor is an AI-powered telemedicine platform built to close Africa's catastrophic healthcare access gap. Nigeria has only **0.4 doctors per 1,000 people**. For rural and semi-urban communities, qualified medical guidance is simply out of reach — resulting in millions suffering and dying from entirely treatable conditions.

Telmed deploys artificial intelligence as the first line of medical response — available 24 hours a day, 7 days a week, on any internet-enabled device, at **zero cost to the patient.**

---

## The Problem

A woman in the founder's community suffered a concussion and spent over a month being transferred between hospitals with no neurosurgeon available in southeastern Nigeria. The nearest specialist was in London. The delay caused permanent neurological damage.

**She didn't need a miracle. She needed access.**

---

## Features

- **Text-Based Symptom Assessment** — Describe symptoms in natural language and receive a structured clinical interpretation with severity classification
- **Voice Note Interaction** — Send voice notes describing symptoms; the AI transcribes and analyses input in real time
- **Image-Based Diagnosis** — Photograph wounds, rashes, or skin conditions and receive AI-powered diagnostic feedback and treatment recommendations
- **Severity Classification** — Every diagnosis is classified as 🟢 Low / 🟡 Moderate / 🔴 Urgent
- **Medication Management** — Personalised medication schedules, automated dosage reminders, and drug interaction flags
- **Pharmacy Discovery** — Google Places API integration surfaces the nearest verified pharmacy to complete the full care pathway
- **Escalation Intelligence** — Clear triggers indicating when a human doctor is immediately required

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Primary AI Engine** | Google Gemini API |
| **Secondary AI Engine** | DeepSeek API |
| **Image Analysis** | Google Cloud Vision API |
| **Location Services** | Google Places API |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Authentication |
| **Infrastructure** | Google Cloud Platform |
| **Version Control** | GitHub |

---

## Architecture

Telmed operates on a **multi-model cross-validation architecture** — the most critical technical decision in the entire system.

```
Patient Input (Text / Voice / Image)
        │
        ▼
  Input Classification
        │
        ▼
NLP / Vision Processing
        │
        ▼
  Gemini Primary Reasoning ──► DeepSeek Validation
        │                              │
        └──────────┬───────────────────┘
                   ▼
         Cross-Validated Output
                   │
                   ▼
       Severity Classification
       Low / Moderate / Urgent
                   │
                   ▼
        Treatment Pathway +
     Medication Plan + Pharmacy
```

Rather than trusting a single AI model with clinical outputs — which is dangerous in a medical context — Gemini and DeepSeek independently analyse the same patient input and cross-reference results. When models disagree on severity, the system **always escalates conservatively**, prioritising patient safety over response confidence.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account (free Spark tier)
- Google Cloud account (free tier)
- Gemini API key
- DeepSeek API key

### Installation

```bash
# Clone the repository
git clone https://github.com/marv-tech/telmed-ai-doctor.git

# Navigate to project directory
cd telmed-ai-doctor

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# AI Engines
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# Google Cloud
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key
GOOGLE_PLACES_API_KEY=your_places_api_key

# Firebase
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Server
PORT=3000
NODE_ENV=development
```

### Run the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Open your browser and navigate to `http://localhost:3000`

---

## Project Structure

```
telmed-ai-doctor/
├── server/
│   ├── index.js                  # Express.js entry point
│   ├── routes/
│   │   ├── diagnosis.js          # Diagnostic API routes
│   │   ├── medication.js         # Medication management routes
│   │   └── pharmacy.js           # Google Places integration
│   ├── controllers/
│   │   ├── aiDoctor.js           # Gemini + DeepSeek orchestration
│   │   └── visionAnalysis.js     # Cloud Vision pipeline
│   └── middleware/
│       └── auth.js               # Firebase authentication
├── public/
│   ├── index.html                # Main UI
│   ├── css/
│   │   └── styles.css            # Frontend styling
│   └── js/
│       ├── app.js                # Core application logic
│       ├── voice.js              # Voice note handling
│       └── imageUpload.js        # Image capture and compression
├── firebase/
│   └── firestore.js              # Database configuration
├── .env.example                  # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## Design Philosophy

Every technical decision was made with Telmed's actual target user in mind: **a patient in semi-urban Nigeria using a low-end Android device on a 3G network.**

- No heavy frontend frameworks — vanilla JavaScript ensures fast load times on constrained connections
- Client-side image compression before Vision API submission to reduce data consumption
- Progressive response rendering — critical clinical information loads first
- Offline-resilient session caching so partial connectivity does not destroy an active diagnostic interaction

---

## Proof of Concept

Telmed is built on validated foundations. In December 2025, **HighAI** — an AI blood pressure specialist — was built and deployed on AWS for an AWS DevPost Hackathon. HighAI proved the core AI doctor diagnostic loop works reliably in a live production environment.

Telmed is HighAI, scaled to the full spectrum of primary care.

**Personal validation:** The founder suffered from a skin condition for three years that multiple clinics failed to diagnose. He photographed the affected area, described symptoms to an AI, received an accurate diagnosis with a treatment list costing ₦1,400. Within one month, a three-year problem had completely cleared. The founder is the first verified user.

---

## Hackathon Recognition

- 🏆 **Top 100 Project** — AI Agent Olympics Hackathon, lablab.ai (May 2026) — out of 3,000+ applicants
- 📜 **Certificate of Outstanding Performance** — lablab.ai / NativelyAI
- 🔬 **AWS DevPost Hackathon** — HighAI predecessor project (December 2025)

---

## Roadmap

| Phase | Timeline | Milestone |
|---|---|---|
| **Phase 1** | Current | Prototype validation with real users in southeastern Nigeria |
| **Phase 2** | Year 1–2 | Clinical partnerships with Nigerian hospitals and NGOs |
| **Phase 3** | Year 2–3 | Full platform — human doctor consultations, specialist referrals |
| **Phase 4** | Year 3–4 | Continental expansion — Ghana, Kenya, Ethiopia, South Africa |
| **Phase 5** | Year 5 | Proprietary AI model trained on African-specific clinical data |

---

## Contributing

Contributions, issues, and feature requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Author

**Marvelous Chinwendu Uzoma**
MARV-TECH · Aba, Nigeria

- GitHub: [@marv-tech](https://github.com/marv-tech)
- Email: chinwendumarvelous7@gmail.com

---

## Disclaimer

Telmed AI Doctor is an AI-powered medical guidance tool and does not replace professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider for medical conditions. When the system classifies a condition as Urgent, seek immediate medical attention.

---

*Telmed is not a product. It is infrastructure.*
*The kind Africa should have built a decade ago.*

---

> *"I know I will make it. Our future is viable. I believe, and I keep pushing."*
> — Marvelous Chinwendu Uzoma
