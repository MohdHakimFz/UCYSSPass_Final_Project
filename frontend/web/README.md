# SentryPass web app

One React + Vite app for customers, organisers and admins.

```
src/
  customer/    public site and customer pages (Poster Wall design)
  organiser/   /organiser area: events, editor, check-in
  admin/       /admin area: overview, events, bookings, venues, people, emails
  dashboard/   shared Carbon layout, components and styles for organiser and admin
  lib/         api client, auth, role guard (roles.tsx), helpers
  shared/      ThemeSheet: mounts and removes each area's stylesheet
```

Sign-in lives at `/login` for everyone. `lib/roles.tsx` holds the role to landing-page map and the route guard.
