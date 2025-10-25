import express, { Request, Response } from "express";

const app = express();

app.get("/", (req: Request, res: Response) => {
    res.send('Hello World');
});

app.use(express.raw({
    type: 'application/octet-stream',
    limit: '50mb'
}));

app.post("/omi/audio", (req: Request, res: Response) => {
    const { sample_rate: sampleRate, uid: uid } = req.query;    

    const octetData: Uint8Array = req.body;

    if (octetData instanceof Uint8Array) {
        console.log(`Recieved ${octetData.length} bytes of audio data.`);

        res.send(200);
    } else {
        res.json({
            error: 'Invalid request body'
        }).status(400);
    }
});

app.listen(process.env.PORT || 3000, () => {});