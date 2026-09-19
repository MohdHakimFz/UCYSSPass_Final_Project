<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    // Which email service sends the mail: "resend" (default) or "brevo". The rest of the app does not care which.
    'mail_api' => [
        'driver' => env('MAIL_API_DRIVER', 'resend'),
    ],

    'brevo' => [
        'key' => env('BREVO_API_KEY'),
        // Must be a sender you have verified in Brevo; Brevo refuses any other address.
        'from_email' => env('BREVO_FROM_EMAIL'),
        'from_name' => env('BREVO_FROM_NAME', 'UCYSS'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
        'from' => env('RESEND_FROM_EMAIL', 'UCYSS <onboarding@resend.dev>'),
    ],

    'checkin' => [
        'api_key' => env('CHECKIN_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
