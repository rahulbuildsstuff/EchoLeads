const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();
const AiAgent = require('./AiAgent');


const app = express();
app.use(cors());
app.use(express.json()); // Allows Express to parse JSON data from React

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/audio-stream' });

// 1. Initialize API Clients
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

wss.on('connection', (ws) => {
  console.log('✅ Twilio connected to the WebSocket!');
  let agent = null; 

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    if (data.event === 'start') {
      console.log('🎙️ Audio stream started. ID:', data.start.streamSid);
      agent = new AiAgent(ws, data.start.streamSid); // Boot up the AI Brain!
    } else if (data.event === 'media' && agent) {
      agent.processAudio(data.media.payload); // Pass raw audio to the AI
    } else if (data.event === 'stop') {
      console.log('❌ Audio stream stopped.');
       if (agent) {
          agent.cleanup(); // 🚨 NEW: Forcefully kill all AI background tasks!
      }
      agent = null; 
    }
  });
  ws.on('close', () => {
    console.log('❌ Twilio WebSocket connection closed.');
    if (agent) {
        agent.cleanup(); // 🚨 NEW: Catch unexpected disconnections too
    }
    agent = null;
  });
});

app.post('/api/twiml', (req, res) => {
  console.log('🚨 TWILIO IS FETCHING TWIML!');
  const twiml = `
    <Response>
      <Say>Connecting you to EchoLeads AI. Please wait.</Say>
      <Connect><Stream url="wss://${process.env.NGROK_URL}/audio-stream" /></Connect>
    </Response>`;
  res.type('text/xml');
  res.send(twiml);
});

// 2. The Main API Route
app.post('/api/inquiry', (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Please provide all details.' });
  }

  // Instantly reply to the React frontend
  res.status(200).json({ message: 'Inquiry received successfully!' });

  // 3. Fire parallel background notifications
  sendEmailNotification(name, email).catch(console.error);
  sendWhatsAppNotification(name, phone).catch(console.error);
  triggerAICall(name, phone).catch(console.error); 
});

// --- Helper Functions ---

async function sendEmailNotification(name, userEmail) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Welcome to EchoLeads!',
    html: `
      <h2>Hello ${name},</h2>
      <p>Thank you for reaching out! We have successfully logged your details into the EchoLeads system.</p>
      <p>An agent will review your inquiry and be in touch shortly.</p>
    `
  };
  await transporter.sendMail(mailOptions);
  console.log(`Email sent successfully to ${userEmail}`);
}

async function sendWhatsAppNotification(name, phone) {
  // Ensure the phone number has a + country code (e.g., +919876543210)
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; 
  
  await twilioClient.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${formattedPhone}`,
    body: `Hello ${name}, thank you for connecting with EchoLeads! We have logged your details into our real-time system and will be in touch soon.`
  });
  console.log(`WhatsApp message sent successfully to ${formattedPhone}`);
}


async function triggerAICall(name, phone) {
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; 
  
  // 1. We are hardcoding the EXACT URL here to bypass any .env errors.
  // We also added the Ngrok warning bypass just to be safe!
  const twilioInstructionsUrl = 'https://tropics-oxymoron-mortality.ngrok-free.dev/api/twiml?ngrok-skip-browser-warning=true';
  
  console.log(`🔗 Telling Twilio to fetch instructions from: ${twilioInstructionsUrl}`);

  try {
    const call = await twilioClient.calls.create({
      url: twilioInstructionsUrl, 
      to: formattedPhone,
      from: process.env.TWILIO_CALLER_ID 
    });
    console.log(`📞 OUTBOUND CALL INITIATED to ${formattedPhone}. Call SID: ${call.sid}`);
  } catch (error) {
    console.error('❌ Failed to initiate call:', error.message);
  }
}

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});