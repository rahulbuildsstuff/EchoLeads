# 🎙️ **EchoLeads: Real-Time AI Voice Agent 🤖**

> **EchoLeads** is an enterprise-grade, event-driven full-stack application that transforms a simple frontend form submission into a powerful multi-channel automated communication system. Upon form submission, it instantly triggers **Email notifications**, **WhatsApp messages**, and a **real-time AI outbound phone call** to the user.

This project tackles some of the hardest engineering problems in **Voice AI**, including:

- ⚡ Sub-second response latency
- 🧠 Dynamic Context Injection (RAG)
- 🛑 Human Interruption Handling (Barge-in)
- 🔄 Real-Time Bi-directional Audio Streaming using Raw WebSockets

---

# ✨ Core Features

### ⚡ Parallel Asynchronous Dispatch

Instantly triggers multiple services in parallel without blocking the React frontend.

- 📧 Email using **Nodemailer**
- 💬 WhatsApp using **Twilio API**
- 📞 AI Voice Call using **Twilio Voice API**

---

### 🗣️ Real-Time WebSocket Streaming

- Bi-directional audio streaming between Twilio and AI services.
- Streams raw audio in milliseconds.
- Maintains ultra-low latency conversations.

---

### 🧠 Context Injection (RAG)

Uses a local knowledge base (`parul_brochure.txt`) to inject factual context into the LLM prompt.

Benefits:

- Prevents hallucinations
- Domain-specific responses
- Easy to customize for any organization

---

### 🛑 Instant Interruption Handling (Barge-in)

Uses **Deepgram Voice Activity Detection (VAD)** to immediately detect when a human starts speaking.

The AI instantly:

- Stops audio generation
- Clears Twilio audio buffer
- Cancels pending LLM generation
- Starts listening again

---

### 🛡️ Robust Error Handling

Built for production-grade reliability.

Includes:

- AbortController
- Graceful WebSocket teardown
- Memory leak prevention
- Zombie stream prevention
- Automatic cleanup on call disconnect

---

# 🏗️ Architecture & Workflow

## 1️⃣ User Submission

The user enters:

- Name
- Email
- Phone Number

through the React frontend.

⬇️

## 2️⃣ Instant Backend Dispatch

The Express backend immediately returns **HTTP 200 OK** to the frontend.

Meanwhile it launches three background tasks simultaneously:

- 📧 Email
- 💬 WhatsApp
- 📞 AI Phone Call

⬇️

## 3️⃣ Twilio TwiML Handshake

When the user answers the phone:

- Twilio requests TwiML instructions from the backend through **Ngrok**
- Connection upgrades into a **Bi-directional WebSocket**

⬇️

## 4️⃣ The AI Loop (Sub-second Latency)

### 👂 Ears — Deepgram

- Receives raw μ-law audio from Twilio
- Converts speech into text
- Uses:
  - Voice Activity Detection
  - Interim Results
  - SpeechStarted events

⬇️

### 🧠 Brain — Groq + Llama 3.1

Processes:

- User transcript
- Injected knowledge base
- Conversation history

Streams generated tokens in real time.

⬇️

### 🗣️ Mouth — ElevenLabs

- Receives streamed tokens
- Converts them into natural speech
- Streams audio bytes directly back to Twilio

Result:

**Natural real-time phone conversation.**

---

# 💻 Technology Stack

## 🎨 Frontend

- React.js (Vite)
- React Hook Form
- Tailwind CSS

---

## ⚙️ Backend

- Node.js
- Express.js

---

## 🌐 Networking

- WebSockets (`ws`)
- Ngrok

---

## ☎️ Telephony & Messaging

- Twilio Voice API
- Twilio WhatsApp Business Sandbox

---

## 🎤 Speech-to-Text (STT)

- Deepgram
- Model: **nova-3**
- Voice Activity Detection (VAD)
- Interim Results

---

## 🧠 Large Language Model

- Groq
- Model: **llama-3.1-8b-instant**

---

## 🔊 Text-to-Speech (TTS)

- ElevenLabs
- Model: **eleven_turbo_v2_5**

---

# ⚙️ Installation & Setup

## Prerequisites

You'll need API keys for the following services:

