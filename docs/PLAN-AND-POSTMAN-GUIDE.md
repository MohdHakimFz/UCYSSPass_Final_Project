# UCYSS / SentryPass: pelan kerja, panduan Postman dan pelan deploy

Fail ini ada empat bahagian:

1. [Tugasan yang belum siap](#1-tugasan-yang-belum-siap)
2. [Idea tambahan daripada aku](#2-idea-tambahan)
3. [Panduan Postman: semua API, langkah demi langkah](#3-panduan-postman)
4. [Pelan deploy](#4-pelan-deploy)

Tarikh hantar: **12 Oktober 2026**. Rujukan markah: `SWC3633_SWC4443 - Project Description (0826).pdf`.

---

## 0. Di mana kita sekarang

| Bahagian | Status |
| --- | --- |
| Backend Laravel 12, Sanctum, PostgreSQL | Siap. **226** test PHPUnit lulus |
| Web (customer, organiser, admin) | Siap. **43** ujian Playwright lulus |
| App mobile (customer) | Siap dan boleh dibina, tetapi **belum diuji pada telefon sebenar** |
| Koleksi Postman | **198 permintaan, 309 semakan, 0 kegagalan** |
| Event physical, seat bernombor, tahan seat, bayaran sandbox, refund | Siap |
| Event online, link meeting dilindungi, butang Join ikut platform | Siap |
| Organiser publish sendiri, peta seat, kemas kini automatik | Siap |
| Rebrand UCYSS, email peringatan (diuji dengan Resend sebenar) | Siap |
| Rate limit global, indeks pangkalan data, bukti prestasi | Siap (`docs/performance/PERFORMANCE.md`) |
| Tier khas ahli, pengumuman organiser, statistik kehadiran, kongsi WhatsApp, sijil PDF, data demo UCYSS, CI | Siap |
| ERD, DDL, DML, dokumentasi API, nota laporan | Siap |
| Laporan PDF, tangkapan skrin, video, dan deploy | **Belum** (kerja kau dan langkah terakhir) |

--- | --- |
| Backend Laravel 12, Sanctum, PostgreSQL | Siap. 144 test PHPUnit lulus |
| Web (customer, organiser, admin) | Siap. 29 ujian Playwright lulus |
| App mobile (customer) | Siap, tapi belum diuji semula pada telefon selepas perubahan minggu ni |
| Event physical, seat bernombor, tahan seat, bayaran sandbox, refund | Siap |
| Event online, link meeting dilindungi, butang Join dikesan ikut platform | Siap |
| Organiser publish sendiri, peta seat organiser, kemas kini automatik (5 saat) | Siap |
| Rebrand UCYSS, email peringatan, dokumen, deploy | Belum |

---

## 1. Tugasan yang belum siap

Susunan ikut keutamaan. `[ ]` = belum, tanda kalau dah siap.

### A. Fitur UCYSS (kecil, cepat)

- [x] **Rebrand ke UCYSS.** Nama paparan sahaja (logo taip, tajuk tab, email, tiket, app mobile). Nama dalaman dalam kod kekal `SentryPass`. Letak nama jenama pada satu tempat (config) supaya mudah tukar. *Anggaran: 1–2 jam.*
- [x] **Email peringatan** H-1 hari sebelum event (Resend + penjadual Laravel). Untuk event online, sertakan link meeting dalam email ini sahaja. *Anggaran: setengah hingga satu hari.*
- [x] **Add to calendar dalam email** (fail `.ics` lampiran atau pautan). Butang "Add to calendar" pada tiket sudah ada.
- [x] **Kemas Admin:** tag Online/Physical dan tapis mod dalam senarai event; log email tunjuk jenis "Reminder".
- [ ] **Uji app mobile pada telefon sebenar (kau):** butang Join, tiada zoom pada peta seat, senarai event yang muncul sendiri.

### B. Perkara yang rubrik tanda (jangan tinggalkan)

- [x] **JWT vs Sanctum.** Jawapan bertulis ada dalam `docs/REPORT-NOTES.md`. Kalau nak selamat, tanya pensyarah. PDF tulis "JWT Authentication". Sistem guna Sanctum (token dalam pangkalan data, boleh dibatalkan). Pilih satu: (1) kekalkan Sanctum dan terangkan sebabnya dalam laporan, atau (2) tanya pensyarah dulu. Jangan tukar diam-diam.
- [x] **Rate limit global** untuk seluruh API (sekarang hanya pada tempahan, bayaran, join, lupa password). Tambah had umum contohnya 60 permintaan seminit per pengguna atau IP.
- [x] **Bukti prestasi sebelum dan selepas** untuk bahagian "Debugging and Performance Optimisation": ukur masa senarai event dan senarai tempahan, tambah indeks atau kurangkan query, catat angka. Contoh yang sudah ada cerita: kunci seat (`lockForUpdate`), polling, cache Vite.
- [x] **Bahagian "Advanced features"** (teks siap dalam `docs/REPORT-NOTES.md`): middleware (auth, validation, error handling, logging), API key check-in, rate limit, Resend, QR API, pagination/filter/search/sort.

### C. Dokumen (dinilai sebagai hasil kumpulan, 40 markah)

- [x] **ERD** dikemas kini: jadual `seats`, `payments`, lajur baru `events.mode`, `meeting_url`, `meeting_platform`, `events.seated`, `bookings.seat_id`, `bookings.hold_expires_at`.
- [x] **Skrip DDL dan DML** (`docs/database/schema.sql`) ikut skema terkini, dengan **sekurang-kurangnya 5 rekod setiap jadual**.
- [x] **`docs/api-documentation.md`** ditambah: seat, bayaran, hold, refund, reset password, `/organiser/summary`, `/events/{id}/seat-map`, `/bookings/{id}/join`, mod online, peraturan draft.
- [x] **Koleksi Postman dikemas kini:** 198 permintaan, 309 semakan, 0 kegagalan. Lihat [3.9](#39-keadaan-koleksi-sedia-ada).
- [x] **README** dengan langkah pasang dan jalankan (sudah ada, semak selepas rebrand).
- [ ] **Laporan PDF (kau)** ikut struktur PDF: System Overview, Database Design, API Documentation, API Testing, System Implementation, System Demonstration, Repository, Advanced Features, Debugging, Reflection.
- [ ] **Tangkapan skrin Postman (kau)** (senarai di [3.8](#38-senarai-tangkapan-skrin-untuk-laporan)).

### D. Kualiti

- [x] `npm run lint` tiada ralat. **Ujian e2e untuk mobile belum ada** (app mobile diuji melalui type-check dan bundle).
- [x] `CHECKIN_API_KEY` dalam `.env` kau sudah bukan nilai lalai. Nilai lalai dalam fail environment Postman kekal (tukar dalam Postman, jangan commit kunci sebenar).
- [ ] Bersihkan data ujian dalam DB pembangunan bila-bila masa: `@e2e.test` (Playwright membersihkan sendiri), dan `migrate:fresh --seed` memberi data UCYSS yang bersih (ia memadam semua data, jadi buat bila kau bersedia).

### E. Deploy (bahagian [4](#4-pelan-deploy))

- [ ] Backend, pangkalan data, web, dan app mobile.

### F. Yang ditangguh (bukan keperluan PDF)

Pengesahan email (menunggu domain Resend yang disahkan), push notification, Wallet pass, tempahan kumpulan, pemindahan tiket, gateway bayaran sebenar (Billplz/ToyyibPay/FPX), sijil PDF pada app mobile, dan ujian e2e mobile.

### Jadual cadangan

| Tarikh | Kerja |
| --- | --- |
| 19–25 Sept | A: rebrand, email peringatan, kemas admin, uji mobile |
| 26 Sept – 1 Okt | B: rate limit, prestasi, keputusan JWT |
| 2–8 Okt | C: dokumen, Postman, laporan, tangkapan skrin |
| 9–11 Okt | Deploy, rakam video, semak semua pautan |
| 12 Okt | Hantar |

---

## 2. Idea tambahan

Semua idea di bawah **sudah dibuat** kecuali yang ditanda.

1. **Tier khas ahli** (senarai ahli dikekalkan admin, tier "hanya ahli") — siap. Aku pilih senarai ahli yang dikawal admin, bukan emel `@uptm.edu.my`, kerana pengesahan emel belum ada dan sesiapa boleh daftar dengan emel itu.
2. **Statistik kehadiran** (daftar berbanding hadir) — siap, pada dashboard organiser dan admin.
3. **Pengumuman organiser** — siap: satu email kepada semua yang daftar, sejarah, dan had 10 seminit.
4. **Link kongsi WhatsApp** — siap: butang WhatsApp, salin link, dan kongsi asli peranti. Pratonton kad (Open Graph) **belum**, sebab perlukan hos yang menghantar HTML berbeza kepada perangkak.
5. **Sijil kehadiran (PDF)** — siap, dengan nombor sijil dan halaman semakan awam. Pada web sahaja.
6. **Health check `/up`** — sudah ada dan digunakan oleh CI.
7. **Pemantauan ralat** — log permintaan (`LogApiRequests`) sudah ada. Pemantauan luar (contohnya Sentry) belum.
8. **Ujian Postman dalam CI** — siap (`.github/workflows/ci.yml`). Belum dijalankan pada GitHub kerana repositori belum ditolak ke sana.
9. **Data demo UCYSS** — siap: `php artisan migrate:fresh --seed`.

---

## 3. Panduan Postman

### 3.1 Sediakan Postman

1. Pasang Postman (aplikasi desktop atau versi web).
2. Pastikan API hidup: dalam `backend/`, `docker compose up -d`. Uji di pelayar: `http://localhost/api/events` mesti keluar JSON.
3. **Import** dua fail dalam `docs/postman/`:
   - `SentryPass.postman_collection.json`
   - `SentryPass.local.postman_environment.json`
4. Pilih environment **SentryPass Local** (kanan atas). Pembolehubahnya:

| Nama | Nilai |
| --- | --- |
| `base_url` | `http://localhost/api` |
| `admin_email` | `admin@sentrypass.test` |
| `admin_password` | `password` |
| `checkin_api_key` | `dev-checkin-key-change-me` (mesti sama dengan `CHECKIN_API_KEY` dalam `backend/.env`) |

5. Untuk latihan tangan, buat koleksi baru kosong bernama **UCYSS Manual Tests** dan tambah permintaan satu demi satu mengikut 3.4 dan 3.5.

### 3.2 Peraturan asas untuk setiap permintaan

- Header: `Accept: application/json` (semua permintaan) dan `Content-Type: application/json` (bila ada body). Tanpa `Accept`, ralat Laravel boleh keluar sebagai halaman HTML.
- Untuk endpoint yang perlu login: tab **Authorization** → Type **Bearer Token** → nilai `{{token}}`.
- Semua tarikh ISO 8601, contohnya `2026-11-20T14:00:00Z`.
- Senarai (index) berpaginasi: `?page=1&per_page=15`. Respons ada `data`, `current_page`, `last_page`, `total`.

### 3.3 Log masuk dan simpan token secara automatik

Permintaan `POST {{base_url}}/auth/login`, body (raw JSON):

```json
{ "email": "{{admin_email}}", "password": "{{admin_password}}" }
```

Tab **Tests** (Postman jalankan selepas respons):

```javascript
pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Ada token", () => pm.expect(pm.response.json().token).to.be.a("string"));
pm.collectionVariables.set("token", pm.response.json().token);
```

Selepas ini setiap permintaan lain guna `{{token}}`. Untuk beberapa peranan, simpan token berasingan: `admin_token`, `organiser_token`, `customer_token` (tukar nama pembolehubah dalam skrip), dan pilih dalam tab Authorization.

Contoh semakan yang boleh ditampal dalam tab **Tests** permintaan lain:

```javascript
// Kod status dijangka
pm.test("201 Created", () => pm.response.to.have.status(201));
// Bentuk JSON
pm.test("Ada id", () => pm.expect(pm.response.json().id).to.be.a("number"));
// Simpan id untuk langkah seterusnya
pm.collectionVariables.set("event_id", pm.response.json().id);
// Masa respons
pm.test("Kurang 800 ms", () => pm.expect(pm.response.responseTime).to.be.below(800));
// Ralat pengesahan
pm.test("Ada ralat untuk 'title'", () => pm.expect(pm.response.json().errors).to.have.property("title"));
```

### 3.4 Semua endpoint

Peranan: **Awam** (tanpa token), **C** customer, **O** organiser (hanya event sendiri), **A** admin. Kod status ralat umum: `401` tiada/token tak sah, `403` peranan tak dibenarkan, `404` tak jumpa, `422` data tak sah, `429` terlalu banyak permintaan.

#### Auth

| Kaedah | URL | Siapa | Body | Berjaya | Ralat uji |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/register` | Awam | `name`, `email`, `password`, `password_confirmation` (min 8) | 201 `{user, token}` | 422 emel dah ada; 422 kata laluan tak sepadan |
| POST | `/auth/login` | Awam | `email`, `password` | 200 `{user, token}` | 422 kelayakan salah |
| GET | `/auth/me` | Semua log masuk | | 200 pengguna | 401 tiada token |
| POST | `/auth/logout` | Semua log masuk | | 200, token dibatalkan | 401 selepas logout |
| POST | `/auth/forgot-password` | Awam | `email` | 200 mesej umum (kod 6 digit dihantar melalui email) | 429 selepas 3 cubaan seminit |
| POST | `/auth/reset-password` | Awam | `email`, `code` (6 digit), `password`, `password_confirmation` | 200 | 422 kod salah atau tamat; 429 |

#### Users

| Kaedah | URL | Siapa | Body / parameter | Berjaya | Ralat uji |
| --- | --- | --- | --- | --- | --- |
| GET | `/users?role=customer&search=aina&member=1` | A | penapis `role`, `search` (nama atau emel), `member` (0 atau 1) | 200 berpaginasi | 403 sebagai customer |
| POST | `/users` | A | `name`, `email`, `password`, `role` (`admin`,`organiser`,`customer`) | 201 | 422 `role` tak sah; 403 bukan admin |
| GET | `/users/{id}` | A atau pemilik | | 200 | 403 akaun orang lain |
| PUT | `/users/{id}` | A atau pemilik | `name`, `email`, `password` (sebahagian); admin sahaja: `role`, `is_member` | 200 | 422 emel dah ada. Cuba hantar `"role":"admin"` atau `"is_member":true` sebagai pemilik: **diabaikan** |
| DELETE | `/users/{id}` | A | | 204 | 403 bukan admin |

#### Venues

| Kaedah | URL | Siapa | Body / parameter | Berjaya | Ralat uji |
| --- | --- | --- | --- | --- | --- |
| GET | `/venues?search=hall` | Awam | `search`, `page`, `per_page` | 200 | |
| GET | `/venues/{id}` | Awam | | 200 | 404 |
| POST | `/venues` | A | `name`, `address`, `capacity` (≥ 1) | 201 | 403 customer; 422 kapasiti 0 |
| PUT | `/venues/{id}` | A | medan sebahagian | 200 | 422 |
| DELETE | `/venues/{id}` | A | | 204 | 409 venue masih ada event |

Venue **"Online"** dicipta automatik sekali bila event online pertama dibuat.

#### Events

| Kaedah | URL | Siapa | Body / parameter | Berjaya | Ralat uji |
| --- | --- | --- | --- | --- | --- |
| GET | `/events` | Awam | penapis: `status`, `category`, `venue_id`, `organiser_id`, `from`, `to`, `max_price`, `search`, `sort` (`start_at`,`title`), `direction` (`asc`,`desc`), `page`, `per_page` | 200 berpaginasi. **Draf tidak keluar** kecuali admin, atau organiser yang minta `organiser_id` sendiri | |
| GET | `/events/{id}` | Awam | | 200 (dengan venue dan tier) | 404 untuk draf pada orang lain; tiada `meeting_url` kecuali pemilik atau admin |
| POST | `/events` | O, A | lihat contoh di bawah | 201 | 403 customer; 422 `end_at` sebelum `start_at`; 422 event physical tanpa `venue_id` (event online tidak perlu venue) |
| PUT | `/events/{id}` | O pemilik, A | medan sebahagian, termasuk `status` | 200 | 403 organiser lain; 422 publish event online tanpa `meeting_url` |
| DELETE | `/events/{id}` | O pemilik, A | | 204 | 409 masih ada tempahan aktif |
| POST | `/events/{id}/duplicate` | O pemilik, A | | 201 draf salinan | 403 |
| GET | `/events/{id}/stats` | O pemilik, A | | 200 pengisian, check-in, hasil | 403 |
| GET | `/events/{id}/seat-map` | O pemilik, A | | 200 setiap seat dan pemegangnya | 403 orang lain |
| GET | `/events/{id}/export` | O pemilik, A | | 200 CSV | 403 |
| GET | `/events/{id}/announcements` | O pemilik, A | | 200 `{audience, data}` | 403 |
| POST | `/events/{id}/announcements` | O pemilik, A | `subject` (maks 150), `message` (maks 2000) | 201; emel dihantar selepas respons | 422 tiada tetamu, event bukan published, atau medan kosong; 403; 429 selepas 10 seminit |

Contoh **event physical**:

```json
{
  "title": "Intro to Web Hacking",
  "description": "Workshop dua jam",
  "category": "workshop",
  "venue_id": 1,
  "start_at": "2026-11-20T14:00:00Z",
  "end_at": "2026-11-20T16:00:00Z",
  "status": "draft",
  "seated": true
}
```

Contoh **event online** (tanpa `venue_id`, platform dikesan daripada link):

```json
{
  "title": "Malware Analysis Talk",
  "category": "conference",
  "mode": "online",
  "meeting_url": "https://meet.google.com/abc-defg-hij",
  "start_at": "2026-11-21T20:00:00Z",
  "end_at": "2026-11-21T22:00:00Z"
}
```

Jangkaan: respons ada `"meeting_platform": "meet"`. `category` mesti salah satu `ctf`, `bootcamp`, `conference`, `workshop`. `status` salah satu `draft`, `published`, `cancelled`, `completed`.

#### Ticket types dan seat

| Kaedah | URL | Siapa | Body | Berjaya | Ralat uji |
| --- | --- | --- | --- | --- | --- |
| GET | `/events/{id}/ticket-types` | Awam | | 200 | |
| POST | `/events/{id}/ticket-types` | O pemilik, A | `name`, `price` (≥ 0), `capacity` (≥ 0), `seats_per_row` (1–40, pilihan), `members_only` (true/false, pilihan) | 201 | 403 organiser lain; 422 kapasiti negatif |
| PUT | `/ticket-types/{id}` | O pemilik, A | medan sebahagian | 200 | 422 `seats_remaining` melebihi `capacity` |
| DELETE | `/ticket-types/{id}` | O pemilik, A | | 204 | 403 |
| GET | `/ticket-types/{id}/seats` | Awam | | 200 senarai `{id,row,number,label,taken}` (tidak menyebut siapa duduk) | |

#### Bookings

| Kaedah | URL | Siapa | Body / parameter | Berjaya | Ralat uji |
| --- | --- | --- | --- | --- | --- |
| POST | `/bookings` | C | `ticket_type_id`, `seat_id` (pilihan; wajib bila event ada seat bernombor) | 201. `status`: `confirmed` (tier RM 0), `pending` (tier berbayar, ada `hold_expires_at`), `waitlisted` (habis) | 409 tempahan aktif dah ada; 409 seat diambil; 409 event tak dibuka; 422 seat bukan milik tier; 429 selepas 5 cubaan seminit; 403 organiser tak boleh menempah |
| GET | `/bookings?status=confirmed&event_id=1` | C (sendiri), O (event sendiri), A (semua) | `status`, `event_id`, `page`, `per_page` | 200 berpaginasi | 401 |
| GET | `/bookings/{id}` | Pemilik, O pemilik event, A | | 200 | 403 orang lain |
| PUT | `/bookings/{id}/cancel` | Pemilik, A | | 200. Ada `refund` (dibayar balik jika ≥ 24 jam sebelum mula). Membatalkan dua kali juga 200 (tiada perubahan) | 403 bukan tempahan sendiri |
| POST | `/bookings/{id}/pay` | Pemilik | `method` (`card`,`fpx`,`ewallet`), `outcome` (`approve`,`decline`,`insufficient`, pilihan) | 200 jadi `confirmed` dengan QR | 402 bayaran ditolak; 409 tahan tamat atau sudah dibayar; 429 |
| GET | `/bookings/{id}/qr-code` | Pemilik | | 200 imej PNG (QR API pihak ketiga) | 404 jika belum `confirmed`, atau sudah dibatalkan |
| GET | `/bookings/{id}/certificate` | Pemilik, O pemilik event, A | | 200 PDF | 422 belum hadir atau event belum tamat; 403 |
| GET | `/certificates/{id}/{code}` | Awam | | 200 `{valid, name, event, date}` | 404 kod salah (jawapan sama untuk semua sebab) |
| POST | `/bookings/{id}/join` | Pemilik | | 200 `{meeting_url, platform}` dan tandakan `attended` | 403 bukan tempahan sendiri; 422 belum masa (15 min sebelum mula), atau bukan event online, atau bukan `confirmed` |
| DELETE | `/bookings/{id}` | A | | 204 | 403 customer |
| POST | `/bookings/{id}/checkin` | Pintu (`X-Api-Key`) atau O/A (Bearer) | `qr_token` | 200 jadi `attended` | 401 kunci salah; 422 tiket palsu (`Invalid or tampered ticket`); 409 sudah digunakan atau belum confirmed |

Header khas untuk check-in dengan peranti: `X-Api-Key: {{checkin_api_key}}`.

Dalam butiran tempahan online yang `confirmed`, medan `meeting` memberi `{platform, opens_at, ends_at, open}`. **Link tidak pernah ada dalam senarai atau butiran**; ia hanya keluar daripada `/join`.

#### Ringkasan dan eksport

| Kaedah | URL | Siapa | Berjaya | Ralat uji |
| --- | --- | --- | --- | --- |
| GET | `/admin/stats` | A | 200 hasil, tempahan, aktiviti terkini | 403 bukan admin |
| GET | `/organiser/summary` | O (sendiri), A (semua) | 200 | 403 customer |
| GET | `/organiser/attendance` | O (sendiri), A (semua) | 200 `{events, registered, attended, rate}` | 403 customer |
| GET | `/admin/notifications?type=confirmation` | A | 200 log email dengan respons Resend | 403 |
| GET | `/admin/export/users` | A | 200 CSV | 403 |
| GET | `/admin/export/bookings` | A | 200 CSV | 403 |

### 3.5 Senario ujian langkah demi langkah

Buat setiap senario dalam Postman mengikut turutan. Simpan id daripada respons ke pembolehubah (guna skrip di 3.3) supaya langkah seterusnya pakai `{{event_id}}` dan seumpamanya.

#### Senario 1: Event physical berseat, percuma (aliran utama)

1. `POST /auth/login` sebagai admin → simpan `admin_token`.
2. `POST /users` `{name, email, password, "role":"organiser"}` → 201. Log masuk sebagai organiser → `organiser_token`.
3. `POST /events` (organiser, `venue_id` sedia ada, `status:"draft"`, `seated:true`) → 201, simpan `event_id`.
4. `GET /events/{{event_id}}` **tanpa token** → **404** (draf tersembunyi). *Tangkapan skrin: ralat.*
5. `POST /events/{{event_id}}/ticket-types` `{"name":"Standard","price":0,"capacity":8,"seats_per_row":4}` → 201, simpan `tier_id`.
6. `PUT /events/{{event_id}}` `{"status":"published"}` → 200 (organiser publish sendiri, tanpa admin).
7. `GET /events/{{event_id}}` tanpa token → 200.
8. `GET /ticket-types/{{tier_id}}/seats` → 8 seat `A1…B4`, semua `taken:false`. Simpan `id` seat pertama sebagai `seat_id`.
9. `POST /auth/register` customer → simpan `customer_token`.
10. `POST /bookings` `{"ticket_type_id":{{tier_id}},"seat_id":{{seat_id}}}` → **201, `status: confirmed`**, ada `qr_token`. Simpan `booking_id`.
11. Ulang langkah 10 sekali lagi → **409** (sudah ada tempahan aktif). *Ralat.*
12. `GET /bookings/{{booking_id}}/qr-code` → 200, pratonton imej dalam Postman.
13. `GET /events/{{event_id}}/seat-map` (organiser) → seat pertama `state: booked` dengan emel tetamu.
14. `POST /bookings/{{booking_id}}/checkin` `{"qr_token":"…"}` dengan `X-Api-Key` → 200, `attended`.
15. Ulang 14 → **409** (tiket sudah digunakan). *Ralat.*

#### Senario 2: Bayaran, tahan seat, refund

1. Tambah tier berbayar: `POST /events/{id}/ticket-types` `{"name":"VIP","price":30,"capacity":4}`.
2. Customer `POST /bookings` pada tier VIP → **201, `status: pending`**, `hold_expires_at` dalam beberapa minit.
3. `POST /bookings/{id}/pay` `{"method":"card","outcome":"decline"}` → **402**. *Ralat.*
4. `POST /bookings/{id}/pay` `{"method":"card","outcome":"approve"}` → 200, `confirmed`, `payment.status: paid`.
5. `PUT /bookings/{id}/cancel` untuk event ≥ 24 jam lagi → 200, `refund.refunded: true`.
6. Untuk ujian tahan tamat: tempah tier berbayar lagi, **tunggu tahan tamat** (`SEAT_HOLD_MINUTES`), kemudian `pay` → **409** (hold expired).

#### Senario 3: Event online dan butang Join

1. Organiser `POST /events` dengan `"mode":"online"`, `meeting_url` Zoom atau Meet, **tanpa** `venue_id`, `"status":"draft"` → 201. Semak `meeting_platform` dikesan.
2. `PUT /events/{id}` `{"status":"published"}` bila `meeting_url` kosong → **422** (perlu link). *Ralat.* Tambah `meeting_url`, ulang → 200.
3. `POST /events/{id}/ticket-types` `{"name":"Free","price":0,"capacity":50}`.
4. `GET /events/{id}` tanpa token → 200 tetapi **tiada medan `meeting_url`**. Tangkapan skrin bukti keselamatan.
5. Customer `POST /bookings` → 201 `confirmed`, `seat: null`.
6. `GET /bookings/{id}` → ada `meeting: {platform, opens_at, ends_at, open:false}` dan **tiada link**.
7. `POST /bookings/{id}/join` sebelum 15 minit → **422**.
8. Untuk uji berjaya: cipta event online yang bermula 10 minit dari sekarang, tempah, kemudian `POST /bookings/{id}/join` → **200** dengan `meeting_url`, dan `GET /bookings/{id}` menunjukkan `status: attended`.
9. Customer lain `POST /bookings/{id}/join` (booking bukan miliknya) → **403**.

#### Senario 4: Keselamatan dan peranan

| Ujian | Permintaan | Jangkaan |
| --- | --- | --- |
| Tiada token | `GET /bookings` | 401 |
| Token dibatalkan | `POST /auth/logout`, kemudian `GET /auth/me` | 401 |
| Customer buat event | `POST /events` (customer) | 403 |
| Organiser edit event orang lain | `PUT /events/{id}` (organiser B) | 403 |
| Naik taraf peranan sendiri | `PUT /users/{id}` `{"role":"admin"}` | 200 tetapi peranan tidak berubah |
| Lihat tempahan orang lain | `GET /bookings/{id}` (customer lain) | 403 |
| Tiket palsu | `POST /bookings/{id}/checkin` `{"qr_token":"palsu"}` | 422 |
| Kunci peranti salah | check-in dengan `X-Api-Key: salah` | 401 |
| Anti-scalping | 6 × `POST /bookings` dalam seminit | percubaan ke-6 → **429** |
| Data tak sah | `POST /venues` `{"capacity":0}` | 422 dengan senarai `errors` |
| Pasangan seat | `POST /bookings` seat daripada tier lain | 422 |
| Peta seat orang lain | `GET /events/{id}/seat-map` (organiser B) | 403 |

#### Senario 5: Ujian prestasi ringkas (bukti untuk laporan)

1. Dalam Postman, `GET /events?per_page=50` → catat **masa respons** (paparan di bawah respons).
2. Jalankan **Runner** (klik kanan koleksi → Run) dengan 20 lelaran untuk permintaan yang sama dan salin ringkasan purata dan maksimum.
3. Selepas mengoptimumkan (indeks, query), ulang dan bandingkan.

### 3.6 Cara menjalankan koleksi automatik

Dalam Postman: klik kanan koleksi → **Run collection** → **Run SentryPass API**. Tangkap skrin ringkasan (lulus/gagal).

Atau baris arahan (sama seperti untuk CI):

```bash
npx newman run docs/postman/SentryPass.postman_collection.json \
  -e docs/postman/SentryPass.local.postman_environment.json
```

Laporan HTML boleh dijana dengan `-r htmlextra` selepas `npm i -g newman-reporter-htmlextra`.

### 3.7 Eksport koleksi untuk pengumpulan

Selepas kemas kini, klik **… → Export** (Collection v2.1) dan simpan ke `docs/postman/SentryPass.postman_collection.json`. Eksport juga environment. Jangan letak kata laluan sebenar dalam environment yang dimasukkan ke GitHub (kunci demo tidak mengapa, kunci sebenar jangan).

### 3.8 Senarai tangkapan skrin untuk laporan

Sekurang-kurangnya satu **berjaya** dan satu **ralat** untuk setiap kumpulan:

| Kumpulan | Berjaya | Ralat |
| --- | --- | --- |
| Auth | Login 200 dengan token | Login salah 422; `/auth/me` tanpa token 401 |
| Users | Admin senarai pengguna | Customer senarai pengguna 403 |
| Venues | Cipta venue 201 | Kapasiti 0 → 422 |
| Events | Cipta event 201; penapis dan carian | Customer cipta event 403; draf tersembunyi 404 |
| Ticket types | Tier 201 | Kapasiti negatif 422 |
| Bookings | Tempah 201 confirmed; QR PNG | Duplikat 409; had kadar 429 |
| Bayaran | Bayar 200 | Ditolak 402; bayar dua kali 409 |
| Check-in | Check-in 200 | Tiket palsu 422; digunakan semula 409 |
| Online | Join 200 | Join awal 422; `meeting_url` tiada dalam respons awam |
| Admin | Statistik 200; eksport CSV | Bukan admin 403 |
| Third-party | Respons Resend dalam `/admin/notifications`; imej QR | |
| Runner | Ringkasan koleksi hijau | |

### 3.9 Keadaan koleksi sedia ada

Koleksi sudah dikemas kini: **198 permintaan, 309 semakan, 0 kegagalan** (dijalankan dengan `newman`, sekitar 41 saat). Ia meliputi juga bayaran, seat bernombor, event online dan Join, draf yang tersembunyi, ringkasan organiser, dan reset kata laluan (folder 12 hingga 16). Butiran ada dalam `docs/postman/README.md`.

Dua perkara yang perlu diingat semasa menjalankannya:

- **Tunggu seminit antara dua larian.** `forgot-password` dihadkan 3 kali seminit, jadi larian kedua serta-merta boleh dapat 429.
- **Kunci check-in.** Nilai `checkin_api_key` dalam environment mesti sama dengan `CHECKIN_API_KEY` dalam `backend/.env`. Kalau kau dah menukar kunci (patut), permintaan 7.17 akan dapat 401 sehingga environment dikemas kini.

--- | --- | --- |
| 7.1, 7.19, 7.22 | Tier berbayar kini `pending` sehingga dibayar | Guna tier `price: 0`, atau tambah langkah `pay` |
| 7.12 QR (2 semakan) | Tempahan masih `pending`, jadi belum ada QR | Sama seperti di atas |
| 7.14, 7.17 (4 semakan) | Tiket tak `confirmed` lagi, jadi mesej dan kod status lain | Sama seperti di atas |
| 9.1 Statistik | Jumlah kapasiti berubah | Kemas kini nombor dijangka |
| 11.1 Cancel event | Bilangan tempahan dibatalkan berubah | Kemas kini nombor dijangka |

Tambahan yang belum ada dalam koleksi: `pay`, `join`, seat bernombor, `seat-map`, event online, draf tersembunyi, `organiser/summary`, reset password. Tambah satu folder baru untuk setiap senario 1–3 di atas.

---

## 4. Pelan deploy

### 4.1 Gambaran

| Bahagian | Apa | Cadangan |
| --- | --- | --- |
| API | Laravel 12 (PHP 8.3+) | Hos yang boleh jalankan Docker, dengan HTTPS |
| Pangkalan data | PostgreSQL | PostgreSQL terurus di hos yang sama atau berasingan |
| Web | `frontend/web` (Vite, fail statik) | Hos statik dengan CDN |
| Mobile | `frontend/customer-mobile` (Expo) | Expo Go untuk demo, APK melalui EAS Build untuk penyerahan |
| Email | Resend | Domain yang disahkan (lihat risiko) |

### 4.2 Pilihan hos (semak harga dan had semasa sebelum memilih)

| Pilihan | Kebaikan | Keburukan |
| --- | --- | --- |
| **A. Platform PaaS untuk Docker** (contohnya Railway, Render, Fly.io) | Cepat, HTTPS automatik, pangkalan data Postgres terurus | Had percuma berbeza-beza, mungkin tidur bila tidak digunakan |
| **B. VPS kecil dengan Docker Compose dan Caddy** | Kawalan penuh, satu tempat untuk API, DB, penjadual | Kena urus sendiri (kemas kini, sandaran) |

Cadangan aku: **A** untuk kepantasan, kerana masa terhad. Kalau ada kredit pelajar (GitHub Student Pack, Azure for Students), semak sama ada boleh dipakai untuk VPS.

Untuk web: mana-mana hos statik (Vercel, Netlify, Cloudflare Pages) dengan pilihan **SPA fallback** ke `index.html` supaya `/organiser/events/7` tak jadi 404 bila refresh.

### 4.3 Langkah deploy backend

1. **Dockerfile produksi** (belum ada; Sail hanya untuk pembangunan). Perlukan PHP-FPM dengan Nginx atau FrankenPHP, `composer install --no-dev --optimize-autoloader`, dan `php artisan config:cache route:cache`.
2. **Pembolehubah persekitaran** (jangan komit):

```env
APP_ENV=production
APP_DEBUG=false
APP_KEY=              # php artisan key:generate --show
APP_URL=https://api.contoh.my
DB_CONNECTION=pgsql
DB_HOST=...  DB_PORT=5432  DB_DATABASE=...  DB_USERNAME=...  DB_PASSWORD=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL="UCYSS <events@domain-anda>"
CHECKIN_API_KEY=      # nilai panjang dan rawak, BUKAN nilai lalai
SEAT_HOLD_MINUTES=3
PAYMENTS_DRIVER=sandbox
MEETING_OPEN_MINUTES=15
```

3. Jalankan sekali: `php artisan migrate --force`. Untuk data demo: `php artisan db:seed --force` (sekali sahaja, jangan pada setiap deploy).
4. **Penjadual:** perintah `bookings:release-expired` berjalan setiap minit. Perlukan cron `* * * * * php artisan schedule:run` (atau proses `schedule:work`). Tanpa ini, tahan seat tamat tak dibebaskan secara automatik (masih dibebaskan secara malas bila orang lihat seat, tetapi jangan bergantung).
5. **Baris gilir (queue):** `QUEUE_CONNECTION=database`. Jalankan `php artisan queue:work` sebagai proses berasingan kalau email dihantar melalui queue.
6. **CORS:** dalam produksi hadkan asal kepada domain web anda sahaja, bukan `*`.
7. Uji dengan Postman: tukar `base_url` kepada URL produksi, jalankan koleksi, tangkap skrin.

### 4.4 Langkah deploy web

1. Di hos statik, tetapkan folder `frontend/web`, arahan bina `npm run build`, folder output `dist`.
2. Tetapkan pembolehubah `VITE_API_URL=https://api.contoh.my/api`.
3. Tambah peraturan SPA fallback (Vercel: `vercel.json` dengan rewrite ke `/index.html`; Netlify: `public/_redirects` dengan `/* /index.html 200`).
4. Semak: log masuk, buka `/organiser` terus melalui alamat, refresh pada halaman event, dan butang Join.

### 4.5 Langkah deploy mobile

1. Tetapkan `EXPO_PUBLIC_API_URL=https://api.contoh.my/api`.
2. **Demo mudah:** `npx expo start --tunnel`, dan buka dalam Expo Go pada telefon. Ini cukup untuk video.
3. **Fail pemasangan:** akaun Expo, `npx eas build -p android --profile preview` menghasilkan `.apk` yang boleh dipasang (iOS memerlukan akaun pemaju berbayar; guna Expo Go untuk iOS).
4. Semak butang Join dan pemuatan semula automatik pada API produksi.

### 4.6 Risiko yang perlu dijaga

- **Email Resend:** dengan alamat percuma `onboarding@resend.dev`, Resend hanya menghantar kepada emel pemilik akaun. Untuk menghantar kepada pelajar, **perlu domain sendiri yang disahkan**. Pengesahan email pengguna dan email peringatan bergantung pada ini.
- **Pangkalan data:** ambil sandaran sebelum demonstrasi; jangan `migrate:fresh` pada produksi.
- **Kunci dan kata laluan:** tukar `CHECKIN_API_KEY`, dan kata laluan akaun seeder (`password`) sebelum pautan diberi kepada sesiapa. Akaun `admin@sentrypass.test` dengan kata laluan `password` mesti ditukar atau dipadam pada produksi.
- **Bayaran:** kekal `sandbox`; jangan mendakwa ia memproses wang sebenar.
- **Kos:** semak had percuma dan kadar penggunaan sebelum tarikh demo. Tarik pelan sandaran jika hos tidur.

### 4.7 Senarai semak "go live"

- [ ] API menjawab `https://…/api/events` dengan JSON.
- [ ] `migrate` dan seeder (jika perlu) telah dijalankan.
- [ ] Cron `schedule:run` aktif, dan queue worker berjalan.
- [ ] Web memuatkan senarai event dan log masuk berfungsi.
- [ ] Refresh pada `/organiser/events/7` tidak 404.
- [ ] Koleksi Postman lulus sepenuhnya terhadap URL produksi.
- [ ] Emel pengesahan diterima oleh alamat sebenar (jika domain telah disahkan).
- [ ] Butang Join dan peta seat organiser diuji pada URL produksi.
- [ ] Kunci lalai dan kata laluan demo ditukar.
- [ ] Pautan GitHub, video, dan URL live dimasukkan dalam laporan dan diuji tanpa log masuk.
