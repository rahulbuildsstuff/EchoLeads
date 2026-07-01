const { createClient } = require('@deepgram/sdk');
const Groq = require('groq-sdk');
const WebSocket = require('ws');
const fs = require('fs'); // 🚨 NEW: Import the file system module

class AiAgent {
    constructor(twilioSocket, streamSid) {
        this.twilioSocket = twilioSocket;
        this.streamSid = streamSid;
        
        this.isAIResponding = false;
        this.interrupted = false;
        this.chatHistory = [];
        this.abortController = null;

        this.transcriptBuffer = "";

        // 🚨 NEW: Load the brochure into the AI's memory when the call connects
        try {
            this.universityData = fs.readFileSync('./parul_brochure.txt', 'utf8');
        } catch (error) {
            console.error("⚠️ Warning: parul_brochure.txt not found! Using default fallback facts.");
            this.universityData = "150+ Acre campus, 100% placement assistance (Google, Amazon, TCS), Highest package 30 LPA+. 100% online application using 12th-grade marks.";
        }

        this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
        this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        this.deepgramLive = null;
        this.elevenLabsSocket = null;

        this.setupDeepgram();
    }

    // 1. THE EARS (Deepgram) - ENGLISH ONLY
    // 1. THE EARS (Deepgram) - ENGLISH ONLY
    // 1. THE EARS (Deepgram) - ENGLISH ONLY
    setupDeepgram() {
        this.deepgramLive = this.deepgram.listen.live({
            model: 'nova-3', 
            language: 'en-US', 
            smart_format: true,
            encoding: 'mulaw',
            sample_rate: 8000,
            interim_results: true, 
            endpointing: 300,
            vad_events: true // 🚨 NEW: Turns on raw Voice Activity Detection!
        });

        // 🚨 THE ULTIMATE REFLEX: This fires the millisecond you make ANY noise (like "Ah-")
        this.deepgramLive.on('SpeechStarted', () => {
            this.interrupt(); 
        });

        this.deepgramLive.on('Results', (data) => {
            if (!data || !data.channel || !data.channel.alternatives[0]) return;

            const transcript = data.channel.alternatives[0].transcript.trim();

            // 2. COLLECT WORDS: Save finalized word chunks into our holding pen
            if (data.is_final && transcript.length > 0) {
                this.transcriptBuffer += transcript + " ";
            }

            // 3. SEND TO BRAIN: Deepgram confirms you took a breath (300ms pause)
            if (data.speech_final && this.transcriptBuffer.trim().length > 0) {
                const finalQuestion = this.transcriptBuffer.trim();
                console.log(`👤 User: ${finalQuestion}`);
                
                // Send the fully formed question to Groq
                this.generateAIResponse(finalQuestion);
                
                // Clear the holding pen for the next time they speak
                this.transcriptBuffer = ""; 
            }
        });

        this.deepgramLive.on('error', (err) => console.error('Deepgram Error:', err));
    }

    processAudio(audioPayload) {
        if (this.deepgramLive && this.deepgramLive.getReadyState() === 1) {
            this.deepgramLive.send(Buffer.from(audioPayload, 'base64'));
        }
    }

