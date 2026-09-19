<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Event;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\Seat;
use App\Models\TicketType;
use App\Models\User;
use App\Models\Venue;
use App\Services\QrTicketService;
use App\Services\SeatingService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * A believable UCYSS programme, instead of random names and dates: online talks, a seated CTF, a paid bootcamp,
 * a free career talk, a draft, a cancelled event and a finished one. Dates are counted from today, so the
 * events are always coming up. Every account has the password "password".
 */
class UcyssDemoSeeder extends Seeder
{
    /** Fictional students. */
    private const STUDENTS = [
        'Adam Iskandar', 'Balqis Hana', 'Chen Wei Lun', 'Danish Irfan', 'Elena Sofia', 'Farhan Zikri', 'Gan Mei Ling', 'Hafiz Rahman',
        'Irdina Sofea', 'Jason Lim', 'Kavitha Nair', 'Luqman Hakim', 'Maya Sari', 'Nabil Aziz', 'Olivia Tan', 'Prem Kumar',
        'Qistina Azmi', 'Raymond Wong', 'Siti Nurhaliza Aziz', 'Tharshini Devi', 'Umar Faris', 'Vanessa Ong', 'Wan Aqilah', 'Xavier Lee',
        'Yasmin Zainal', 'Zul Arif', 'Aiman Syafiq', 'Bella Rosli', 'Darwisy Ilham', 'Emir Danial', 'Farah Nadia', 'Ghazali Omar',
        'Hidayah Salleh', 'Imran Shah', 'Jamilah Yusof', 'Khairul Anwar', 'Liyana Mustafa', 'Mikail Zaid', 'Natasha Roslan', 'Omar Khalid',
    ];

    private QrTicketService $qr;

    private SeatingService $seating;

    /** @var list<User> */
    private array $students = [];

    private int $payments = 0;

    /** Hashing is slow on purpose, so hash the shared demo password once. */
    private string $password;

    public function run(): void
    {
        $this->password = Hash::make('password');
        $this->qr = app(QrTicketService::class);
        $this->seating = app(SeatingService::class);

        $organisers = [
            User::create(['name' => 'Nurul Aisyah', 'email' => 'aisyah@ucyss.test', 'role' => 'organiser', 'password' => $this->password, 'email_verified_at' => now()]),
            User::create(['name' => 'Farid Rahman', 'email' => 'farid@ucyss.test', 'role' => 'organiser', 'password' => $this->password, 'email_verified_at' => now()]),
        ];
        [$aisyah, $farid] = $organisers;

        foreach (self::STUDENTS as $name) {
            $email = strtolower(str_replace([' '], '.', $name)).'@ucyss.test';
            $this->students[] = User::create(['name' => $name, 'email' => $email, 'role' => 'customer', 'password' => $this->password, 'email_verified_at' => now()]);
        }

        $venue = fn (string $name, string $address, int $capacity) => Venue::firstOrCreate(['name' => $name], ['address' => $address, 'capacity' => $capacity]);
        $lab = $venue('Makmal Komputer 3', 'Blok C, Tingkat 2, UPTM Kuala Lumpur', 60);
        $range = $venue('Cyber Range Lab', 'Blok D, Tingkat 3, UPTM Kuala Lumpur', 30);
        $hall = $venue('Dewan Utama UPTM', 'UPTM Kampus Utama, Kuala Lumpur', 400);
        $seminar = $venue('Bilik Seminar 2', 'Blok A, Tingkat 1, UPTM Kuala Lumpur', 40);
        $online = Venue::online();

        // 1. An online workshop, free, coming up this week
        $webHacking = $this->event($aisyah, $online, 'Intro to Web Hacking (Online)', 'workshop', 'Two hours on the OWASP Top 10 with live demos. Bring a laptop and follow along. Held on Google Meet.', 6, 20, 2, 'published',
            ['mode' => 'online', 'meeting_url' => 'https://meet.google.com/abc-defg-hij', 'meeting_platform' => 'meet']);
        $free = $this->tier($webHacking, 'Free', 0, 100);
        $this->fill($free, count: 11);

        // 2. The flagship: a seated CTF with a paid VIP tier
        $ctf = $this->event($aisyah, $lab, 'UCYSS Capture the Flag 2026', 'ctf', 'A day of challenges in web, crypto, forensics and reverse engineering. Choose your own seat in the lab. Snacks included.', 14, 9, 8, 'published', ['seated' => true]);
        $standard = $this->tier($ctf, 'Standard', 10, 24, 8);
        $vip = $this->tier($ctf, 'VIP', 25, 8, 4);
        $this->seating->enable($ctf);
        $this->fill($standard, count: 9, seated: true);
        $this->fill($vip, count: 3, seated: true, offset: 9);

        // 3. A paid bootcamp with a full tier and a waitlist
        $bootcamp = $this->event($farid, $range, 'Malware Analysis Bootcamp', 'bootcamp', 'Static and dynamic analysis in a safe lab, from unpacking to writing detection rules.', 21, 9, 9, 'published');
        $early = $this->tier($bootcamp, 'Early Bird', 30, 20);
        $regular = $this->tier($bootcamp, 'Standard', 50, 20);
        $this->fill($early, count: 20);
        $this->fill($early, count: 3, status: 'waitlisted', offset: 20);
        $this->fill($regular, count: 5, offset: 4);

        // 4. A free career talk in the main hall
        $talk = $this->event($farid, $hall, 'Cybersecurity Career Talk', 'conference', 'Speakers from the industry on how to start a career in security, and what employers look for.', 30, 14, 3, 'published');
        $this->fill($this->tier($talk, 'Free', 0, 200), count: 32);

        // 5. A second online session, sooner
        $phishing = $this->event($farid, $online, 'Phishing Awareness Session', 'workshop', 'Spot the phish: real examples, and what to do when you have clicked. Held on Zoom.', 3, 20, 1.5, 'published',
            ['mode' => 'online', 'meeting_url' => 'https://uptm.zoom.us/j/123456789', 'meeting_platform' => 'zoom']);
        $this->fill($this->tier($phishing, 'Free', 0, 80), count: 14);

        // 6. A draft nobody can see yet
        $osint = $this->event($farid, $seminar, 'OSINT Workshop', 'workshop', 'Still being planned.', 35, 10, 3, 'draft');
        $this->tier($osint, 'Free', 0, 40);

        // 7. A cancelled event
        $kali = $this->event($aisyah, $lab, 'Kali Linux Install Fest', 'workshop', 'Cancelled because the lab was closed for maintenance.', 8, 14, 3, 'cancelled');
        $this->fill($this->tier($kali, 'Free', 0, 30), count: 4, status: 'cancelled');

        // 8. A finished online event with real attendance
        $cloud = $this->event($aisyah, $online, 'Cloud Security Fundamentals', 'workshop', 'An introduction to shared responsibility, IAM and logging. Held on Microsoft Teams.', -10, 20, 2, 'completed',
            ['mode' => 'online', 'meeting_url' => 'https://teams.microsoft.com/l/meetup-join/demo', 'meeting_platform' => 'teams']);
        $this->fill($this->tier($cloud, 'Free', 0, 80), count: 18, status: 'attended');

        $this->settleSeats();
    }

