# FF Billing

Fondasi sistem manajemen dan billing ISP/RTRWNet berbasis Node.js, Express, EJS, dan SQLite.

Proyek ini merupakan implementasi independen berdasarkan kelompok fitur yang didokumentasikan pada [alijayanet/billing-rtrw](https://github.com/alijayanet/billing-rtrw). Proyek referensi memiliki lisensinya sendiri. Repository ini tidak menyalin data pelanggan, password, token/API key, konfigurasi rahasia, atau database milik pihak lain.

## Yang sudah tersedia
- Login admin memakai bcrypt dan sesi yang disimpan di SQLite
- Proteksi CSRF, Helmet, pembatasan request, validasi input
- Migrasi SQLite untuk pengguna, pelanggan, paket, langganan, invoice, pembayaran, dan audit log
- CRUD dasar pelanggan dan paket (arsip paket menggunakan soft archive)
- Penetapan langganan pelanggan ke paket
- Generate invoice bulanan, harga promo berdasarkan siklus promo, pembayaran parsial/penuh manual
- Dashboard ringkasan pelanggan, tagihan, dan pembayaran
- Koneksi REST GenieACS untuk membaca daftar perangkat (read-only)
- Tampilan responsif untuk desktop dan perangkat mobile

## Pemasangan
Persyaratan: Node.js 20+ dan npm.

```bash
git clone https://github.com/fifanetid/billing_arm.git
cd billing_arm
cp .env.example .env
```

Edit `.env`. Gunakan `SESSION_SECRET` acak minimal 32 karakter untuk production dan `ADMIN_PASSWORD` minimal 10 karakter. Setelah itu:

```bash
npm install
npm run db:migrate
npm run seed:admin
npm run check
npm start
```

Buka `http://localhost:3000`. Username admin berasal dari `ADMIN_USERNAME`, password dari `ADMIN_PASSWORD`. Jangan gunakan password contoh pada server publik.

## GenieACS
Atur `GENIEACS_URL` (biasanya NBI port 7557), `GENIEACS_USERNAME`, dan `GENIEACS_PASSWORD`. Billing menyimpan datanya di SQLite sendiri. Aplikasi ini tidak mengubah MongoDB atau schema internal GenieACS. Integrasi yang ada saat ini hanya membaca daftar perangkat. Pembaruan parameter CPE, task, provisioning, dan reboot belum diaktifkan.

## Batasan versi awal
Fitur di bawah masih menjadi pekerjaan lanjutan dan belum boleh dianggap aktif: MikroTik multi-router/PPPoE/Hotspot, isolir otomatis, OLT/ONU, ODP/GIS, WhatsApp/Telegram, payment gateway/webhook, portal pelanggan, teknisi, agen, kolektor, voucher, inventory, payroll, ekspor laporan, backup terjadwal, prorata, dan scheduler billing. Lihat [FEATURE_MATRIX.md](FEATURE_MATRIX.md).

## Keamanan dan operasi
- Jangan commit file `.env`, database produksi, kredensial router, atau data pelanggan.
- Gunakan HTTPS di belakang reverse proxy.
- Backup SQLite secara teratur dan uji proses restore.
- Uji integrasi MikroTik/GenieACS di perangkat lab sebelum dipakai di jaringan produksi.

## Lisensi
Kode FF Billing memakai ISC License (lihat [LICENSE](LICENSE)). Kode GenieACS dan proyek referensi tetap tunduk pada lisensi masing-masing.
