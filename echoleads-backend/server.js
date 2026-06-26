const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Allows Express to parse JSON data from React

// 1. Initialize API Clients
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});