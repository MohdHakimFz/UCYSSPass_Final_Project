# Workflow untuk menguji setiap fungsi (ujian tangan)

Ikut turutan. Setiap langkah ada **apa yang perlu dibuat** dan **apa yang patut berlaku**. Tanda `[x]` bila lulus. Kalau sesuatu tak berlaku seperti ditulis, catat nombor langkah itu dan tangkap skrin: itu bukti untuk laporan (kes ralat) atau senarai bug.

Setiap bahagian ada tanda 📸 di mana tangkapan skrin berguna untuk laporan.

## 0. Sediakan

```powershell
# 1. Backend (folder backend)
docker compose up -d

# 2. Web (folder frontend/web), dalam tetingkap lain
npm run dev          # http://localhost:5175

# 3. Mobile (folder frontend/customer-mobile), dalam tetingkap lain, bila nak uji telefon
npx expo start
```

**Data bersih (pilihan, tetapi disyorkan sebelum ujian penuh).** Ini **memadam semua data** dalam pangkalan data pembangunan, kemudian mengisi programme UCYSS:

```powershell
docker compose exec laravel.test php artisan migrate:fresh --seed
```

| Akaun | Emel | Kata laluan |
| --- | --- | --- |
| Admin | `admin@sentrypass.test` | `password` |
| Organiser A | `aisyah@ucyss.test` | `password` |
| Organiser B | `farid@ucyss.test` | `password` |
| Customer demo | `customer@sentrypass.test` | `password` |
| Pelajar | `adam.iskandar@ucyss.test` (dan 39 lagi) | `password` |

Tanpa `migrate:fresh`, guna akaun sedia ada kau.

Dua arahan yang berguna semasa menguji (dalam folder `backend`):

```powershell
docker compose exec laravel.test php artisan bookings:release-expired   # lepaskan tahan seat yang tamat
docker compose exec laravel.test php artisan bookings:send-reminders    # hantar peringatan yang patut dihantar
```

- [ ] API hidup: buka `http://localhost/api/events` dalam pelayar, keluar JSON.
- [ ] Web hidup: buka `http://localhost:5175`, nampak halaman UCYSS.

---

## 1. Akaun dan log masuk

- [ ] **Daftar.** `/register`: isi nama, emel baru, kata laluan (min 8) dan pengesahan. Lepas daftar terus masuk ke **My passes**.
- [ ] **Kata laluan tak sepadan.** Isi pengesahan yang berbeza: mesej ralat jelas, tidak berdaftar.
- [ ] **Emel dah wujud.** Daftar dengan emel yang sama sekali lagi: ditolak dengan mesej.
- [ ] **Log masuk salah.** Kata laluan salah: mesej "The provided credentials are incorrect", kekal di halaman log masuk.
- [ ] **Satu log masuk, tiga kawasan.** Log masuk sebagai customer: masuk **My passes**. Sebagai organiser: **My events**. Sebagai admin: dashboard **Admin** (bukan Organiser).
- [ ] **Kawalan peranan.** Log masuk sebagai customer, taip `/admin` dan `/organiser` pada alamat: dibawa balik ke **My passes**. Sebagai organiser, taip `/admin/users`: dibawa balik ke `/organiser`.
- [ ] **Log keluar.** Selepas log keluar, `/passes` menghantar ke log masuk. 📸
- [ ] **Lupa kata laluan.** `/forgot-password`, masukkan emel: mesej umum "If that email has an account...". Emel yang tak wujud dapat mesej yang **sama**. (Kod 6 digit hanya sampai jika emel itu emel pemilik akaun Resend.)

## 2. Organiser: buat dan urus event

Log masuk sebagai **Organiser A**.

- [ ] **Buat event fizikal.** My events, **Create event**. Pilih **In person**, isi tajuk, kategori, venue, mula dan tamat, tekan **Create event**. Mesej: dibuat sebagai **draft**.
- [ ] **Amaran draft.** Pada halaman event nampak amaran kuning "This event is a draft...".
- [ ] **Tambah tier.** **Add tier**, contohnya `Standard`, harga `0`, seat `10`. Tier muncul dalam jadual.
- [ ] **Publish sendiri.** Tekan **Publish event**. Status jadi **Published**, mesej "Event is live". Tiada admin terlibat. 📸
- [ ] **Customer nampak.** Dalam tetingkap lain (customer), event muncul dalam senarai **dalam masa lebih kurang 5 saat tanpa refresh**.
- [ ] **Unpublish.** Tekan **Move back to draft**: dalam 5 saat event hilang daripada senarai customer.
- [ ] **Sunting.** Tukar tajuk, **Save event**: mesej "Event saved."
- [ ] **Salin event.** **Duplicate event**: dapat salinan draft dengan tier yang sama.
- [ ] **Breadcrumb.** Klik **My events** di atas halaman event: kembali ke senarai (tidak kosong). Sidebar **My events** juga.
- [ ] **Eksport.** **Export attendees (CSV)** memuat turun fail.