    // 2. THE VOICE (ElevenLabs)
    setupElevenLabs() {
        return new Promise((resolve, reject) => {
            if (this.elevenLabsSocket) {
                this.elevenLabsSocket.close();
            }

            // Make sure your ID is correctly loaded from .env
            const voiceId = process.env.ELEVENLABS_VOICE_ID; 
            const elevenLabsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_turbo_v2_5&output_format=ulaw_8000`;

            const ws = new WebSocket(elevenLabsUrl, {
                headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
            });
            
            this.elevenLabsSocket = ws;

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    text: " ", 
                    voice_settings: { stability: 0.5, similarity_boost: 0.8 }
                }));
                resolve(); 
            });

            ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    if (response.audio) {
                        if (this.twilioSocket && this.twilioSocket.readyState === WebSocket.OPEN) {
                            this.twilioSocket.send(JSON.stringify({
                                event: 'media', 
                                streamSid: this.streamSid, 
                                media: { payload: response.audio }
                            }));
                        }
                    }
                } catch (err) {}
            });

            ws.on('error', (error) => {
                console.error('❌ ElevenLabs WebSocket Error:', error.message);
                reject(error);
            });
        });
    }

    // 3. INTERRUPTION HANDLING
  // 3. INTERRUPTION HANDLING
    interrupt() {
        // 🚨 REMOVED the 'if (this.isAIResponding)' lock!
        // We must clear Twilio's audio buffer every time you speak, 
        // because Twilio might still be playing audio long after Groq has finished generating!
        
        this.isAIResponding = false;
        this.interrupted = true;
        
        try {
            if (this.abortController) this.abortController.abort();
        } catch (e) {}

        // 🚨 THIS IS THE MAGIC BULLET: It instantly wipes the phone line's audio buffer
        if (this.twilioSocket && this.twilioSocket.readyState === WebSocket.OPEN) {
            this.twilioSocket.send(JSON.stringify({ event: 'clear', streamSid: this.streamSid }));
        }
        
        // Close ElevenLabs regardless of its state
        if (this.elevenLabsSocket) {
            this.elevenLabsSocket.close();
        }
    }

    // 4. BRUTAL CLEANUP (Runs when call drops)
    cleanup() {
        console.log('🧹 Cleaning up AI Agent resources & killing background streams...');
        this.interrupted = true; 
        
        try {
            if (this.abortController) this.abortController.abort();
        } catch (e) {}

        try {
            if (this.elevenLabsSocket) {
                // Try to politely flush it only if open
                if (this.elevenLabsSocket.readyState === WebSocket.OPEN) {
                    this.elevenLabsSocket.send(JSON.stringify({ text: "" }));
                }
                // ALWAYS forcefully close it to prevent 1008 zombie timeouts
                this.elevenLabsSocket.close();
            }
        } catch (e) {}

        try {
            if (this.deepgramLive) {
                this.deepgramLive.finish();
            }
        } catch (e) {}
    }

    // 5. THE BRAIN (Groq)
    async generateAIResponse(userText) {
        this.isAIResponding = true;
        this.interrupted = false;
        this.abortController = new AbortController(); 

        try {
            await this.setupElevenLabs(); 

            // 🚨 UPDATED: Inject the brochure data directly into the system prompt
            const systemPrompt = `
            You are a highly persuasive Admissions Counselor for Parul University (Vadodara, Gujarat).
            STRICT RULES:
            - LANGUAGE: You must ONLY speak in English. Never use Hindi, Hinglish, or any other language.
            - BOUNDARIES: NEVER discuss anything other than Parul University. If asked about something else, politely redirect to the university.
            - TONE: Keep answers under 2 short sentences. Be conversational and polite.
            - FORMATTING: NO MARKDOWN, NO EMOJIS, NO ASTERISKS, NO BRACKETS. Plain text only.
            - FACTS ONLY: Use ONLY the information provided in the brochure below. Do not guess or hallucinate.

            === PARUL UNIVERSITY BROCHURE ===
            ${this.universityData}
            === END BROCHURE ===
            `;

            this.chatHistory.push({ role: 'user', content: userText });
            
            if (this.chatHistory.length > 6) {
                this.chatHistory = this.chatHistory.slice(this.chatHistory.length - 6);
            }

            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...this.chatHistory
                ],
                model: 'llama-3.1-8b-instant', 
                stream: true, 
                temperature: 0.2 
            }, { signal: this.abortController.signal });
            
            process.stdout.write('🤖 AI: ');

            let fullAiSentence = ""; 
            let wordBuffer = ""; 

            for await (const chunk of completion) {
                if (this.interrupted) break;

                const textChunk = chunk.choices[0]?.delta?.content || "";
                
                if (textChunk) {
                    fullAiSentence += textChunk; 
                    wordBuffer += textChunk; 

                    // Buffer by spaces to prevent token-splitting glitches
                    if (wordBuffer.match(/[\s\.\!\?\,]/)) {
                        const cleanChunk = wordBuffer.replace(/[\*\[\]\(\)\~_#`]/g, '');
                        if (cleanChunk.trim().length > 0 && this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
                            process.stdout.write(cleanChunk); 
                            this.elevenLabsSocket.send(JSON.stringify({ text: cleanChunk }));
                        }
                        wordBuffer = ""; 
                    }
                }
            }
            
            // Flush remaining buffer
            if (wordBuffer.trim().length > 0 && !this.interrupted && this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
                const finalClean = wordBuffer.replace(/[\*\[\]\(\)\~_#`]/g, '');
                this.elevenLabsSocket.send(JSON.stringify({ text: finalClean }));
            }
            
            console.log(); 
            
            if (!this.interrupted && this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
                this.elevenLabsSocket.send(JSON.stringify({ text: "" })); 
            }

            if (fullAiSentence) {
                this.chatHistory.push({ role: 'assistant', content: fullAiSentence });
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('🛑 Groq stream successfully aborted by system.');
            } else {
                console.error('❌ Groq Generation Error:', error.message);
            }
            
            if (this.elevenLabsSocket) {
                this.elevenLabsSocket.close(); 
            }
        } finally {
            this.isAIResponding = false;
        }
    }
}

module.exports = AiAgent;