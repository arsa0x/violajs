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
Buat file `config.ts` atau cukup dengan menghapus `.example` pada file `config.ts.example`.

## Jalankan

Untuk menyalakan bot, jalankan perintah berikut di terminal Anda:

```bash
bun run start
# atau
bun run index.ts
```

Violajs juga bisa di compile (single executable file), cukup jalankan:

```bash
bun run build

# jalankan (linux/macos)
./dist/violajs
```

## Struktur Direktori

```bash
violajs/
├── commands
│   ├── downloader/
│   └── tools/
├── config.ts
├── index.ts
├── package.json
├── session
│   ├── auth.sqlite
│   ├── auth.sqlite-shm
│   └── auth.sqlite-wal
├── src
│   ├── core
│   │   ├── command.ts
│   │   ├── context.ts
│   │   ├── dispatcher.ts
│   │   ├── loader.ts
│   │   ├── middleware.ts
│   │   ├── parser.ts
│   │   ├── registry.ts
│   │   └── socket.ts
│   ├── middlewares
│   │   ├── cooldown.ts
│   │   ├── group.ts
│   │   ├── logger.ts
│   │   └── owner.ts
│   ├── storage
│   │   ├── auth.ts
│   │   └── cache.ts
│   ├── types
│   │   ├── command.ts
│   │   └── middleware.ts
│   └── utils
└── tsconfig.json
```

## Contoh Plugin

Membuat fitur baru sangat mudah! Buat file .ts baru di dalam direktori commands/[kategori]/.

```typescript
import { defineCommand } from "@core/command";
import { cooldown } from "@middlewares/cooldown";
import { groupOnly } from "@middlewares/group";

export default defineCommand({
  name: "ping",
  aliases: ["p"],
  middleware: [groupOnly(), cooldown(100000)],
  async execute(ctx) {
    await ctx.reply.text("Pong!");
  },
});
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
