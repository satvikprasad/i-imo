import express, { Request, Response } from "express";
import OpenAI, { toFile } from "openai"

import dotenv from "dotenv"
import { Session } from "inspector";

// Source env
dotenv.config();

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
})

const app = express();

app.get("/", (req: Request, res: Response) => {
    res.send('Hello World');
});

app.use(express.raw({
    type: 'application/octet-stream',
    limit: '50mb'
}));

interface TranscriptionSession {
    chunks: Buffer[];
    transcripts: string[];
    lastActivity: number;
}

const sessions = new Map<string, TranscriptionSession>();

function pcmToWav(pcm: Buffer, sampleRate: number) {
    const header = Buffer.alloc(44);
    
    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    
    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);           // PCM
    header.writeUInt16LE(1, 20);            // PCM format
    header.writeUInt16LE(1, 22);            // Mono
    header.writeUInt32LE(sampleRate, 24);   // Sample rate
    header.writeUInt32LE(sampleRate * 2, 28); // Byte rate (sampleRate * channels * bitsPerSample/8)
    header.writeUInt16LE(2, 32);            // Block align
    header.writeUInt16LE(16, 34);           // 16-bit
    
    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    
    return Buffer.concat([header, pcm]);
}

app.post("/omi/audio", async (req: Request, res: Response) => {
    const { sample_rate: sampleRate, uid: uid } = req.query;    

    if (!sampleRate) {
        res.status(400).json({
            error: "Did not recieve sample rate."
        });

        return;
    }

    const octetData: Buffer = req.body;

    if (octetData instanceof Buffer) {
        console.log(`Recieved ${octetData.length} bytes of audio data.`);

        try {
            if (!sessions.has(uid as string)) {
                sessions.set(uid as string, {
                    chunks: [],
                    transcripts: [],
                    lastActivity: Date.now()
                })
            }

            const session = sessions.get(uid as string)!;

            session.chunks.push(octetData);
            session.lastActivity = Date.now();

            if (session.chunks.length > 3) {
                session.chunks.shift();
            }

            const combinedPcm = Buffer.concat(session.chunks);

            const wavFile = pcmToWav(combinedPcm, parseInt(sampleRate as string));

            const file = await toFile(wavFile, "audio.wav", {
                type: "audio/wav"
            });

            const transcription = await client.audio.transcriptions.create({
                file: file,
                model: "whisper-large-v3-turbo",
                response_format: "json",
                language: "en",
                temperature: 0.0
            });

            console.log(`Transcribed: ${transcription.text}.`);

            res.send(200);
        } catch(error) {
            console.error(error);

            res.status(500).json({
                error: 'Transcription failed',
                message: error instanceof Error ? error.message : "Unknown error"
            });
        }
    } else {
        res.json({
            error: 'Invalid request body'
        }).status(400);
    }
});

app.listen(process.env.PORT || 3000, () => {});