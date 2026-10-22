# TUGASIN — Smart Study Workspace + AI

Versi ini menghubungkan chatbot ke model AI melalui backend Node.js. API key hanya dibaca oleh server dari environment variable, bukan dari JavaScript di browser.

## Persyaratan
- Node.js 20 atau lebih baru (disarankan versi LTS).
- API key dari OpenAI API Platform dan akses/billing API yang aktif. Langganan ChatGPT tidak otomatis mencakup kredit API.
- Koneksi internet saat menggunakan chat AI.

## Menjalankan di VS Code (Windows)
1. Ekstrak ZIP, lalu buka folder `TUGASIN_Web_Pro` di VS Code.
2. Buka Terminal → New Terminal.
3. Pastikan terminal berada di folder project, lalu jalankan:
   ```bash
   npm install
   ```
4. Salin `.env.example` menjadi file baru bernama `.env` di folder yang sama.
   - Windows CMD: `copy .env.example .env`
   - PowerShell: `Copy-Item .env.example .env`
5. Buka `.env` dan ganti `isi_api_key_di_sini` dengan API key milikmu:
   ```dotenv
   OPENAI_API_KEY=sk-...api_key_milikmu...
   OPENAI_MODEL=gpt-5-mini
   PORT=3000
   ```
   Jangan menambahkan API key ke `script.js`, jangan membagikan file `.env`, dan jangan mengunggahnya ke GitHub. File `.env` sudah masuk `.gitignore`.
6. Jalankan server:
   ```bash
   npm start
   ```
7. Buka **http://localhost:3000** di browser. Jangan buka `index.html` langsung dan jangan gunakan Live Server, karena chat memerlukan backend.
8. Coba kirim pertanyaan di Asisten Tugas. Untuk memeriksa server, buka `http://localhost:3000/api/health`; `aiConfigured` harus bernilai `true`.

## Mengubah model
Edit `OPENAI_MODEL` di `.env`, gunakan nama model yang tersedia untuk akun API-mu, lalu restart server. Model dan biaya API dapat berubah; cek dokumentasi dan halaman usage/billing OpenAI sebelum pemakaian intensif.

## Yang sudah diubah
- Menambahkan backend Express dan endpoint `POST /api/chat`.
- Memakai OpenAI Responses API melalui SDK JavaScript resmi.
- Mengirim konteks percakapan terbaru agar jawaban lanjutan lebih nyambung.
- Menambahkan validasi pesan, batas ukuran request, rate limit dasar, dan pesan error yang aman.
- API key tidak pernah dikirim ke browser.
- Jawaban AI ditampilkan dengan format Markdown dasar yang di-escape untuk mengurangi risiko HTML injection.
- Riwayat percakapan masih disimpan di `localStorage` browser seperti versi sebelumnya.

## Catatan dan batasan
- Fitur **Asisten Tugas** memakai AI. Fitur **Rencana Tugas** dan **Belajar & Kuis** masih memakai logika lokal/template dari versi awal.
- Fitur Dokumen Saya hanya mencatat nama file; isi PDF/DOCX belum diunggah atau dianalisis oleh AI.
- Rate limit bawaan ini hanya pembatas dasar untuk penggunaan lokal, bukan sistem autentikasi atau proteksi produksi. Sebelum dipublikasikan ke internet, tambahkan autentikasi, pembatasan penggunaan per pengguna, logging/monitoring, dan konfigurasi HTTPS yang sesuai.
- Jawaban model dapat keliru. Periksa sumber, kutipan, dan aturan dosen sebelum menggunakan hasil.

## Troubleshooting
- **API key belum dikonfigurasi:** pastikan file bernama tepat `.env` (bukan `.env.txt`) dan ada di folder yang sama dengan `server.js`, kemudian restart `npm start`.
- **API key ditolak:** buat/periksa API key di OpenAI API Platform dan pastikan billing/akses API aktif.
- **Kuota/batas penggunaan:** cek usage, billing, dan limits akun API.
- **Model tidak ditemukan/tidak punya akses:** ubah `OPENAI_MODEL` ke model yang tersedia untuk akun API.
- **Tidak dapat terhubung ke backend:** pastikan terminal masih menjalankan server dan browser membuka `http://localhost:3000`.
- **Port 3000 dipakai:** ubah `PORT=3001` di `.env`, restart server, lalu buka `http://localhost:3001`.
