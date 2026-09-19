<?php

namespace Tests\Unit;

use App\Support\MeetingPlatform;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class MeetingPlatformTest extends TestCase
{
    /** @return array<string, array{0: ?string, 1: ?string}> */
    public static function links(): array
    {
        return [
            'zoom' => ['https://zoom.us/j/123456789?pwd=abc', 'zoom'],
            'zoom with a company subdomain' => ['https://uptm.zoom.us/j/1', 'zoom'],
            'google meet' => ['https://meet.google.com/abc-defg-hij', 'meet'],
            'teams' => ['https://teams.microsoft.com/l/meetup-join/xyz', 'teams'],
            'webex' => ['https://uptm.webex.com/meet/room', 'webex'],
            'discord' => ['https://discord.gg/abcdef', 'discord'],
            'anything else' => ['https://example.org/room', 'other'],
            'a look-alike host is not zoom' => ['https://notzoom.us.evil.com/j/1', 'other'],
            'no link' => [null, null],
            'blank link' => ['', null],
        ];
    }

    #[DataProvider('links')]
    public function test_the_platform_is_read_from_the_link(?string $url, ?string $platform): void
    {
        $this->assertSame($platform, MeetingPlatform::fromUrl($url));
    }
}
