import { useState } from 'react'
import {
  Button,
  ContentSwitcher,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  PasswordInput,
  Select,
  SelectItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from '@carbon/react'
import { Add, Download, UserMultiple } from '@carbon/icons-react'
import { api, downloadFile, errorText, type Paginated, type Role, type User } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useFetch } from '@/lib/useFetch'
import { useFeedback } from '@/dashboard/feedback'
import { EmptyState, PageHeader, TablePager } from '@/dashboard/parts'
import { Notice, Skeleton } from '@/dashboard/ui'

const ROLES: { value: Role; label: string; tag: 'blue' | 'purple' | 'gray' }[] = [
  { value: 'admin', label: 'Administrator', tag: 'purple' },
  { value: 'organiser', label: 'Organiser', tag: 'blue' },
  { value: 'customer', label: 'Customer', tag: 'gray' },
]
const TABS: { key: '' | Role; label: string }[] = [{ key: '', label: 'Everyone' }, { key: 'customer', label: 'Customers' }, { key: 'organiser', label: 'Organisers' }, { key: 'admin', label: 'Admins' }]

export default function PeoplePage() {
  const { user: me } = useAuth()
  const { toast, confirm } = useFeedback()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [role, setRole] = useState<'' | Role>('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'organiser' as Role })
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [changing, setChanging] = useState<{ user: User; role: Role } | null>(null)

  const qs = new URLSearchParams({ page: String(page), per_page: String(size) })
  if (role) qs.set('role', role)
  const { data: rows, error, reload } = useFetch<Paginated<User>>(`/users?${qs}`)

  async function create() {
    setBusy(true)
    setFormError(null)
    try {
      await api('/users', { method: 'POST', body: form })
      toast({ kind: 'success', title: 'Account created', subtitle: `${form.name} can sign in as ${form.role}.` })
      setForm({ name: '', email: '', password: '', role: 'organiser' })
      setAdding(false)
      reload()
    } catch (err) {
      setFormError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function saveRole() {
    if (!changing) return
    try {
      await api(`/users/${changing.user.id}`, { method: 'PUT', body: { role: changing.role } })
      toast({ kind: 'success', title: 'Role changed', subtitle: `${changing.user.name} is now ${changing.role === 'admin' ? 'an' : 'a'} ${changing.role}.` })
      setChanging(null)
      reload()
    } catch (err) {
      toast({ kind: 'error', title: 'Could not change the role', subtitle: errorText(err) })
    }
  }

  async function remove(u: User) {
    const ok = await confirm({ title: `Delete ${u.name}?`, body: 'Their events and bookings are deleted too. This cannot be undone.', confirmLabel: 'Delete account', danger: true })
    if (!ok) return
    try {
      await api(`/users/${u.id}`, { method: 'DELETE' })
      toast({ kind: 'success', title: `${u.name} deleted` })
      reload()
    } catch (err) {
      toast({ kind: 'error', title: 'Could not delete the account', subtitle: errorText(err) })
    }
  }

  return (
    <>
      <PageHeader
        title="People"
        description="Everyone with an account. Customers sign themselves up; organiser and admin accounts are created here."
        actions={
          <>
            <Button kind="tertiary" renderIcon={Download} onClick={() => downloadFile('/admin/export/users', 'sentrypass-users.csv').catch((e) => toast({ kind: 'error', title: 'Export failed', subtitle: errorText(e) }))}>
              Export CSV
            </Button>
            <Button renderIcon={Add} onClick={() => { setFormError(null); setAdding(true) }}>
              Add account
            </Button>
          </>
        }
      />

      <div className="chips">
        <ContentSwitcher size="md" selectedIndex={TABS.findIndex((t) => t.key === role)} onChange={({ index }: { index?: number }) => { setPage(1); setRole(TABS[index ?? 0].key) }}>
          {TABS.map((t) => (
            <Switch key={t.label} name={t.key || 'all'} text={t.label} />
          ))}
        </ContentSwitcher>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <TableContainer>
        {!rows ? (
          <Skeleton rows={6} />
        ) : rows.data.length === 0 ? (
          <EmptyState icon={<UserMultiple size={32} />} title="No accounts here">
            There is nobody with this role yet.
          </EmptyState>
        ) : (
          <Table aria-label="People">
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Joined</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.data.map((u) => {
                const r = ROLES.find((x) => x.value === u.role)!
                const self = u.id === me?.id
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <span className="cell-title">
                        {u.name} {self && <Tag size="sm" type="cool-gray">You</Tag>}
                      </span>
                      <span className="sub">{u.email}</span>
                    </TableCell>
                    <TableCell>
                      <Tag type={r.tag} size="md">{r.label}</Tag>
                    </TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                    <TableCell>
                      <div className="row-actions">
                        {!self && (
                          <OverflowMenu flipped aria-label={`Actions for ${u.name}`} size="sm">
                            <OverflowMenuItem itemText="Change role" onClick={() => setChanging({ user: u, role: u.role })} />
                            <OverflowMenuItem itemText="Delete account" isDelete hasDivider onClick={() => remove(u)} />
                          </OverflowMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {rows && rows.total > 0 && (
          <TablePager
            page={rows.current_page}
            pageSize={size}
            total={rows.total}
            onChange={(p, s) => {
              setPage(s !== size ? 1 : p)
              setSize(s)
            }}
          />
        )}
      </TableContainer>

      <Modal
        open={adding}
        size="sm"
        modalHeading="Add an account"
        primaryButtonText={busy ? 'Adding…' : 'Add account'}
        primaryButtonDisabled={busy || !form.name || !form.email || form.password.length < 8}
        secondaryButtonText="Cancel"
        onRequestSubmit={create}
        onRequestClose={() => setAdding(false)}
      >
        {formError && <Notice tone="error">{formError}</Notice>}
        <div className="stack">
          <TextInput id="p-name" labelText="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextInput id="p-email" labelText="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <PasswordInput id="p-pass" labelText="Temporary password" helperText="At least 8 characters. They can change it after signing in." autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select id="p-role" labelText="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value} text={r.label} />
            ))}
          </Select>
        </div>
      </Modal>

      <Modal
        open={!!changing}
        size="sm"
        modalHeading={`Change role for ${changing?.user.name ?? ''}`}
        primaryButtonText="Save role"
        secondaryButtonText="Cancel"
        onRequestSubmit={saveRole}
        onRequestClose={() => setChanging(null)}
      >
        <Select id="c-role" labelText="Role" value={changing?.role ?? 'customer'} onChange={(e) => setChanging((c) => (c ? { ...c, role: e.target.value as Role } : c))}>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value} text={r.label} />
          ))}
        </Select>
      </Modal>
    </>
  )
}
