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

- [works] API hidup: buka `http://localhost/api/events` dalam pelayar, keluar JSON.
- [works] Web hidup: buka `http://localhost:5175`, nampak halaman UCYSS.

---

## 1. Akaun dan log masuk

- [Works] **Daftar.** `/register`: isi nama, emel baru, kata laluan (min 8) dan pengesahan. Lepas daftar terus masuk ke **My passes**.
- [works] **Kata laluan tak sepadan.** Isi pengesahan yang berbeza: mesej ralat jelas, tidak berdaftar.
- [works] **Emel dah wujud.** Daftar dengan emel yang sama sekali lagi: ditolak dengan mesej.
- [works] **Log masuk salah.** Kata laluan salah: mesej "The provided credentials are incorrect", kekal di halaman log masuk.
- [works] **Satu log masuk, tiga kawasan.** Log masuk sebagai customer: masuk **My passes**. Sebagai organiser: **My events**. Sebagai admin: dashboard **Admin** (bukan Organiser).
- [works] **Kawalan peranan.** Log masuk sebagai customer, taip `/admin` dan `/organiser` pada alamat: dibawa balik ke **My passes**. Sebagai organiser, taip `/admin/users`: dibawa balik ke `/organiser`.
- [works] **Log keluar.** Selepas log keluar, `/passes` menghantar ke log masuk. 📸
- [works] **Lupa kata laluan.** `/forgot-password`, masukkan emel: mesej umum "If that email has an account...". Emel yang tak wujud dapat mesej yang **sama**. Untuk emel yang wujud, kod 6 digit sampai ke peti masuk (melalui Brevo). Di mesin pembangunan kod itu juga dicatat dalam `backend/storage/logs/laravel.log`.

## 2. Organiser: buat dan urus event

Log masuk sebagai **Organiser A**.

- [works] **Buat event fizikal.** My events, **Create event**. Pilih **In person**, isi tajuk, kategori, venue, mula dan tamat, tekan **Create event**. Mesej: dibuat sebagai **draft**.
- [works] **Amaran draft.** Pada halaman event nampak amaran kuning "This event is a draft...".
- [works] **Tambah tier.** **Add tier**, contohnya `Standard`, harga `0`, seat `10`. Tier muncul dalam jadual.
- [works] **Publish sendiri.** Tekan **Publish event**. Status jadi **Published**, mesej "Event is live". Tiada admin terlibat. 📸
- [works] **Customer nampak.** Dalam tetingkap lain (customer), event muncul dalam senarai **dalam masa lebih kurang 5 saat tanpa refresh**.
- [good] **Unpublish.** Tekan **Move back to draft**: dalam 5 saat event hilang daripada senarai customer.
- [works] **Sedang berlangsung.** Event yang masa mulanya sudah berlalu tetapi belum tamat **kekal dalam senarai** dengan tanda "Happening now", dan masih boleh ditempah. Event yang sudah tamat tidak ditunjukkan.
- [good]  **Sunting.** Tukar tajuk, **Save event**: mesej "Event saved."
- [good] **Salin event.** **Duplicate event**: dapat salinan draft dengan tier yang sama.
- [good] **Breadcrumb.** Klik **My events** di atas halaman event: kembali ke senarai (tidak kosong). Sidebar **My events** juga.
- [good] **Eksport.** **Export attendees (CSV)** memuat turun fail.

## 3. Tempah tiket (customer)

Log masuk sebagai **customer**. Guna event percuma yang baru dipublish.

