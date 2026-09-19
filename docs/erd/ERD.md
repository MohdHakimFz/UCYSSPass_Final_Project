# Entity relationship diagram (Mermaid)

The same nine domain tables as [`ERD.png`](ERD.png) / [`ERD.svg`](ERD.svg), written as Mermaid so it renders on GitHub, in VS Code (Markdown preview) and at https://mermaid.live (paste the code from [`ERD.mmd`](ERD.mmd)).

Laravel's own tables (personal_access_tokens, sessions, cache, jobs) are left out.

```mermaid
erDiagram
    venues ||--o{ events : "held at"
    users ||--o{ events : "organises"
    events ||--o{ ticket_types : "has tiers"
    ticket_types ||--o{ seats : "has seats"
    users ||--o{ bookings : "books"
    ticket_types ||--o{ bookings : "is booked as"
    seats |o--o| bookings : "held by"
    bookings ||--o{ payments : "paid"
    bookings ||--o{ notifications : "emails"
    events ||--o{ announcements : "is told"
    users ||--o{ announcements : "sends"
    announcements ||--o{ notifications : "carried by"

    venues {
        bigint id PK
        varchar name
        text address
        int capacity "> 0"
    }

    users {
        bigint id PK
        varchar name
        varchar email UK
        varchar password "hash"
        varchar role "admin | organiser | customer"
        boolean is_member "set by admin"
        timestamp email_verified_at
        timestamp created_at
    }

    events {
        bigint id PK
        bigint venue_id FK "restrict, null for online"
        bigint organiser_id FK
        varchar title
        text description
        varchar category "ctf | bootcamp | ..."
        varchar mode "physical | online"
        varchar meeting_url "private"
        varchar meeting_platform
        boolean seated
        timestamp start_at
        timestamp end_at "> start_at"
        varchar status "draft | published | ..."
    }

    ticket_types {
        bigint id PK
        bigint event_id FK
        varchar name
        numeric price
        int capacity ">= 0"
        int seats_remaining "0..capacity"
        smallint seats_per_row
        boolean members_only
    }

    seats {
        bigint id PK
        bigint ticket_type_id FK
        varchar row_label UK
        int number UK
    }

    bookings {
        bigint id PK
        bigint customer_id FK
        bigint ticket_type_id FK
        bigint seat_id FK, UK "set null"
        varchar status "pending | confirmed | ..."
        text qr_token "HMAC"
        timestamp booked_at
        timestamp checked_in_at
        timestamp hold_expires_at
    }

    payments {
        bigint id PK
        bigint booking_id FK
        numeric amount
        varchar method "card | fpx | ewallet"
        varchar status "paid | failed | refunded"
        varchar reference
        timestamp paid_at
        numeric refunded_amount
    }

    announcements {
        bigint id PK
        bigint event_id FK
        bigint sender_id FK
        varchar subject
        text message
        int recipients
    }

    notifications {
        bigint id PK
        bigint booking_id FK
        bigint announcement_id FK
        varchar type "confirmation | reminder | ..."
        varchar channel "email"
        timestamp sent_at
        jsonb provider_response
    }
```

## Reading the diagram

- `||--o{` is one-to-many: one row on the left relates to zero or more rows on the right. `|o--o|` is zero-or-one to zero-or-one.
- `PK` primary key, `FK` foreign key, `UK` unique.
- Every foreign key is cascade-deleted except `events.venue_id` (restrict) and `bookings.seat_id` (set null).
- A seat can belong to at most one booking (`bookings.seat_id` is unique), and a booking has at most one seat (online and unnumbered events have none).