    /** @param  array<string, mixed>  $extra */
    private function event(User $organiser, Venue $venue, string $title, string $category, string $description, int|float $daysAhead, int $hour, int|float $hours, string $status, array $extra = []): Event
    {
        $start = now()->addDays((int) $daysAhead)->setTime($hour, 0);

        return Event::create($extra + [
            'organiser_id' => $organiser->id, 'venue_id' => $venue->id, 'title' => $title, 'description' => $description, 'category' => $category,
            'start_at' => $start, 'end_at' => $start->copy()->addMinutes((int) ($hours * 60)), 'status' => $status,
        ]);
    }

    private function tier(Event $event, string $name, float $price, int $capacity, int $perRow = 10): TicketType
    {
        return TicketType::create(['event_id' => $event->id, 'name' => $name, 'price' => $price, 'capacity' => $capacity, 'seats_remaining' => $capacity, 'seats_per_row' => $perRow]);
    }

    /**
     * Book $count different students onto a tier, starting from the $offset-th student.
     * Confirmed and attended bookings get a signed ticket and, when the tier costs money, a paid payment.
     */
    private function fill(TicketType $tier, int $count, string $status = 'confirmed', int $offset = 0, bool $seated = false): void
    {
        $seats = $seated ? Seat::where('ticket_type_id', $tier->id)->orderBy('id')->pluck('id')->all() : [];

        for ($i = 0; $i < $count; $i++) {
            $student = $this->students[($offset + $i) % count($this->students)];
            $booking = Booking::create([
                'customer_id' => $student->id, 'ticket_type_id' => $tier->id, 'seat_id' => $seats[$i] ?? null, 'status' => $status,
                'booked_at' => now()->subDays(random_int(1, 9))->subMinutes(random_int(0, 600)),
                'checked_in_at' => $status === 'attended' ? $tier->event->start_at->copy()->subMinutes(random_int(1, 10)) : null,
            ]);

            if (in_array($status, ['confirmed', 'attended'], true)) {
                $booking->update(['qr_token' => $this->qr->generate($booking)]);
                $this->email($booking, 'confirmation');
                if ((float) $tier->price > 0) {
                    $this->pay($booking, (float) $tier->price);
                }
            } elseif ($status === 'cancelled') {
                $this->email($booking, 'cancelled');
            }
        }
    }

    private function pay(Booking $booking, float $amount): void
    {
        $this->payments++;
        Payment::create([
            'booking_id' => $booking->id, 'amount' => $amount, 'method' => ['card', 'fpx', 'ewallet'][$this->payments % 3],
            'status' => 'paid', 'reference' => 'PAY-DEMO-'.str_pad((string) $this->payments, 5, '0', STR_PAD_LEFT), 'paid_at' => $booking->booked_at,
        ]);
    }

    /** The email log for demo data says honestly that no email was sent. */
    private function email(Booking $booking, string $type): void
    {
        Notification::create([
            'booking_id' => $booking->id, 'type' => $type, 'sent_at' => $booking->booked_at,
            'provider_response' => ['status' => 'skipped', 'reason' => 'Demo data: no email was sent'],
        ]);
    }

    /** Bring every tier's remaining seats in line with the bookings made. */
    private function settleSeats(): void
    {
        foreach (TicketType::with('event')->get() as $tier) {
            if ($tier->event->seated) {
                $this->seating->sync($tier);

                continue;
            }
            $held = $tier->bookings()->whereIn('status', ['pending', 'confirmed', 'attended'])->count();
            $tier->forceFill(['seats_remaining' => $tier->capacity - $held])->save();
        }
    }
}