## 3. Tempah tiket (customer)

Log masuk sebagai **customer**. Guna event percuma yang baru dipublish.

- [ ] **Tempah percuma.** Buka event, **Book this pass**: terus **Confirmed**.
- [ ] **My passes.** Tiket muncul, **Show pass** memaparkan kod QR. 📸
- [ ] **Tempahan berganda.** Tempah tier yang sama lagi: ditolak ("already have an active booking").
- [ ] **Add to calendar.** Butang memuat turun fail `.ics`; buka dalam kalendar.
- [ ] **Waitlist.** Buat tier dengan **1 seat**, tempah dengan customer A, kemudian customer B: B masuk **waitlist** (nombor giliran). Customer A **Cancel booking**: B jadi **Confirmed** secara automatik (dan dapat email).
- [ ] **Batal.** **Cancel booking** meminta pengesahan; selepas itu status **Cancelled**.
- [ ] **Event ditutup.** Event draft, dibatalkan atau sudah tamat tak boleh ditempah.
- [ ] **Had tempahan.** Cuba 6 tempahan dalam seminit oleh satu customer: yang ke-6 dapat mesej terlalu banyak permintaan (429).

## 4. Bayaran, tahan seat dan refund

Buat tier berbayar (contohnya `VIP`, `RM 30`) pada event yang dipublish.

- [ ] **Tahan seat.** Customer tempah: status **Awaiting payment**, ada kiraan detik (lebih kurang 3 minit).
- [ ] **Bayaran ditolak.** Dalam tetingkap bayaran pilih hasil ujian **decline**: mesej ditolak, tahan kekal, boleh cuba lagi.
- [ ] **Bayaran diluluskan.** Pilih **approve**: jadi **Confirmed**, ada QR, dan "Paid RM 30.00". 📸
- [ ] **Tahan tamat.** Tempah tier berbayar, **jangan bayar**, tunggu 3 minit (atau jalankan `bookings:release-expired`): tempahan dilepaskan, seat kembali dijual.
- [ ] **Refund.** Batalkan tempahan berbayar untuk event lebih 24 jam lagi: mesej refund penuh, dan tiket ditanda **Refunded**. Untuk event kurang 24 jam: tiada refund (mesej menyebutnya).

## 5. Seat bernombor

Organiser: pada borang event hidupkan **Numbered seats**, simpan, tambah tier (contohnya 8 seat, 4 setiap baris).

- [ ] **Peta seat.** Customer buka event: nampak peta 3D dengan nombor seat (A1, A2...). Pilih satu seat: butang jadi "Book seat A1". 📸
- [ ] **Seat wajib.** Tanpa memilih seat, butang "Choose a seat above" tak aktif.
- [ ] **Seat diambil.** Selepas customer A tempah A1, customer B nampak A1 tak boleh dipilih (dalam 5 saat).
- [ ] **Seat pada tiket.** My passes menunjukkan "Seat A1".
- [ ] **Peta organiser.** Organiser buka halaman event, bahagian **Seat map**: warna biru (ditempah), kuning (tunggu bayaran), hijau (dah check-in), kelabu (kosong). Klik seat: nama dan emel tetamu. 📸
- [ ] **Keselamatan.** Organiser lain dan customer tak boleh nampak peta ini (tiada bahagian itu, atau ditolak).

## 6. Check-in di pintu

