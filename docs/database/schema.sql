
\restrict aMyMmNrabyQ1tCjUsIq76STphaauMOAPkuVHyZKjdeyaLzdLPkReiERROvdt4Mo

-- Name: bookings; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.bookings (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    ticket_type_id bigint NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    qr_token text,
    booked_at timestamp(0) without time zone NOT NULL,
    checked_in_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying, 'waitlisted'::character varying, 'attended'::character varying])::text[])))
);

-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -

CREATE SEQUENCE public.bookings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;

-- Name: events; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.events (
    id bigint NOT NULL,
    venue_id bigint NOT NULL,
    organiser_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category character varying(255) NOT NULL,
    start_at timestamp(0) without time zone NOT NULL,
    end_at timestamp(0) without time zone NOT NULL,
    status character varying(255) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT events_category_check CHECK (((category)::text = ANY ((ARRAY['ctf'::character varying, 'bootcamp'::character varying, 'conference'::character varying, 'workshop'::character varying])::text[]))),
    CONSTRAINT events_end_after_start_check CHECK ((end_at > start_at)),
    CONSTRAINT events_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[])))
);

-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -

CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;

-- Name: notifications; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    booking_id bigint NOT NULL,
    type character varying(255) NOT NULL,
    channel character varying(255) DEFAULT 'email'::character varying NOT NULL,
    sent_at timestamp(0) without time zone,
    provider_response jsonb,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT notifications_channel_check CHECK (((channel)::text = 'email'::text)),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['confirmation'::character varying, 'waitlist_promoted'::character varying, 'cancelled'::character varying])::text[])))
);

-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;

-- Name: ticket_types; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.ticket_types (
    id bigint NOT NULL,
    event_id bigint NOT NULL,
    name character varying(100) NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    capacity integer NOT NULL,
    seats_remaining integer NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT ticket_types_capacity_check CHECK ((capacity >= 0)),
    CONSTRAINT ticket_types_seats_remaining_check CHECK (((seats_remaining >= 0) AND (seats_remaining <= capacity)))
);

-- Name: ticket_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -

CREATE SEQUENCE public.ticket_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Name: ticket_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -

ALTER SEQUENCE public.ticket_types_id_seq OWNED BY public.ticket_types.id;

-- Name: users; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    role character varying(255) DEFAULT 'customer'::character varying NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'organiser'::character varying, 'customer'::character varying])::text[])))
);

-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

-- Name: venues; Type: TABLE; Schema: public; Owner: -

CREATE TABLE public.venues (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    address text NOT NULL,
    capacity integer NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT venues_capacity_check CHECK ((capacity > 0))
);

-- Name: venues_id_seq; Type: SEQUENCE; Schema: public; Owner: -

CREATE SEQUENCE public.venues_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Name: venues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -

ALTER SEQUENCE public.venues_id_seq OWNED BY public.venues.id;

-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);

-- Name: events id; Type: DEFAULT; Schema: public; Owner: -

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);

-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);

-- Name: ticket_types id; Type: DEFAULT; Schema: public; Owner: -

ALTER TABLE ONLY public.ticket_types ALTER COLUMN id SET DEFAULT nextval('public.ticket_types_id_seq'::regclass);

-- Name: users id; Type: DEFAULT; Schema: public; Owner: -

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

-- Name: venues id; Type: DEFAULT; Schema: public; Owner: -

ALTER TABLE ONLY public.venues ALTER COLUMN id SET DEFAULT nextval('public.venues_id_seq'::regclass);

-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);

-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

-- Name: ticket_types ticket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_pkey PRIMARY KEY (id);

-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);

-- Name: bookings bookings_customer_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_foreign FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Name: bookings bookings_ticket_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_ticket_type_id_foreign FOREIGN KEY (ticket_type_id) REFERENCES public.ticket_types(id) ON DELETE CASCADE;

-- Name: events events_organiser_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_organiser_id_foreign FOREIGN KEY (organiser_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Name: events events_venue_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_venue_id_foreign FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE RESTRICT;

-- Name: notifications notifications_booking_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_booking_id_foreign FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Name: ticket_types ticket_types_event_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_event_id_foreign FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

\unrestrict aMyMmNrabyQ1tCjUsIq76STphaauMOAPkuVHyZKjdeyaLzdLPkReiERROvdt4Mo

