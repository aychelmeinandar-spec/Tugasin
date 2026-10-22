
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

// Konfigurasi proxy untuk deployment Vercel
app.set('trust proxy', 1);

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
        'script-src-attr': ["'none'"]
      }
    }
  })
);

app.use(express.json({ limit: '40kb' }));

app.use(
  '/api/',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  })
);

const instructions = `Kamu adalah TUGASIN, asisten belajar berbahasa Indonesia.
Jawab sesuai pertanyaan dan konteks percakapan pengguna.
Ikuti format dan batasan yang diminta.
Untuk informasi yang dapat berubah, seperti presiden, pejabat, berita, harga, dan kebijakan terbaru, gunakan Google Search jika tersedia.
Utamakan sumber resmi dan informasi terbaru daripada ingatan model.
Jangan menyatakan informasi lama sebagai informasi terkini.
Jika pencarian tidak memberikan bukti yang cukup, jelaskan bahwa informasi belum dapat dipastikan.
Jangan mengarang fakta, kutipan, atau referensi.
Untuk tugas akademik, berikan penjelasan yang jelas dan mudah dipahami.`;

// Pemeriksaan konfigurasi backend
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(API_KEY),
    provider: 'gemini',
    model: MODEL
  });
});

// Endpoint chatbot
app.post('/api/chat', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY belum diatur di Environment Variables.'
    });
  }

  const { messages } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'Pesan belum diisi.'
    });
  }

  const clean = messages
    .slice(-12)
    .map((m) => ({
      role: m?.role === 'assistant' ? 'model' : 'user',
      parts: [{
        text: typeof m?.content === 'string'
          ? m.content.trim().slice(0, 6000)
          : ''
      }]
    }))
    .filter((m) => m.parts[0].text);

  if (!clean.length || clean[clean.length - 1].role !== 'user') {
    return res.status(400).json({
      error: 'Pesan pengguna tidak valid.'
    });
  }

  try {
    let data = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response;

      try {
        response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
      } catch (err) {
        console.error(
          'Gemini connection error:',
          err?.message || 'Koneksi gagal'
        );

        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (2 ** (attempt - 1)))
          );
          continue;
        }

        return res.status(502).json({
          error: 'Tidak bisa terhubung ke Gemini. Coba lagi nanti.'
        });
      }

      if (response.ok) {
        try {
          data = await response.json();
        } catch {
          return res.status(502).json({
            error: 'Respons Gemini tidak dapat dibaca.'
          });
        }

        break;
      }

      const status = response.status;
      const errorData = await response.json().catch(() => ({}));

      console.error(
        'Gemini API error:',
        status,
        errorData?.error?.message || 'Tidak ada detail error'
      );

      // Coba kembali untuk gangguan server sementara
      if ([500, 502, 503, 504].includes(status) &&
          attempt < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (2 ** (attempt - 1)))
        );
        continue;
      }

      if (status === 429) {
        return res.status(429).json({
          error: 'Batas penggunaan Gemini tercapai. Coba lagi nanti.'
        });
      }

      if (status === 503) {
        return res.status(503).json({
          error: 'Gemini sedang sibuk setelah beberapa percobaan. Coba lagi nanti.'
        });
      }

      if (status === 401 || status === 403) {
        return res.status(502).json({
          error: 'Gemini menolak autentikasi. Periksa API key dan izinnya.'
        });
      }

      if (status === 404) {
        return res.status(502).json({
          error: 'Model Gemini tidak ditemukan. Periksa GEMINI_MODEL.'
        });
      }

      return res.status(502).json({
        error: 'Gemini gagal memproses pesan. Periksa Vercel Logs.'
      });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!answer) {
      console.error(
        'Gemini tidak menghasilkan teks:',
        data?.promptFeedback?.blockReason || 'Respons kosong'
      );

      return res.status(502).json({
        error: 'Gemini tidak menghasilkan teks. Coba pertanyaan lain.'
      });
    }

    return res.json({ answer });

  } catch (err) {
    console.error(
      'Chat handler error:',
      err?.message || err?.name || 'unknown'
    );

    return res.status(500).json({
      error: 'Terjadi kesalahan pada backend TUGASIN.'
    });
  }
});

// Halaman website
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

// Halaman tidak ditemukan
app.use((_req, res) =>
  res.status(404).send('Halaman tidak ditemukan.')
);

// Jalankan server
app.listen(PORT, () => {
  console.log(`TUGASIN berjalan di port ${PORT}`);
  console.log(`AI provider: Gemini (${MODEL})`);
  console.log(
    `Gemini API key: ${API_KEY ? 'terdeteksi' : 'BELUM DIATUR'}`
  );
});