- [ ] **Imbas QR.** Organiser, menu **Check-in**, pilih event, imbas QR dari telefon customer (atau **Can't scan? Enter the ticket instead** dan tampal). Keputusan hijau **Cleared to enter**, dengan nama dan seat. 📸
- [ ] **Guna semula.** Imbas tiket yang sama sekali lagi: ditolak (sudah digunakan).
- [ ] **Tiket palsu.** Ubah satu huruf dalam token: ditolak sebagai palsu.
- [ ] **Kemas kini langsung.** Selepas check-in, peta seat organiser bertukar hijau dalam 5 saat.

## 7. Event online

Organiser: **Create event**, pilih **Online meeting**.

- [ ] **Tiada venue dan seat.** Medan venue dan "Numbered seats" hilang; ada medan **Meeting link**.
- [ ] **Kesan platform.** Tampal `https://meet.google.com/abc-defg-hij`: nampak "Detected: Google Meet". Cuba pautan Zoom dan Teams juga.
- [ ] **Publish perlukan link.** Simpan tanpa link, tekan **Publish event**: ralat "needs a meeting link". Tambah link, simpan, publish: berjaya.
- [ ] **Link tersembunyi.** Sebagai customer (atau tanpa log masuk), buka halaman event: **tiada link** di mana-mana. Klik kanan, View Source, cari `meet.google.com`: tiada. 📸
- [ ] **Tempah.** Customer tempah tier percuma: tiada seat, tiket tunjuk butang kelabu "Opens ...".
- [ ] **Join awal.** Butang tak boleh ditekan sebelum 15 minit sebelum mula.
- [ ] **Join sebenar.** Buat event online yang bermula **10 minit dari sekarang**, tempah: butang jadi **Join on Google Meet**. Tekan: tab baru buka link, dan tempahan jadi **Attended**. 📸
- [ ] **Organiser nampak.** Organiser lihat tetamu itu sebagai hadir (Checked in).
- [ ] **Senarai event.** Kad event online ada tag **Online**; admin boleh tapis **Online** dalam senarai event.

## 8. Peringatan email

- [ ] **Sediakan.** Buat event percuma yang bermula lebih kurang **20 jam dari sekarang** (published), tempah dengan customer yang emelnya `kl2307014329@student.uptm.edu.my` (emel pemilik akaun Resend). Kemudian jadikan tempahan itu "lama" supaya layak (peringatan tak dihantar kepada yang baru menempah dalam sejam):

  ```powershell
  docker compose exec laravel.test php artisan tinker --execute="App\Models\Booking::latest('id')->first()->update(['booked_at' => now()->subHours(3)]);"
  ```
- [ ] **Hantar.** `docker compose exec laravel.test php artisan bookings:send-reminders`: mencetak `Sent 1 reminders.`
- [ ] **Sekali sahaja.** Jalankan arahan yang sama lagi: `Sent 0 reminders.`
- [ ] **Peti masuk.** Emel "Reminder: ... is coming up" sampai, dengan masa Malaysia, tempat, dan lampiran `event.ics`. 📸
- [ ] **Log admin.** Admin, **Emails**, tapis "Reminder before the event": ada baris dengan jawapan Resend (status 200).

## 9. Pengumuman organiser

Organiser, halaman event yang dipublish dan sudah ada tempahan, bahagian **Announcements**.

- [ ] **Butang tak aktif** sehingga subjek dan mesej diisi. Ia menyebut bilangan orang ("Send to 3 people").
- [ ] **Hantar.** Tekan, tetingkap pengesahan muncul, **Send announcement**: mesej "Announcement is on its way".
- [ ] **Sejarah.** Muncul dalam senarai dengan bilangan penerima; **Show the message** memaparkan teks.
- [ ] **Sekali seorang.** Orang yang tempah dua tier hanya dapat satu email.
- [ ] **Event draft.** Bahagian itu berkata perlu dipublish dahulu.
- [ ] **Log admin.** Admin, **Emails**, tapis "Organiser announcement".

## 10. Tier khas ahli

- [ ] **Buat.** Organiser, **Add tier**, hidupkan **UCYSS members only**. Jadual tunjuk tag **Members only**.
- [ ] **Bukan ahli.** Customer biasa: tier ada tag "Members only", butang tak aktif, dan nota "Ask a UCYSS committee member...".
- [ ] **Jadikan ahli.** Admin, **People**, cari customer itu, menu tindakan, **Add to member list**: tag hijau **Member** muncul.
- [ ] **Kini boleh.** Customer (dalam 30 saat atau selepas refresh) boleh menempah tier itu.
- [ ] **Tak boleh naikkan sendiri.** Customer tiada cara menjadikan diri ahli.

## 11. Kehadiran dan sijil

Perlukan event yang **sudah tamat** dengan tetamu yang hadir. Cara cepat: guna event "Cloud Security Fundamentals" daripada data demo (`migrate:fresh --seed`), atau ubah tarikh event dalam borang organiser ke masa lalu selepas check-in.

- [ ] **Statistik.** Halaman **My events** (organiser) dan **Overview** (admin) ada panel **Attendance**: "X of Y who registered came (Z%)". 📸
- [ ] **Sijil.** Customer yang hadir: pada My passes ada **Download certificate**; ia memuat turun PDF dengan nama, event, tarikh, dan nombor sijil. 📸
- [ ] **Semak sijil.** Buka alamat yang tercetak pada sijil (`/verify/...`) dalam pelayar lain, tanpa log masuk: "This certificate is genuine". Ubah huruf terakhir kod: "We could not confirm this certificate".
- [ ] **Tak hadir.** Customer yang tak hadir tiada butang sijil.

## 12. Kongsi

- [ ] **WhatsApp.** Pada halaman event yang dipublish, **Share on WhatsApp** membuka WhatsApp dengan mesej siap (tajuk, masa, tempat, pautan). Event online: tiada link meeting dalam mesej.
- [ ] **Salin.** **Copy link** menukar kepada "Link copied"; tampal di mana-mana: alamat event.

## 13. Admin

Log masuk sebagai admin.

- [ ] **Overview.** Kad nombor (hasil, tiket, seat, check-in), acara akan datang, "Needs attention", aktiviti terkini, dan panel Attendance. Pautan dalam "Needs attention" membuka senarai yang ditapis.
- [ ] **Events.** Tab status, carian, tapis **Type** (Online/In person), menu tindakan (publish, batal, padam) dengan tetingkap pengesahan.
- [ ] **Bookings.** Tab status, lajur pembayaran dan seat, **Cancel booking** dan **Delete record** dengan pengesahan, **Export CSV**.
- [ ] **Venues.** Tambah, sunting, padam. Padam venue yang masih ada event: ditolak dengan mesej.
- [ ] **People.** Tab peranan, carian, **Add account** (organiser), **Change role**, ahli, padam, **Export CSV**.
- [ ] **Emails.** Log dengan jawapan Resend; tapis mengikut jenis.
- [ ] **Tema gelap.** Butang bulan/matahari di atas: seluruh dashboard bertukar, dan diingati.
- [ ] **Pautan silang.** "Organiser tools" di sidebar admin, dan "Back to admin" di organiser.

## 14. Kemas kini langsung (tanpa refresh)

Buka dua tetingkap bersebelahan (contohnya organiser dan customer).

- [ ] Organiser publish atau unpublish: customer nampak dalam lebih kurang 5 saat.
- [ ] Customer tempah seat: peta organiser berubah dalam 5 saat.
- [ ] Customer lain tak boleh memilih seat yang baru diambil; kalau sedang memilihnya, dapat mesej "was just taken".

## 15. App mobile (telefon sebenar)

Pastikan `EXPO_PUBLIC_API_URL` betul (atau telefon dan komputer pada rangkaian yang sama) dan buka melalui Expo Go.

- [ ] Daftar dan log masuk; papan kekunci tidak menutup medan (kata laluan, pengesahan).
- [ ] Senarai event: event yang baru dipublish muncul sendiri (tanpa tarik untuk refresh).
- [ ] Kad dan butiran event online menunjukkan "Online meeting".
- [ ] Peta seat 3D **tanpa butang zoom**; pilih seat dan tempah.
- [ ] Bayar tiket berbayar (tahan seat dengan kiraan detik).
- [ ] Tiket online: butang **Join on ...** (kelabu sebelum masa, aktif 15 minit sebelum).
- [ ] Tier "Members only" tak boleh ditempah oleh bukan ahli.
- [ ] Tiket tiada isyarat: QR masih dibuka (disimpan dalam telefon).

## 16. Ujian automatik (jalankan sekali untuk bukti)

| Apa | Arahan | Jangkaan |
| --- | --- | --- |
| Backend | `docker compose exec laravel.test php artisan test` (folder `backend`) | 211 lulus |
| Browser | `npx playwright test` (folder `frontend/web`, API dan web hidup) | 41 lulus |
| API (Postman) | lihat `docs/postman/README.md` | 198 permintaan, 309 semakan, 0 gagal |
| Web | `npx tsc -b`, `npm run lint`, `npm run build` (folder `frontend/web`) | tiada ralat |
| Mobile | `npx tsc --noEmit` (folder `frontend/customer-mobile`) | tiada ralat |
| Resend | `docker compose exec laravel.test php artisan emails:test kl2307014329@student.uptm.edu.my` | `Resend answered 200` |

## Kalau sesuatu gagal

1. Halaman kosong atau "X is not defined": hentikan `npm run dev`, padam `frontend/web/node_modules/.vite` (`Remove-Item -Recurse -Force node_modules\.vite`), mulakan semula, dan tekan Ctrl+Shift+R.
2. Ralat pelayan pada API: `docker compose logs --tail 50 laravel.test` dan `storage/logs/laravel.log`.
3. Email tak sampai: jalankan `emails:test`. 403 bermakna Resend masih mod ujian (hanya emel pemilik akaun).
4. Terlalu banyak permintaan (429): tunggu seminit.
