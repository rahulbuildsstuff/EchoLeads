const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const Groq = require('groq-sdk');
const WebSocket = require('ws');

class AiAgent {
    constructor(twilioSocket, streamSid) {
        this.twilioSocket = twilioSocket;
        this.streamSid = streamSid;
        this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
        this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        this.deepgramLive = null;
        this.elevenLabsSocket = null;

        this.setupElevenLabs();
        this.setupDeepgram();
    }

    // 1. THE EARS (Deepgram)
    setupDeepgram() {
        this.deepgramLive = this.deepgram.listen.live({
            model: 'nova-2', 
    // ⬇️ Change language to 'multi'
            language: 'multi', 
            smart_format: true,
            encoding: 'mulaw',
            sample_rate: 8000,
        });

        this.deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript && data.is_final) {
                console.log(`👤 User: ${transcript}`);
                this.generateAIResponse(transcript); 
            }
        });
    }

    processAudio(audioPayload) {
        if (this.deepgramLive) {
            this.deepgramLive.send(Buffer.from(audioPayload, 'base64'));
        }
    }

    // 2. THE VOICE (ElevenLabs)
  setupElevenLabs() {
        return new Promise((resolve, reject) => {
            // Replace with your personal VoiceLab ID!
            const voiceId = 'TWutjvRaJqAX89preB4e'; 
            const elevenLabsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_turbo_v2_5&output_format=ulaw_8000`;

            this.elevenLabsSocket = new WebSocket(elevenLabsUrl, {
                headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
            });

            this.elevenLabsSocket.on('open', () => {
                this.elevenLabsSocket.send(JSON.stringify({
                    text: " ", 
                    voice_settings: { stability: 0.5, similarity_boost: 0.8 }
                }));
                resolve(); // 🚨 This tells the Promise we are fully connected
            });

            this.elevenLabsSocket.on('message', (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    
                    if (response.audio) {
                        this.twilioSocket.send(JSON.stringify({
                            event: 'media', 
                            streamSid: this.streamSid, 
                            media: { payload: response.audio }
                        }));
                    } else if (response.error) {
                        console.error('❌ ELEVENLABS API ERROR:', response.error);
                    }
                } catch (err) {
                    console.error('❌ Error parsing ElevenLabs data:', err.message);
                }
            });

            this.elevenLabsSocket.on('error', (error) => {
                console.error('❌ ElevenLabs WebSocket Error:', error.message);
                reject(error);
            });
            
            this.elevenLabsSocket.on('close', (code, reason) => {
                console.log(`🔌 ElevenLabs Connection Closed. Code: ${code}, Reason: ${reason}`);
            });
        });
    }

    // 3. THE BRAIN (Groq)
  async generateAIResponse(userText) {
        try {
            // 🚨 We wait here for the Promise to resolve
            await this.setupElevenLabs(); 

            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a friendly admissions assistant. You must reply in the EXACT SAME LANGUAGE the user speaks. If they speak pure English, reply in English. If they speak pure Hindi, reply in Hindi. If they mix Hindi and English (Hinglish), reply in natural conversational Hinglish. Keep answers under 2 short sentences. No emojis.' 
         },
                    { role: 'user', content: userText }
                ],
                model: 'llama-3.1-8b-instant', 
                stream: true, 
            });
            
            process.stdout.write('🤖 AI: ');
            
            for await (const chunk of completion) {
                const textChunk = chunk.choices[0]?.delta?.content || "";
                
                if (textChunk && this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
                    process.stdout.write(textChunk); 
                    
                    this.elevenLabsSocket.send(JSON.stringify({ 
                        text: textChunk 
                    }));
                }
            }
            
            console.log(); // Adds a clean line break in your terminal
            
            // 🚨 The flush signal to end the audio stream
            if (this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
                this.elevenLabsSocket.send(JSON.stringify({ text: "" })); 
            }
            
        } catch (error) {
            console.error('❌ Groq Generation Error:', error.message);
        }
    }
}

module.exports = AiAgent;