- [works] **Tempah percuma.** Buka event, **Book this pass**: terus **Confirmed**.
- [works] **My passes.** Tiket muncul, **Show pass** memaparkan kod QR. 📸
- [works] **Tempahan berganda.** Tempah tier yang sama lagi: ditolak ("already have an active booking").
- [works] **Add to calendar.** Butang memuat turun fail `.ics`; buka dalam kalendar.
- [works] **Waitlist.** Guna dua akaun customer (A dan B: dua pelayar, atau satu biasa dan satu incognito). Organiser: buat tier baru dengan **Seats = 1** pada event yang dipublish. (1) A buka event, **Book this pass** pada tier itu: **Confirmed**. (2) B buka event yang sama: tier itu **Sold out** dan butangnya jadi **Join waitlist**; tekan: dalam **My passes** B nampak **Waitlisted** dan "You're number 1 in the queue". (3) A ke **My passes**, **Cancel booking**, sahkan. (4) Dalam 5 saat tempahan B jadi **Confirmed** sendiri, dan emel "You're in" sampai kepada B.
- [works] **Batal.** **Cancel booking** meminta pengesahan; selepas itu status **Cancelled**.
- [works] **Event ditutup.** Tiga keadaan yang customer tak boleh tempah. (a) **Draft**: organiser simpan event tanpa Publish; customer tak nampak event itu dalam senarai. (b) **Cancelled**: organiser/admin batalkan event yang sudah dipublish; event hilang daripada senarai customer dan tempahan sedia ada dibatalkan (dapat emel). (c) **Sudah tamat**: event yang masa tamatnya sudah lepas hilang daripada senarai; tempahan melalui API/Postman ditolak dengan mesej "This event is not open for booking." (409). Cara mudah: publish satu event, sahkan customer nampak, **Cancel event**, refresh halaman customer: event hilang.
- [works] **Had tempahan.** Cuba 6 tempahan dalam seminit oleh satu customer: yang ke-6 dapat mesej terlalu banyak permintaan (429).

## 4. Bayaran, tahan seat dan refund

Buat tier berbayar (contohnya `VIP`, `RM 30`) pada event yang dipublish.

- [works] **Tahan seat.** Customer tempah: status **Awaiting payment**, ada kiraan detik (lebih kurang 3 minit).
- [works] **Bayaran ditolak.** Dalam tetingkap bayaran pilih hasil ujian **decline**: mesej ditolak, tahan kekal, boleh cuba lagi.
- [works] **Bayaran diluluskan.** Pilih **approve**: jadi **Confirmed**, ada QR, dan "Paid RM 30.00". 📸
- [works] **Tahan tamat.** Tempah tier berbayar, **jangan bayar**, tunggu 3 minit (atau jalankan `bookings:release-expired`): tempahan dilepaskan, seat kembali dijual.
- [works] **Refund.** Tiada butang "Refund" berasingan: refund berlaku **automatik apabila customer menekan Cancel booking**. (1) Customer tempah tier berbayar dan luluskan bayaran (event lebih 24 jam lagi). (2) **My passes**, **Cancel booking**: dialog menyebut "You will be refunded RM 30.00". (3) Sahkan: mesej "Booking cancelled. RM 30.00 has been refunded." dan kad tiket menunjukkan **Refunded RM 30.00**. (4) Event berbayar yang bermula dalam 24 jam: dialog berkata tidak akan direfund, dan tiada baris Refunded. (5) Jika organiser/admin membatalkan seluruh event, semua yang dah bayar dapat refund penuh.

## 5. Seat bernombor

Organiser: pada borang event hidupkan **Numbered seats**, simpan, tambah tier (contohnya 8 seat, 4 setiap baris).

- [works] **Peta seat.** Customer buka event: nampak peta 3D dengan nombor seat (A1, A2...). Pilih satu seat: butang jadi "Book seat A1". 📸
- [works] **Seat wajib.** Tanpa memilih seat, butang "Choose a seat above" tak aktif.
- [works] **Seat diambil.** Selepas customer A tempah A1, customer B nampak A1 tak boleh dipilih (dalam 5 saat).
- [works] **Seat pada tiket.** My passes menunjukkan "Seat A1".
- [works] **Peta organiser.** Organiser buka halaman event, bahagian **Seat map**: warna biru (ditempah), kuning (tunggu bayaran), hijau (dah check-in), kelabu (kosong). Klik seat: nama dan emel tetamu. 📸
- [works] **Keselamatan.** Organiser lain dan customer tak boleh nampak peta ini (tiada bahagian itu, atau ditolak).

## 6. Check-in di pintu

