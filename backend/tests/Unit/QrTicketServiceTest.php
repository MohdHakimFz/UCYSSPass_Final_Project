<?php

namespace Tests\Unit;

use App\Models\Booking;
use App\Services\QrTicketService;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class QrTicketServiceTest extends TestCase
{
    private function booking(int $id = 1, int $tier = 2, int $customer = 3): Booking
    {
        return (new Booking)->forceFill(['id' => $id, 'ticket_type_id' => $tier, 'customer_id' => $customer]);
    }

    public function test_the_same_booking_always_gets_the_same_signature(): void
    {
        $service = new QrTicketService;

        $this->assertSame($service->generate($this->booking()), $service->generate($this->booking()));
        $this->assertSame(64, strlen($service->generate($this->booking())));
    }

    #[DataProvider('changedBookings')]
    public function test_changing_any_part_of_the_booking_changes_the_signature(int $id, int $tier, int $customer): void
    {
        $service = new QrTicketService;

        $this->assertNotSame($service->generate($this->booking()), $service->generate($this->booking($id, $tier, $customer)));
    }

    public static function changedBookings(): array
    {
        return [
            'other booking id' => [9, 2, 3],
            'other ticket type' => [1, 9, 3],
            'other customer' => [1, 2, 9],
        ];
    }

    public function test_verify_accepts_the_real_token_and_rejects_everything_else(): void
    {
        $service = new QrTicketService;
        $booking = $this->booking();
        $token = $service->generate($booking);

        $this->assertTrue($service->verify($booking, $token));
        $this->assertFalse($service->verify($booking, strtoupper($token)));
        $this->assertFalse($service->verify($booking, substr($token, 0, -1).'0'));
        $this->assertFalse($service->verify($booking, ''));
        $this->assertFalse($service->verify($booking, null));
    }

    public function test_the_signature_depends_on_the_app_key(): void
    {
        $service = new QrTicketService;
        $before = $service->generate($this->booking());

        config(['app.key' => 'base64:'.base64_encode(str_repeat('z', 32))]);

        $this->assertNotSame($before, $service->generate($this->booking()));
    }
}
