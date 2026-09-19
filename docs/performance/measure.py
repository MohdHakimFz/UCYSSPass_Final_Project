"""Times the endpoints that matter, several runs each, and prints a markdown table (median and 95th percentile, in ms).

Run from the project root with the API up and the bulk data loaded:
    python docs/performance/measure.py "Before the indexes"
"""
import json
import statistics
import sys
import time
import urllib.request

BASE = "http://localhost/api"
RUNS = 15


def call(path, token=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    started = time.perf_counter()
    with urllib.request.urlopen(urllib.request.Request(BASE + path, headers=headers)) as response:
        response.read()
    return (time.perf_counter() - started) * 1000


def login(email):
    request = urllib.request.Request(
        BASE + "/auth/login",
        data=json.dumps({"email": email, "password": "password"}).encode(),
        headers={"Accept": "application/json", "Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(request))


admin = login("admin@sentrypass.test")["token"]
customer = login("customer@sentrypass.test")["token"]
who = login("carmen.paucek@example.com")
organiser = who["token"]
# One of this organiser's own bulk events, so the statistics call is allowed
mine = json.load(urllib.request.urlopen(urllib.request.Request(BASE + f"/events?per_page=1&search=PERF&organiser_id={who['user']['id']}", headers={"Accept": "application/json"})))
event_id = mine["data"][0]["id"]

cases = [
    ("Public event list (home page)", "/events?status=published&per_page=8", None),
    ("Event search with price filter", "/events?status=published&search=Bootcamp&max_price=30&per_page=8", None),
    ("Customer: my bookings (300 rows)", "/bookings?per_page=50", customer),
    ("Admin: booking list", "/bookings?per_page=10", admin),
    ("Admin: waitlisted bookings", "/bookings?status=waitlisted&per_page=10", admin),
    ("Admin: overview numbers", "/admin/stats", admin),
    ("Organiser: summary", "/organiser/summary", organiser),
    ("Organiser: one event's numbers", f"/events/{event_id}/stats", organiser),
    ("Admin: email log", "/admin/notifications?per_page=12", admin),
]

label = sys.argv[1] if len(sys.argv) > 1 else "Run"
print(f"### {label}\n")
print("| Endpoint | Median (ms) | 95th percentile (ms) |")
print("| --- | ---: | ---: |")
for name, path, token in cases:
    call(path, token)  # warm-up, not counted
    times = sorted(call(path, token) for _ in range(RUNS))
    p95 = times[min(len(times) - 1, int(len(times) * 0.95))]
    print(f"| {name} | {statistics.median(times):.0f} | {p95:.0f} |")
