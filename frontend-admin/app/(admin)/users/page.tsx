"use client";

import { useState } from "react";
import { api, errorText, type Paginated, type Role, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager } from "@/components/ui";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrator" },
  { value: "organiser", label: "Organiser" },
  { value: "customer", label: "Customer" },
];

export default function PeoplePage() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<"" | Role>("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "organiser" as Role });
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const qs = new URLSearchParams({ page: String(page), per_page: "10" });
  if (role) qs.set("role", role);
  const { data: rows, error: loadError, reload: load } = useFetch<Paginated<User>>(`/users?${qs}`);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      await api("/users", { method: "POST", body: form });
      setNote({ tone: "ok", text: `${form.name} can now sign in as ${form.role}.` });
      setForm({ name: "", email: "", password: "", role: "organiser" });
      setAdding(false);
      await load();
    } catch (err) {
      setNote({ tone: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(u: User, next: Role) {
    setNote(null);
    try {
      await api(`/users/${u.id}`, { method: "PUT", body: { role: next } });
      setNote({ tone: "ok", text: `${u.name} is now ${next === "admin" ? "an" : "a"} ${next}.` });
      await load();
    } catch (err) {
      setNote({ tone: "error", text: errorText(err) });
    }
  }

  async function remove(u: User) {
    if (!window.confirm(`Delete ${u.name}? Their events and bookings are deleted too.`)) return;
    setNote(null);
    try {
      await api(`/users/${u.id}`, { method: "DELETE" });
      setNote({ tone: "ok", text: `${u.name} deleted.` });
      await load();
    } catch (err) {
      setNote({ tone: "error", text: errorText(err) });
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>People</h1>
        <button className="btn" onClick={() => setAdding(true)}>
          Add account
        </button>
      </div>

      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {loadError && <Notice tone="error">{loadError}</Notice>}

      {adding && (
        <form className="panel" onSubmit={create}>
          <h2>Add an organiser or admin account</h2>
          <div className="form-grid">
            <label className="field">
              Full name
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              Email
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="field">
              Temporary password
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="field">
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="btn" disabled={busy}>
              {busy ? "Adding…" : "Add account"}
            </button>
            <button type="button" className="btn-quiet" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          Show
          <select
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value as "" | Role);
            }}
          >
            <option value="">Everyone</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}s
              </option>
            ))}
          </select>
        </label>
      </div>

      {!rows ? (
        <p className="loading">Loading people…</p>
      ) : rows.data.length === 0 ? (
        <p className="empty">No accounts with that role yet.</p>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.data.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <span className="sub">{u.email}</span>
                  </td>
                  <td data-label="Role">
                    <select
                      className="select"
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Joined">{new Date(u.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="actions">
                    {u.id !== me?.id && (
                      <button className="btn-danger" onClick={() => remove(u)}>
                        Delete
                      </button>
                    )}
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
