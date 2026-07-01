EchoLeads: Real-Time AI Voice Agent 🎙️🤖

EchoLeads is an enterprise-grade, event-driven full-stack application. It transforms a simple frontend form submission into a multi-channel automated response system. Upon submission, it instantly triggers parallel Email notifications, WhatsApp messages, and a live, real-time AI outbound phone call to the user.

This project solves the hardest challenges in Voice AI, achieving sub-second latency, dynamic context injection (RAG), and flawless human interruption handling (Barge-in) using raw WebSockets.

✨ Core Features

⚡ Parallel Asynchronous Dispatch: Instantly fires Nodemailer (Email), Twilio (WhatsApp), and Twilio (Voice) APIs simultaneously without blocking the React frontend.

🗣️ Real-Time WebSocket Streaming: Bi-directional audio streaming bridging cellular networks and AI microservices in milliseconds.

🧠 Context Injection (RAG): Dynamically reads local knowledge base files (e.g., parul_brochure.txt) to ground the LLM in factual, domain-specific data, preventing hallucinations.

🛑 Instant Interruption Handling (Barge-in): Utilizes Deepgram's Voice Activity Detection (VAD) to instantly halt AI audio generation the millisecond a human speaker interrupts.

🛡️ Robust Error Handling: Implements AbortController and graceful WebSocket teardowns to prevent memory leaks and "zombie streams" when calls drop.

🏗️ Architecture & Workflow

The Trigger: User submits their details (Name, Email, Phone) via the React frontend.

The Dispatch: Node.js Express backend instantly replies 200 OK to the frontend, while firing off background tasks (Email, WhatsApp, Phone Call).

The TwiML Handshake: The user picks up the phone. Twilio fetches XML instructions via Ngrok and upgrades the connection to a bi-directional WebSocket.

The AI Loop (Sub-second Latency):

Ears (Deepgram): Streams raw ulaw audio from Twilio to text in real-time, utilizing SpeechStarted events for instant reflex detection.

Brain (Groq + Llama 3.1): Processes the text against the injected system prompt (Parul University Brochure) and streams text tokens out.

Mouth (ElevenLabs): Converts incoming buffered text tokens into human-like audio bytes and pushes them directly back to the Twilio phone line.

💻 Technology Stack

Frontend:

React.js (Vite)

React Hook Form (Validation & State)

Tailwind CSS (Styling)

Backend & AI Engine:

Server: Node.js, Express.js

Network: WebSockets (ws), Ngrok

Telephony & Messaging: Twilio API (Voice & WhatsApp Business Sandbox)

Speech-to-Text (STT): Deepgram (nova-3 model with VAD & Interim Results)

LLM Inference: Groq (llama-3.1-8b-instant)

Text-to-Speech (TTS): ElevenLabs (eleven_turbo_v2_5)

⚙️ Installation & Setup

Prerequisites

You will need API keys for the following services:

Twilio (Account SID, Auth Token, Phone Number, WhatsApp Sandbox)

Deepgram

Groq

ElevenLabs

Ngrok (Free tier)

An App Password for a Gmail account (for Nodemailer)

1. Clone the Repository

git clone [https://github.com/yourusername/echoleads.git](https://github.com/yourusername/echoleads.git)
cd echoleads


2. Backend Setup

cd echoleads-backend
npm install


Create a .env file in the echoleads-backend directory:

# Server
PORT=5000
NGROK_URL=your-ngrok-url.ngrok-free.app

# Twilio Credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
TWILIO_PHONE_NUMBER=+1234567890

# Email Credentials
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# AI API Keys
DEEPGRAM_API_KEY=your_deepgram_key
GROQ_API_KEY=your_groq_key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id


Create the Knowledge Base:
Create a file named parul_brochure.txt in the root of the backend folder and add your summarized bullet-point facts for the AI to read.

3. Frontend Setup

cd ../echoleads-frontend
npm install


🚀 How to Run

You will need three separate terminal windows running simultaneously:

Terminal 1: Start Ngrok

ngrok http 5000


(Copy the forwarding URL (without https://) and paste it into your backend .env file as NGROK_URL)

Terminal 2: Start Backend

cd echoleads-backend
node server.js


Terminal 3: Start Frontend

cd echoleads-frontend
npm run dev


Visit http://localhost:5173, fill out the form, and wait for your phone to ring!

🧠 Advanced Engineering Highlights

The "Time-Travel" Bug Fix: Decoupled the Node.js execution state from Twilio's slower audio playback buffer. By forcing a strict event: 'clear' command the exact millisecond Voice Activity is detected by Deepgram, the AI achieves true, instant conversational barge-in.

Token-Splitting Traps & Word Buffering: Engineered a custom Word Buffer (this.transcriptBuffer) to prevent partial multi-byte tokens from crashing the ElevenLabs TTS engine, ensuring flawless pronunciation.

Aborting Ghost Requests: Integrated Node's native AbortController to physically sever pending HTTP requests to the Groq LLM if a user interrupts or drops the call, saving bandwidth and preventing severe memory leaks.

Built with 💻 and ☕ by Rahul.