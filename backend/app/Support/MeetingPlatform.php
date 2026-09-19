<?php

namespace App\Support;

/** Works out which meeting service a link belongs to, so nobody has to say it twice. */
class MeetingPlatform
{
    /** @var array<string, list<string>> platform => host names it lives on (subdomains count too) */
    private const HOSTS = [
        'zoom' => ['zoom.us', 'zoom.com', 'zoomgov.com'],
        'meet' => ['meet.google.com'],
        'teams' => ['teams.microsoft.com', 'teams.live.com', 'teams.microsoft.us'],
        'webex' => ['webex.com'],
        'discord' => ['discord.gg', 'discord.com'],
        'whatsapp' => ['chat.whatsapp.com', 'call.whatsapp.com'],
        'telegram' => ['t.me', 'telegram.me'],
    ];

    public static function fromUrl(?string $url): ?string
    {
        if (blank($url)) {
            return null;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        foreach (self::HOSTS as $platform => $hosts) {
            foreach ($hosts as $known) {
                if ($host === $known || str_ends_with($host, '.'.$known)) {
                    return $platform;
                }
            }
        }

        return 'other';
    }
}
