"use client";

import { useState } from "react";
import { api, errorText, type Paginated, type Venue } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager } from "@/components/ui";

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
        <button className="btn" onClick={() => setDraft({ ...BLANK })}>
          Add venue
        </button>
      </div>

      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {loadError && <Notice tone="error">{loadError}</Notice>}

      {draft && (
        <form className="panel" onSubmit={save}>
          <h2>{draft.id ? "Edit venue" : "Add venue"}</h2>
          <div className="form-grid">
            <label className="field">
              Name
              <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="field">
              Address
              <input required value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </label>
            <label className="field">
              Capacity
              <input
                required
                type="number"
                min={1}
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn" disabled={busy}>
              {busy ? "Saving…" : "Save venue"}
            </button>
            <button type="button" className="btn-quiet" onClick={() => setDraft(null)}>
              Cancel
            </button>
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
        <input
          className="search"
          type="search"
          placeholder="Search venues by name"
          aria-label="Search venues by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-quiet">Search</button>
      </form>

      {!rows ? (
        <p className="loading">Loading venues…</p>
      ) : rows.data.length === 0 ? (
        <p className="empty">{query ? `No venues match “${query}”.` : "No venues yet. Add the first one to start scheduling events."}</p>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Capacity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.data.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.name}</strong>
                    <span className="sub">{v.address}</span>
                  </td>
                  <td>{v.capacity}</td>
                  <td className="actions">
                    <button
                      className="btn-quiet"
                      onClick={() => setDraft({ id: v.id, name: v.name, address: v.address, capacity: String(v.capacity) })}
                    >
                      Edit
                    </button>{" "}
                    <button className="btn-danger" onClick={() => remove(v)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && <Pager page={rows.current_page} last={rows.last_page} total={rows.total} onPage={setPage} />}
    </>
  );
}
