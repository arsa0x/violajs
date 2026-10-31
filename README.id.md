# violajs

Bot WhatsApp sederhana yang dibangun menggunakan library [Baileys](https://github.com/WhiskeySockets/Baileys) dan berjalan di atas runtime [Bun](https://bun.sh/).

**violajs** menggunakan arsitektur berbasis plugin dan mendukung banyak sesi (_multi-session_), sehingga memudahkan pengembangan perintah kustom serta pengelolaan beberapa akun WhatsApp.

---

## Persyaratan

Sebelum memulai, pastikan perangkat lunak berikut telah terpasang di sistem Anda:

- [Bun](https://bun.sh/) — Disarankan menggunakan versi terbaru.
- [Git](https://git-scm.com/) — Opsional, diperlukan jika ingin mengkloning repositori.
- Akun WhatsApp aktif yang akan digunakan oleh bot.

---

## Instalasi

### 1. Kloning Repositori

Unduh repositori violajs ke komputer Anda menggunakan perintah berikut:

```bash
git clone https://github.com/arsa0x/violajs.git
cd violajs
```

### 2. Instal Dependensi

Instal semua dependensi yang dibutuhkan menggunakan Bun:

```bash
bun install
```

### 3. Konfigurasi Bot

Buat file `config.ts` atau ubah nama file `config.ts.example` menjadi `config.ts`.

Pastikan Anda memeriksa dan menyesuaikan opsi konfigurasi sebelum menjalankan bot.

---

## Mulai Cepat

### Membuat Sesi Baru

Buat sesi WhatsApp baru dengan menentukan nama sesi:

```bash
bun run start create --session session_name
```

Alternatifnya, jalankan file utama secara langsung:

```bash
bun run index.ts create --session session_name
```

Ganti `session_name` dengan nama sesi yang Anda inginkan.

Jika nama sesi tidak ditentukan saat menjalankan bot, sesi yang digunakan secara default adalah `default`.

### Menjalankan Bot

Jalankan sesi tertentu dengan perintah berikut:

```bash
bun run index.ts --session session_name
```

Untuk menjalankan sesi default, gunakan:

```bash
bun run index.ts
```

### Menjalankan Semua Sesi

Untuk menjalankan seluruh sesi yang tersedia, gunakan:

```bash
bun run index.ts --all
```

Anda juga dapat menggunakan opsi singkat berikut:

```bash
bun run index.ts -a
```

---

## Membuat File Executable Mandiri

violajs dapat dikompilasi menjadi file executable mandiri menggunakan Bun.

Jalankan perintah build berikut:

```bash
bun run build
```

Setelah proses build selesai, jalankan file executable di Linux atau macOS dengan perintah:

```bash
./dist/violajs
```

---

## Struktur Proyek

```bash
violajs/
├── commands/
│   └── tools/
├── config.ts
├── index.ts
├── lib/
│   ├── logger.ts
│   ├── qr/
│   │   ├── index.ts
│   │   ├── qr.c
│   │   └── qr.h
│   └── send.ts
├── production.ts
├── sessions/
├── src/
│   ├── app.ts
│   ├── build.ts
│   ├── cli.ts
│   ├── core/
│   │   ├── command.ts
│   │   ├── context.ts
│   │   ├── dispatcher.ts
│   │   ├── loader.ts
│   │   ├── middleware.ts
│   │   ├── parser.ts
│   │   ├── registry.ts
│   │   ├── socket.ts
│   │   └── staticLoader.ts
│   ├── generated/
│   │   └── commands.ts
│   ├── middlewares/
│   │   ├── cooldown.ts
│   │   ├── group.ts
│   │   ├── logger.ts
│   │   └── owner.ts
│   ├── storage/
│   │   ├── auth.ts
│   │   └── cache.ts
│   └── types/
│       ├── command.ts
│       ├── config.ts
│       ├── middleware.ts
│       └── mime.ts
└── tsconfig.json
```

---

## Membuat Plugin

Menambahkan fitur baru ke violajs sangatlah mudah. Buat file berekstensi `.ts` atau `.js` di dalam direktori kategori yang sesuai pada folder `commands/`.

Sebagai contoh, kode berikut mendefinisikan perintah `ping`:

```typescript
import { defineCommand } from "@core/command";
import { cooldown } from "@middlewares/cooldown";
import { groupOnly } from "@middlewares/group";

export default defineCommand({
  name: "ping",
  aliases: ["p"],
  middleware: [groupOnly(), cooldown(100000)],
  async execute(ctx) {
    await ctx.send.text("Pong!");

    // Catat keberhasilan pengiriman pesan
    ctx.log.info("Pesan berhasil dikirim");
  },
});
```

### Penjelasan Contoh

- **`name`** — Menentukan nama perintah.
- **`aliases`** — Menentukan nama alternatif untuk perintah.
- **`middleware`** — Menerapkan middleware untuk mengatur eksekusi perintah. Pada contoh ini, perintah hanya dapat digunakan di grup dan memiliki jeda penggunaan (_cooldown_).
- **`execute(ctx)`** — Mendefinisikan tindakan yang dilakukan ketika perintah dijalankan.
- **`ctx.send.text()`** — Mengirim pesan teks.
- **`ctx.log.info()`** — Mencatat informasi ke log.

Pada contoh tersebut, `groupOnly()` membatasi penggunaan perintah hanya pada percakapan grup, sedangkan `cooldown(100000)` menerapkan jeda penggunaan selama 100.000 milidetik atau 100 detik.

---

## Dokumentasi

- [Perintah Scraper](docs/scraper-commands.md) — Downloader, pencarian web, metadata Spotify/YouTube, dan QR.

---

## Kontribusi

Kontribusi selalu terbuka bagi siapa saja! Anda dapat membantu dengan mengusulkan fitur baru, melaporkan bug, atau memperbaiki dokumentasi.

Ikuti langkah-langkah berikut untuk berkontribusi:

1. _Fork_ repositori ini.
2. Buat branch baru untuk fitur yang ingin dikembangkan:

   ```bash
   git checkout -b feature/nama-fitur
   ```

3. Simpan perubahan dengan melakukan commit:

   ```bash
   git commit -m "Menambahkan fitur XYZ"
   ```

4. Kirim branch ke repositori fork Anda:

   ```bash
   git push origin feature/nama-fitur
   ```

5. Buat _Pull Request_ ke repositori utama.

Pastikan perubahan yang Anda ajukan jelas, terfokus, dan telah diuji dengan baik sebelum mengirimkan _Pull Request_.

---

## Ucapan Terima Kasih

Violajs terinspirasi oleh ide, implementasi, dan proyek sumber terbuka dari komunitas. Kami ingin mengucapkan terima kasih kepada proyek-proyek yang telah membantu pengembangannya.

### Proyek

- [**Rubby-MD**](https://github.com/KyuuX444/Rubby-MD) — Lisensi ISC. Digunakan untuk perintah manajemen grup WhatsApp dan lainnya.
- [**KumpulanScraper**](https://github.com/XZEERH/KumpulanScraper) — Referensi ide fitur scraper; tidak ada berkas sumber yang disalin.

---

## Lisensi

violajs didistribusikan di bawah [Lisensi MIT](https://github.com/arsa0x/violajs/blob/main/LICENSE).

Silakan lihat file `LICENSE` untuk membaca ketentuan lisensi secara lengkap.
