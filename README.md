# violajs

Whatsapp bot sederhana yang dibangun menggunakan _library_ [Baileys](https://github.com/WhiskeySockets/Baileys) dan berjalan di atas _runtime_ [Bun](https://bun.sh/). Dirancang dengan arsitektur berbasis _plugin_.

---

## Persyaratan (_Prerequisites_)

Sebelum memulai, pastikan Anda telah menginstal perangkat lunak berikut di sistem Anda:

- [Bun](https://bun.sh/) (Disarankan versi terbaru)
- Git (Opsional, untuk _cloning_ repositori)
- Akun WhatsApp aktif yang akan dijadikan sebagai bot.

---

## Instalasi

**1. Kloning Repositori**

```bash
git clone https://github.com/arsa0x/violajs.git
cd violajs
```

**2. Install Dependensi**
Gunakan manajer paket Bun untuk menginstal semua library yang dibutuhkan:

```bash
bun install
```

**3. Konfigurasi**
Buat file `config.json` atau cukup dengan menghapus `.example` pada file `config.json.example`.

## Jalankan

Untuk menyalakan bot, jalankan perintah berikut di terminal Anda:

```bash
bun run start
# atau
bun run index.ts
```

## Struktur Direktori

```bash
violajs/
├── config.json         # File konfigurasi utama bot (diabaikan oleh git)
├── config.json.example # Contoh struktur file konfigurasi
├── index.ts            # Entry point utama program
├── session/            # Direktori penyimpanan sesi autentikasi WhatsApp
└── src                 # Direktori kode sumber utama
    ├── lib             # Kumpulan utility dan helper
    ├── plugins         # Direktori penyimpanan modul/perintah (plugin) bot
    │   ├── downloader
    │   ├── tools
    │   └── [kategori]  # Kategori plugin lainnya
    └── types.ts        # Definisi tipe data TypeScript kustom
```

## Contoh Plugin

Membuat fitur baru sangat mudah! Buat file .ts baru di dalam direktori plugins/[kategori]/.

```typescript
import type { Plugin } from "../../types";

export default {
  name: "ping",
  aliases: ["p"],
  category: "tools",
  description: "Cek responsivitas bot",
  execute: async ({ sock, jid, msg }) => {
    await sock.sendMessage(jid, { text: "Pong!" }, { quoted: msg });
  },
} satisfies Plugin;
```

## Kontribusi

Kontribusi selalu diterima! Jika Anda memiliki ide untuk fitur baru, menemukan bug, atau ingin memperbaiki dokumentasi:

- Fork repositori ini.
- Buat branch fitur Anda (git checkout -b fitur/NamaFitur).
- Commit perubahan Anda (git commit -m 'Menambahkan fitur XYZ').
- Push ke branch (git push origin fitur/NamaFitur).
- Buat Pull Request.

## Lisensi

Proyek ini didistribusikan di bawah Lisensi MIT. Lihat file [LICENSE](https://github.com/arsa0x/violajs/blob/main/LICENSE) untuk informasi lebih lanjut.
