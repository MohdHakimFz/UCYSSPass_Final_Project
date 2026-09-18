"use client";

import { useState } from "react";
import { Button, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TextInput } from "@carbon/react";
import { api, downloadFile, errorText, type Paginated, type Role, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager, Skeleton } from "@/components/ui";

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
        <div className="form-actions">
          <Button
            kind="tertiary" size="md"
            onClick={() => downloadFile("/admin/export/users", "sentrypass-users.csv").catch((e) => setNote({ tone: "error", text: errorText(e) }))}
          >
            Export CSV
          </Button>
          <Button onClick={() => setAdding(true)}>
            Add account
          </Button>
        </div>
      </div>

      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {loadError && <Notice tone="error">{loadError}</Notice>}

      {adding && (
        <form className="pane" onSubmit={create}>
          <h2>Add an organiser or admin account</h2>
          <div className="form-grid">
            <TextInput id="f-1" labelText="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextInput id="f-2" labelText="Email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextInput id="f-3" labelText="Temporary password"
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            <Select id="s-4" labelText="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
          </div>
          <div className="form-actions">
            <Button disabled={busy}>
              {busy ? "Adding…" : "Add account"}
            </Button>
            <Button type="button" kind="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <Select id="s-5" labelText="Show"
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
          </Select>
      </div>

      {!rows ? (
        <Skeleton rows={5} />
      ) : rows.data.length === 0 ? (
        <p className="empty">No accounts with that role yet.</p>
      ) : (
        <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Joined</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <strong>{u.name}</strong>
                    <span className="sub">{u.email}</span>
                  </TableCell>
                  <TableCell>
                    <Select id="s-6" size="sm"
                      hideLabel labelText={`Role for ${u.name}`}
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                  <TableCell>
                    {u.id !== me?.id && (
                      <Button kind="danger--ghost" size="sm" onClick={() => remove(u)}>
                        Delete
                      </Button>
                    )}
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
