import { useState } from "react";
import { Button, Search, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TextInput } from "@carbon/react";
import { api, errorText, type Paginated, type Venue } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager, Skeleton } from "@/dashboard/ui";

type Draft = { id?: number; name: string; address: string; capacity: string };
const BLANK: Draft = { name: "", address: "", capacity: "" };

export default function VenuesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const qs = new URLSearchParams({ page: String(page), per_page: "10" });
  if (query) qs.set("search", query);
  const { data: rows, error: loadError, reload: load } = useFetch<Paginated<Venue>>(`/venues?${qs}`);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setNote(null);
    const body = { name: draft.name, address: draft.address, capacity: Number(draft.capacity) };
    try {
      if (draft.id) await api(`/venues/${draft.id}`, { method: "PUT", body });
      else await api("/venues", { method: "POST", body });
      setNote({ tone: "ok", text: draft.id ? "Venue saved." : "Venue added." });
      setDraft(null);
      await load();
    } catch (err) {
      setNote({ tone: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(v: Venue) {
    if (!window.confirm(`Delete ${v.name}? This can't be undone.`)) return;
    setNote(null);
    try {
      await api(`/venues/${v.id}`, { method: "DELETE" });
      setNote({ tone: "ok", text: `${v.name} deleted.` });
      await load();
    } catch (err) {
      setNote({ tone: "error", text: errorText(err) });
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Venues</h1>
        <Button onClick={() => setDraft({ ...BLANK })}>
          Add venue
        </Button>
      </div>

      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {loadError && <Notice tone="error">{loadError}</Notice>}

      {draft && (
        <form className="pane" onSubmit={save}>
          <h2>{draft.id ? "Edit venue" : "Add venue"}</h2>
          <div className="form-grid">
            <TextInput id="f-1" labelText="Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <TextInput id="f-2" labelText="Address" required value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            <TextInput id="f-3" labelText="Capacity"
                required
                type="number"
                min={1}
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
              />
          </div>
          <div className="form-actions">
            <Button disabled={busy}>
              {busy ? "Saving…" : "Save venue"}
            </Button>
            <Button type="button" kind="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <Search size="lg"
          placeholder="Search venues by name"
          labelText="Search venues by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button kind="tertiary" size="md">Search</Button>
      </form>

      {!rows ? (
        <Skeleton rows={5} />
      ) : rows.data.length === 0 ? (
        <p className="empty">{query ? `No venues match “${query}”.` : "No venues yet. Add the first one to start scheduling events."}</p>
      ) : (
        <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Venue</TableHeader>
                <TableHeader>Capacity</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.data.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <strong>{v.name}</strong>
                    <span className="sub">{v.address}</span>
                  </TableCell>
                  <TableCell>{v.capacity}</TableCell>
                  <TableCell>
                    <Button
                      kind="ghost" size="sm"
                      onClick={() => setDraft({ id: v.id, name: v.name, address: v.address, capacity: String(v.capacity) })}
                    >
                      Edit
                    </Button>{" "}
                    <Button kind="danger--ghost" size="sm" onClick={() => remove(v)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      )}
      {rows && <Pager page={rows.current_page} last={rows.last_page} total={rows.total} onPage={setPage} />}
    </>
  );
}
