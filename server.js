
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '40kb' }));

app.use('/api/', rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

const instructions = `Kamu adalah TUGASIN, asisten belajar berbahasa Indonesia.
Jawab sesuai pertanyaan dan konteks percakapan pengguna.
Ikuti format dan batasan yang diminta.
Untuk informasi yang dapat berubah, seperti presiden, pejabat, berita, harga, dan kebijakan terbaru, gunakan Google Search jika tersedia.
Utamakan sumber resmi dan informasi terbaru daripada ingatan model.
Jangan menyatakan informasi lama sebagai informasi terkini.
Jika pencarian tidak memberikan bukti yang cukup, jelaskan bahwa informasi belum dapat dipastikan.
Jangan mengarang fakta, kutipan, atau referensi.
Untuk tugas akademik, berikan penjelasan yang jelas dan mudah dipahami.`;


app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(API_KEY),
    provider: 'gemini',
    model: MODEL
  });
});

app.post('/api/chat', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY belum diatur di file .env.'
    });
  }

  const { messages } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Pesan belum diisi.' });
  }

  const clean = messages.slice(-12).map(m => ({
    role: m?.role === 'assistant' ? 'model' : 'user',
    parts: [{
      text: typeof m?.content === 'string'
        ? m.content.trim().slice(0, 6000)
        : ''
    }]
  })).filter(m => m.parts[0].text);

  if (!clean.length || clean[clean.length - 1].role !== 'user') {
    return res.status(400).json({
      error: 'Pesan pengguna tidak valid.'
    });
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
  systemInstruction: {
    parts: [{ text: instructions }]
  },
  contents: clean,
generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048
  }
}) 
 });

    const data = await response.json();

    if (!response.ok) {
          console.error(
        'Gemini API error:',
        response.status,
      data?.error?.message || 'Tidak ada detail error'
    );
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429
          ? 'Batas penggunaan Gemini tercapai. Coba lagi nanti.'
          : 'Gemini gagal memproses pesan. Periksa model dan konfigurasi API key.'
      });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: 'Gemini tidak menghasilkan teks. Coba kirim pertanyaan lain.'
      });
    }

    return res.json({ answer });
  } catch (err) {
    console.error('Gemini connection error:', err?.name || 'unknown');
    return res.status(502).json({
      error: 'Tidak bisa terhubung ke Gemini. Periksa koneksi internet.'
    });
  }
});

app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, 'index.html'))
);
app.get('/index.html', (_req, res) =>
  res.sendFile(path.join(__dirname, 'index.html'))
);
app.get('/style.css', (_req, res) =>
  res.sendFile(path.join(__dirname, 'style.css'))
);
app.get('/script.js', (_req, res) =>
  res.sendFile(path.join(__dirname, 'script.js'))
);

app.use((_req, res) =>
  res.status(404).send('Halaman tidak ditemukan.')
);

app.listen(PORT, () => {
  console.log(`TUGASIN berjalan di http://localhost:${PORT}`);
  console.log(`AI provider: Gemini (${MODEL})`);
  console.log(`Gemini API key: ${API_KEY ? 'terdeteksi' : 'BELUM DIATUR'}`);
});
