<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Event;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function users(Request $request): StreamedResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        return $this->csv('sentrypass-users.csv', ['ID', 'Name', 'Email', 'Role', 'Joined'], function () {
            foreach (User::query()->orderBy('id')->cursor() as $u) {
                yield [$u->id, $u->name, $u->email, $u->role, $u->created_at];
            }
        });
    }

    public function bookings(Request $request): StreamedResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        return $this->csv(
            'sentrypass-bookings.csv',
            ['ID', 'Attendee', 'Email', 'Event', 'Tier', 'Seat', 'Status', 'Booked at', 'Checked in at'],
            fn () => $this->bookingRows(Booking::query()),
        );
    }

    /**
     * Door list for one event. Owning organiser or admin.
     */
    public function attendees(Event $event): StreamedResponse
    {
        $this->authorize('update', $event);

        return $this->csv(
            'attendees-event-'.$event->id.'.csv',
            ['ID', 'Attendee', 'Email', 'Event', 'Tier', 'Seat', 'Status', 'Booked at', 'Checked in at'],
            fn () => $this->bookingRows(Booking::query()->whereHas('ticketType', fn ($q) => $q->where('event_id', $event->id))),
        );
    }

    private function bookingRows($query): \Generator
    {
        foreach ($query->with(['customer:id,name,email', 'ticketType:id,event_id,name', 'ticketType.event:id,title', 'seat:id,row_label,number'])->orderBy('id')->cursor() as $b) {
            yield [
                $b->id,
                $b->customer?->name,
                $b->customer?->email,
                $b->ticketType?->event?->title,
                $b->ticketType?->name,
                $b->seat?->label,
                $b->status,
                $b->booked_at,
                $b->checked_in_at,
            ];
        }
    }

    private function csv(string $filename, array $header, callable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $header);
            foreach ($rows() as $row) {
                fputcsv($out, array_map(fn ($cell) => $this->safe($cell), $row));
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Stop spreadsheet formula injection: a name like "=HYPERLINK(...)" must open as text.
     */
    private function safe(mixed $cell): string
    {
        $value = (string) ($cell ?? '');

        return $value !== '' && str_contains("=+-@\t\r", $value[0]) ? "'".$value : $value;
    }
}
