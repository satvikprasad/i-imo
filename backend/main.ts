import express, { Request, Response } from "express";
import OpenAI, { toFile } from "openai";

import dotenv from "dotenv";

import { CloudClient as ChromaClient } from "chromadb";

import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

import cors from "cors";

// Source env
dotenv.config();

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const chromaClient = new ChromaClient({
    apiKey: process.env.CHROMA_API_KEY,
    tenant: process.env.CHROMA_TENANT,
    database: "omi",
});

const app = express();

app.use(cors());

app.get("/", async (req: Request, res: Response) => {
    res.send(200);
});

app.use(
    express.raw({
        type: "application/octet-stream",
        limit: "50mb",
    })
);

interface TranscriptionSession {
    chunks: Buffer[];
    transcripts: string[];
    lastActivity: number;
}

interface ParsedNameResponse {
    isSpeakingToPerson: boolean;
    name: string | null;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    evidence: string;
}

const sessions = new Map<string, TranscriptionSession>();

function pcmToWav(pcm: Buffer, sampleRate: number) {
    const header = Buffer.alloc(44);

    // RIFF header
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write("WAVE", 8);

    // fmt chunk
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16); // PCM
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(1, 22); // Mono
    header.writeUInt32LE(sampleRate, 24); // Sample rate
    header.writeUInt32LE(sampleRate * 2, 28); // Byte rate (sampleRate * channels * bitsPerSample/8)
    header.writeUInt16LE(2, 32); // Block align
    header.writeUInt16LE(16, 34); // 16-bit

    // data chunk
    header.write("data", 36);
    header.writeUInt32LE(pcm.length, 40);

    return Buffer.concat([header, pcm]);
}

app.post("/omi/audio", async (req: Request, res: Response) => {
    const { sample_rate: sampleRate, uid } = req.query;

    const sr = Number(sampleRate);

    if (!uid || typeof uid != "string") {
        return res.status(400).json({ error: "Missing uid" });
    }

    if (!sampleRate || Number.isNaN(sr) || sr <= 0) {
        res.status(400).json({
            error: "Invalid sample_rate",
        });

        return;
    }

    const octetData: Buffer = req.body;

    if (octetData instanceof Buffer) {
        try {
            if (!sessions.has(uid)) {
                sessions.set(uid, {
                    chunks: [],
                    transcripts: [],
                    lastActivity: Date.now(),
                });
            }

            const session = sessions.get(uid)!;

            session.chunks.push(octetData);
            session.lastActivity = Date.now();

            if (session.chunks.length > 6) {
                session.chunks.shift();
            }

            const combinedPcm = Buffer.concat(session.chunks);

            const wavFile = pcmToWav(
                combinedPcm,
                parseInt(sampleRate as string)
            );

            const file = await toFile(wavFile, "audio.wav", {
                type: "audio/wav",
            });

            const transcription = await client.audio.transcriptions.create({
                file: file,
                model: "whisper-large-v3-turbo",
                response_format: "json",
                language: "en",
                temperature: 0.0,
            });

            const completion = await client.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Analyze conversations to detect if the user is speaking to a real person and extract that person\'s name.
                        
                        Return ONLY valid JSON:
                        {
                            "isSpeakingToPerson": true/false,
                            "name": [detected name]/null,
                            "confidence": "HIGH"/"MEDIUM"/"LOW",
                            "evidence": "brief reason"
                        }.
                        
                        DON'T format it as a code block, just raw text. 
                        Prioritise information at the end of the conversation rather than the beginning.`,
                    },
                    {
                        role: "user",
                        content: `Conversation:\n${transcription.text}`,
                    },
                ],
                model: "llama-3.3-70b-versatile",
            });

            const collection = await chromaClient.getOrCreateCollection({
                name: `transcriptions`,
                embeddingFunction: new OpenAIEmbeddingFunction({
                    modelName: "text-embedding-3-small",
                    apiKey: process.env.OPENAI_API_KEY,
                }),
            });

            await collection.upsert({
                documents: [transcription.text],
                ids: [Date.now().toString()],
            });

            const result = JSON.parse(
                completion.choices[0].message.content ?? "{}"
            ) as ParsedNameResponse;

            console.log(
                `${result.name}: ${result.confidence} [${transcription.text}]`
            );

            if (result.name && result.confidence == "HIGH") {
                try {
                    const response = await fetch(
                        "http://167.99.189.49:8000/detect",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                name: result.name,
                            }),
                        }
                    );

                    console.log(await response.json());
                } catch (error) {
                    console.error(error);
                }
            }

            res.sendStatus(200);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Transcription failed",
                message:
                    error instanceof Error ? error.message : "Unknown error",
            });
        }
    } else {
        res.json({
            error: "Invalid request body",
        }).status(400);
    }
});

app.get("/omi/profiles", async (req, res) => {
    let { name, profiles } = req.query;

    const collection = await chromaClient.getCollection({
        name: "transcriptions",
    });

    const records = await collection.get();

    if (!profiles) {
        profiles = [];
    }

    if (!Array.isArray(profiles)) {
        profiles = [profiles];
    }

    const data = {
        messages: [
            {
                role: "system",
                content: `Analyse all conversations today to generate profiles for all the people I've met. The people I've met are:

                        \`\`\`json
                        ${JSON.stringify(profiles)}
                        \`\`\`

                        My name is ${name}. Don't create a profile for myself.

                        Note that names of individuals may be mispelled, and transcriptions will be repeated multiple times.  These transcriptions
                        are fundamentally inaccurate, so you may have to do some inference to discern their true meaning.

                        You will receive transcriptions in chronological order.
                        
                        Your response should be a single JSON structure. ONLY valid JSON, representing the following Typescript structure:

                        \`\`\`typescript
                        profiles: {
                            name: string, // Full name of person, correctly captailised
                            conversationSummary: string, // Paragraph summarising important conversations.
                        }[]
                        \`\`\`

                        An example response is as follows:

                        {
                            profiles: [
                                {
                                    name: "John Doe",
                                    conversationSummary: "...",
                                }
                            ]
                        }
                            
                        DON'T refer to your role as a transcription. You have to provide a natural summary from a third-person, omniscient perspective. 
                        Narrate in past tense.
                        
                        DON'T format it as a code block, just raw text. 
                        Prioritise information at the end of the conversation rather than the beginning.`,
            },
            {
                role: "user",
                content: `Transcriptions:\n${JSON.stringify(
                    records.ids.sort().map((id, index) => {
                        const record = records.documents[index];

                        return {
                            transcription: record,
                            timeSinceEpoch: id,
                        };
                    })
                )}`,
            },
        ],
        model: "llama3.3-70b-instruct",
    };

    const completion = await runInference(data);

    console.log(completion);

    return res.status(200).json(completion.choices[0].message.content);
});

