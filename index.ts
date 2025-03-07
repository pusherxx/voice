import express from 'express';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const audioFile = req.files?.audio;
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });
    res.json({ text: transcription.text });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante la trascrizione' });
  }
});

app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});