- Twilio
  - Account SID
  - Auth Token
  - Phone Number
  - WhatsApp Sandbox

- Deepgram

- Groq

- ElevenLabs

- Ngrok (Free Tier)

- Gmail App Password (for Nodemailer)

---

# 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/echoleads.git

cd echoleads
```

---

# 2️⃣ Backend Setup

```bash
cd echoleads-backend

npm install
```

Create a `.env` file inside **echoleads-backend**

```env
# ===========================
# Server
# ===========================

PORT=5000
NGROK_URL=your-ngrok-url.ngrok-free.app

# ===========================
# Twilio Credentials
# ===========================

TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
TWILIO_PHONE_NUMBER=+1234567890

# ===========================
# Email Credentials
# ===========================

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# ===========================
# AI API Keys
# ===========================

DEEPGRAM_API_KEY=your_deepgram_key

GROQ_API_KEY=your_groq_key

ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id
```

---

## 📚 Create the Knowledge Base

Create a file named:

```text
parul_brochure.txt
```

Place it inside the backend root folder.

Add summarized bullet-point facts that the AI should use while answering questions.

Example:

```text
• Parul University was established in 2015.

• NAAC A++ Accredited.

• Offers 250+ programs.

• Located in Vadodara, Gujarat.
```

---

# 3️⃣ Frontend Setup

```bash
cd ../echoleads-frontend

npm install
```

---

# 🚀 Running the Project

You'll need **three terminal windows** running simultaneously.

---

## 🖥️ Terminal 1 — Start Ngrok

```bash
ngrok http 5000
```

Copy the forwarding URL (without `https://`) and update:

```env
NGROK_URL=your-ngrok-url.ngrok-free.app
```

---

## 🖥️ Terminal 2 — Start Backend

```bash
cd echoleads-backend

node server.js
```

---

## 🖥️ Terminal 3 — Start Frontend

```bash
cd echoleads-frontend

npm run dev
```

---

Visit:

```
http://localhost:5173
```

Fill out the form and wait for your phone to ring!

---

# 🧠 Advanced Engineering Highlights

## 🚀 The "Time-Travel" Bug Fix

One of the hardest Voice AI problems is that Twilio buffers audio while Node.js continues executing.

Solution:

- Decoupled execution state from playback state.
- Forced an immediate:

```json
{
  "event": "clear"
}
```

command to Twilio the exact millisecond **Deepgram SpeechStarted** event fires.

Result:

✅ True real-time conversational interruption.

---

## 🧩 Token-Splitting Traps & Word Buffering

Streaming LLM tokens often split words into multiple fragments.

Example:

```
Hel
lo
```

Directly sending these fragments to ElevenLabs caused:

- Broken pronunciation
- Crashes
- Garbled speech

Solution:

Implemented a custom transcript buffer:

```javascript
this.transcriptBuffer
```

that waits until complete words are formed before forwarding them to ElevenLabs.

Result:

- Smooth speech
- Natural pronunciation
- Stable TTS pipeline

---

## 🛑 Aborting Ghost Requests

When users interrupt or hang up:

- Pending Groq HTTP requests continue consuming bandwidth.
- Memory usage increases.
- Zombie requests remain alive.

Solution:

Integrated Node.js native:

```javascript
AbortController
```

to immediately terminate pending requests.

Benefits:

- Lower bandwidth
- Reduced memory usage
- Cleaner resource management
- Production-grade reliability

---

# 📂 Project Flow Summary

```text
React Form
     │
     ▼
Express Backend
     │
     ├──────────────► Email (Nodemailer)
     │
     ├──────────────► WhatsApp (Twilio)
     │
     └──────────────► Voice Call (Twilio)
                           │
                           ▼
                  WebSocket Connection
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        Deepgram        Groq LLM    ElevenLabs
          STT            (Brain)        TTS
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                     Twilio Phone Call
```

---

# ❤️ Built With

- 💻 Node.js
- ⚛️ React
- ☁️ Twilio
- 🎤 Deepgram
- 🧠 Groq
- 🔊 ElevenLabs
- 🌐 WebSockets

---

# 👨‍💻 Author

**Built with 💻 and ☕ by Rahul**

---

## ⭐ If you found this project useful, consider giving it a star on GitHub!