app.get("/omi/prompt", async (req, res) => {
    console.log("Request received.");

    const { prompt } = req.query;
    const collection = await chromaClient.getCollection({
        name: "transcriptions",
    });

    const records = await collection.get();

    const data = {
        messages: [
            {
                role: "system",
                content: `The user asked this prompt: ${prompt}. Using the transcriptions I provided you, give the best response possible. Keep the prompt as short as possible.`,
            },
            {
                role: "user",
                content: `Transcriptions:\n${JSON.stringify(
                    records.ids.sort().map((id, index) => {
                        const record = records.documents[index];

                        return {
                            transcription: record,
                            timeSinceEpoch: id,
                        };
                    })
                )}`,
            },
        ],
        model: "llama3.3-70b-instruct",
    };

    const completion = await runInference(data);

    console.log(completion.choices[0].message);

    return res.status(200).json(completion.choices[0].message.content);
});

async function runInference(data: any) {
    const url = "https://inference.do-ai.run/v1/chat/completions";
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DIGITAL_OCEAN_API_KEY}`,
    };

    const res = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
    });

    return await res.json();
}

app.get("/omi/tasks", async (req, res) => {
    let { name, curr_tasks: currTasks } = req.query;

    if (!currTasks) {
        currTasks = [];
    }

    const collection = await chromaClient.getCollection({
        name: "transcriptions",
    });

    const records = await collection.get();

    if (!Array.isArray(currTasks)) {
        currTasks = [currTasks];
    }

    const data = {
        model: "llama3.3-70b-instruct",
        messages: [
            {
                role: "system",
                content: `Analyse all conversations today to generate tasks that I must complete, and their potential deadline (optional). I already have the following tasks:

                        \`\`\`json
                        ${JSON.stringify(currTasks)}
                        \`\`\`

                        My name is ${name}.

                        Note that names of individuals may be mispelled, and transcriptions will be repeated multiple times.  These transcriptions
                        are fundamentally inaccurate, so you may have to do some inference to discern their true meaning.

                        You will receive transcriptions in chronological order.
                        
                        Your response should be a single JSON structure. ONLY valid JSON, representing the following Typescript structure:

                        \`\`\`typescript
                        task: {
                            description: string, // Full name of person, correctly captailised
                            dueBy: number | null // Representing milliseconds since epoch.
                        }[]
                        \`\`\`

                        An example response is as follows:

                        {
                            tasks: [
                                {
                                    description: "Task 1",
                                    dueBy: 1761430956388
                                }
                            ]
                        }
                            
                        DON'T refer to your role as a transcription. You have to provide a natural summary from a third-person, omniscient perspective. Keep tasks
                        short and simple.
                        
                        DON'T format it as a code block, just raw text. No inline math in the JSON.
                        Prioritise information at the end of the conversation rather than the beginning.`,
            },
            {
                role: "user",
                content: `Transcriptions:\n${JSON.stringify(
                    records.ids.sort().map((id, index) => {
                        const record = records.documents[index];

                        return {
                            transcription: record,
                            timeSinceEpoch: id,
                        };
                    })
                )}`,
            },
        ],
    };

    const completion = await runInference(data);

    console.log(completion);

    return res.status(200).json(completion.choices[0].message.content);
});

app.listen(process.env.PORT || 3000, () => {});