- [works] **Imbas QR.** Organiser, menu **Check-in**, pilih event, imbas QR dari telefon customer (atau **Can't scan? Enter the ticket instead** dan tampal). Keputusan hijau **Cleared to enter**, dengan nama dan seat. 📸
- [works] **Guna semula.** Imbas tiket yang sama sekali lagi: ditolak (sudah digunakan).
- [works] **Tiket palsu.** Ubah satu huruf dalam token: ditolak sebagai palsu.
- [works] **Kemas kini langsung.** Selepas check-in, peta seat organiser bertukar hijau dalam 5 saat.

## 7. Event online

Organiser: **Create event**, pilih **Online meeting**.

- [works] **Tiada venue dan seat.** Medan venue dan "Numbered seats" hilang; ada medan **Meeting link**.
- [works] **Kesan platform.** Tampal `https://meet.google.com/abc-defg-hij`: nampak "Detected: Google Meet". Cuba pautan Zoom dan Teams juga.
- [works] **Publish perlukan link.** Simpan tanpa link, tekan **Publish event**: ralat "needs a meeting link". Tambah link, simpan, publish: berjaya.
- [works] **Link tersembunyi.** Sebagai customer (atau tanpa log masuk), buka halaman event: **tiada link** di mana-mana. Klik kanan, View Source, cari `meet.google.com`: tiada. 📸
- [works] **Tempah.** Customer tempah tier percuma: tiada seat, tiket tunjuk butang kelabu "Opens ...".
- [works] **Join awal.** Butang tak boleh ditekan sebelum 15 minit sebelum mula.
- [works] **Join sebenar.** Buat event online yang bermula **10 minit dari sekarang**, tempah: butang jadi **Join on Google Meet**. Tekan: tab baru buka link, dan tempahan jadi **Checked in** (label untuk status "attended"; maksudnya hadir). 📸
- [works] **Organiser nampak.** Organiser lihat tetamu itu sebagai hadir (Checked in).
- [works] **Senarai event.** Kad event online ada tag **Online**; admin boleh tapis **Online** dalam senarai event.

## 8. Peringatan email

- [ ] **Faham syarat.** Peringatan ("Reminder: ... is coming up") dihantar sendiri setiap 10 minit, tetapi hanya untuk tempahan yang **Confirmed**, event **published** dan bermula dalam **24 jam akan datang**, ditempah **lebih sejam lalu**, dan belum pernah diingatkan. Tempahan event yang jauh, yang sudah **Checked in** atau Cancelled tidak layak (itu sebab `Sent 0`).
- [ ] **Sediakan.** Emel dihantar melalui **Brevo** ke emel customer sebenar (`mh29209501@gmail.com`). (1) Organiser buat event percuma yang bermula lebih kurang **20 jam dari sekarang**, publish. (2) Customer itu tempah tier percuma. (3) Semua arahan `docker compose` dijalankan dalam folder **`backend`**. Cari nombor tempahan itu:

  ```powershell
  docker compose exec laravel.test php artisan tinker --execute="echo App\Models\Booking::latest('id')->first()->id;"
  ```
  (4) Jadikan tempahan itu "lama" (ganti `123` dengan nombor tadi, jangan guna nombor contoh):

  ```powershell
  docker compose exec laravel.test php artisan tinker --execute="App\Models\Booking::find(123)->update(['booked_at' => now()->subHours(3)]);"
  ```
- [ ] **Hantar.** `docker compose exec laravel.test php artisan bookings:send-reminders`: mencetak `Sent 1 reminders.` Jalan pintas tanpa syarat masa: `docker compose exec laravel.test php artisan bookings:send-reminders --booking=123` (mengingatkan tempahan itu sahaja; kalau gagal ia menyebut sebabnya).
- [ ] **Sekali sahaja.** Jalankan arahan yang sama lagi: `Sent 0 reminders.`
- [ ] **Peti masuk.** Emel "Reminder: ... is coming up" sampai (semak Spam juga), dengan masa Malaysia, tempat (atau link meeting), dan lampiran `event.ics`. 📸
- [ ] **Log admin.** Admin, **Emails**, tapis "Reminder before the event": ada baris dengan jawapan Brevo (status 201).

## 9. Pengumuman organiser

Organiser, halaman event yang dipublish dan sudah ada tempahan, bahagian **Announcements**.

- [works] **Butang tak aktif** sehingga subjek dan mesej diisi. Ia menyebut bilangan orang ("Send to 3 people").
- [works] **Hantar.** Tekan, tetingkap pengesahan muncul, **Send announcement**: mesej "Announcement is on its way".
- [works] **Sejarah.** Muncul dalam senarai dengan bilangan penerima; **Show the message** memaparkan teks.
- [works] **Sekali seorang.** Orang yang tempah dua tier hanya dapat satu email.
- [works] **Event draft.** Bahagian itu berkata perlu dipublish dahulu.
- [works] **Log admin.** Admin, **Emails**, tapis "Organiser announcement".

## 10. Tier khas ahli

- [works] **Buat.** Organiser, **Add tier**, hidupkan **UCYSS members only**. Jadual tunjuk tag **Members only**.
- [works] **Bukan ahli.** Customer biasa: tier ada tag "Members only", butang tak aktif, dan nota "Ask a UCYSS committee member...".
- [works] **Jadikan ahli.** Admin, **People**, cari customer itu, menu tindakan, **Add to member list**: tag hijau **Member** muncul.
- [works] **Kini boleh.** Customer (dalam 30 saat atau selepas refresh) boleh menempah tier itu.
- [works] **Tak boleh naikkan sendiri.** Customer tiada cara menjadikan diri ahli.

## 11. Kehadiran, tak hadir dan sijil

Perlukan event dengan seorang yang **hadir** dan seorang yang **tempah tetapi tak hadir**. Cara sendiri (data tak hilang): (1) buat event online percuma bermula 10 minit lagi, dengan meeting link, publish; (2) customer A dan customer B tempah; (3) A tekan **Join** sehingga jadi **Checked in**; B tidak berbuat apa-apa; (4) organiser ubah **tarikh tamat** event ke masa lalu (mula lebih awal daripada tamat), simpan. (Cara pantas: `migrate:fresh --seed` menyediakan event demo, tetapi **memadam semua data**.)

- [works] **Sedang berlangsung.** Sebelum event tamat: panel **Attendance** (organiser: **My events**; admin: **Overview**) sudah menyenaraikan event itu, dengan "X of Y came" dan tanda biru **Happening now**. Tiada bilangan "did not attend" lagi (tetamu masih boleh sampai).
- [works] **Selepas tamat.** Selepas tarikh tamat diubah: baris event menunjukkan peratus, "X of Y came" dan teks merah **"N did not attend"**. Tajuk panel: "X of Y who registered came (Z%), N did not attend". Nama event panjang dipotong dengan "..." dan baris tak melekat di tepi. 📸
- [works] **Tag tak hadir.** Admin (halaman event dan **Bookings**) dan organiser (halaman event): tetamu yang **Confirmed** pada event yang sudah tamat menunjukkan tag **Did not attend** (bukan "Confirmed"); yang hadir kekal **Checked in**. Pada "How it's going": ayat "1 confirmed guest did not attend", segmen bar merah dan legend "Did not attend". 📸
- [works] **Sijil belum tersedia.** Customer yang **Checked in** tetapi event belum tamat: tiada butang sijil, hanya nota "Your certificate is ready once the event ends (...)".
- [works] **Sijil.** Selepas event tamat: pada **My passes** muncul **Download certificate**. PDF (A4 landscape) ada jalur header UCYSS, nama peserta, tajuk event, tarikh, tempat, penganjur, tandatangan penganjur, meterai "UCYSS VERIFIED", tarikh dikeluarkan dan nombor sijil. 📸
- [works] **Semak sijil.** Buka alamat yang tercetak pada sijil (`/verify/...`) dalam pelayar lain, tanpa log masuk: "This certificate is genuine". Ubah huruf terakhir kod: "We could not confirm this certificate".
- [works] **Tak hadir tiada sijil.** Customer B (tak hadir): tiada butang sijil, dan tiket menunjukkan status **Confirmed**.

## 12. Kongsi

- [works] **WhatsApp.** Pada halaman event yang dipublish, **Share on WhatsApp** membuka WhatsApp dengan mesej siap (tajuk, masa, tempat, pautan). Event online: tiada link meeting dalam mesej.
- [works] **Salin.** **Copy link** menukar kepada "Link copied"; tampal di mana-mana: alamat event.

## 13. Admin

Log masuk sebagai admin.

- [works] **Overview.** Kad nombor (hasil, tiket, seat, check-in), acara akan datang, "Needs attention", aktiviti terkini, dan panel Attendance. Pautan dalam "Needs attention" membuka senarai yang ditapis.
- [works] **Events.** Tab status, carian, tapis **Type** (Online/In person), menu tindakan (publish, batal, padam) dengan tetingkap pengesahan.
- [works] **Bookings.** Tab status, lajur pembayaran dan seat, **Cancel booking** dan **Delete record** dengan pengesahan, **Export CSV**.
- [works] **Venues.** Tambah, sunting, padam. Padam venue yang masih ada event: ditolak dengan mesej.
- [works] **People.** Tab peranan, carian, **Add account** (organiser), **Change role**, ahli, padam, **Export CSV**.
- [works] **Emails.** Log dengan jawapan perkhidmatan emel (Brevo 201 atau Resend 200); tapis mengikut jenis.
- [works] **Tema gelap.** Butang bulan/matahari di atas: seluruh dashboard bertukar, dan diingati.
- [works] **Pautan silang.** "Organiser tools" di sidebar admin, dan "Back to admin" di organiser.

## 13b. Tema cerah, gelap atau auto (laman customer)

- [works] **Suis tema.** Di header laman awam (Events, My passes, log masuk) ada suis **Auto / Light / Dark**. **Dark**: seluruh laman bertukar gelap. **Light**: cerah, walaupun sistem operasi kau gelap.
- [works] **Diingati.** Refresh halaman: pilihan kekal. **Auto** kembali mengikut tetapan sistem (tukar tetapan Windows/telefon dan laman ikut).
- [works] **Dashboard tak terjejas.** Log masuk sebagai organiser/admin: dashboard guna suis bulan/matahari sendiri.

## 14. Kemas kini langsung (tanpa refresh)

Buka dua tetingkap bersebelahan (contohnya organiser dan customer).

- [works] Organiser publish atau unpublish: customer nampak dalam lebih kurang 5 saat.
- [works] Customer tempah seat: peta organiser berubah dalam 5 saat.
- [works] Customer lain tak boleh memilih seat yang baru diambil; kalau sedang memilihnya, dapat mesej "was just taken".

## 15. App mobile (telefon sebenar)

Pastikan `EXPO_PUBLIC_API_URL` betul (atau telefon dan komputer pada rangkaian yang sama) dan buka melalui Expo Go.

- [works] Daftar dan log masuk; papan kekunci tidak menutup medan (kata laluan, pengesahan).
- [works] Senarai event: event yang baru dipublish muncul sendiri (tanpa tarik untuk refresh).
- [works] Kad dan butiran event online menunjukkan "Online meeting".
- [works] Peta seat 3D **tanpa butang zoom**; pilih seat dan tempah.
- [works] Bayar tiket berbayar (tahan seat dengan kiraan detik).
- [works] Tiket online: butang **Join on ...** (kelabu sebelum masa, aktif 15 minit sebelum).
- [works] Tier "Members only" tak boleh ditempah oleh bukan ahli.
- [works] Tiket tiada isyarat: QR masih dibuka (disimpan dalam telefon).

## 16. Ujian automatik (jalankan sekali untuk bukti)

| Apa | Arahan | Jangkaan |
| --- | --- | --- |
| Backend | `docker compose exec laravel.test php artisan test` (folder `backend`) | semua lulus (lebih 230) |
| Browser | `npx playwright test` (folder `frontend/web`, API dan web hidup) | semua lulus (lebih 44) |
| API (Postman) | lihat `docs/postman/README.md` | 198 permintaan, 309 semakan, 0 gagal |
| Web | `npx tsc -b`, `npm run lint`, `npm run build` (folder `frontend/web`) | tiada ralat |
| Mobile | `npx tsc --noEmit` (folder `frontend/customer-mobile`) | tiada ralat |
| Email | `docker compose exec laravel.test php artisan emails:test <emel penerima>` | `Resend answered 200` atau `Brevo answered 201` |

## Kalau sesuatu gagal

1. Halaman kosong atau "X is not defined": hentikan `npm run dev`, padam `frontend/web/node_modules/.vite` (`Remove-Item -Recurse -Force node_modules\.vite`), mulakan semula, dan tekan Ctrl+Shift+R.
2. Ralat pelayan pada API: `docker compose logs --tail 50 laravel.test` dan `storage/logs/laravel.log`.
3. Email tak sampai: jalankan `emails:test <emel>` (dalam folder `backend`). Kalau guna Resend, 403 bermakna ia masih mod ujian (hanya emel pemilik akaun); guna Brevo (`MAIL_API_DRIVER=brevo`) untuk emel sebenar. Ralat "no configuration file provided" bermakna kau bukan dalam folder `backend`.
4. Terlalu banyak permintaan (429): tunggu seminit.
