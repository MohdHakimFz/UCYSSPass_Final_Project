import { useState } from 'react'
import {
  Button,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  TextInput,
} from '@carbon/react'
import { Add, Location } from '@carbon/icons-react'
import { api, errorText, type Paginated, type Venue } from '@/lib/api'
import { useFetch } from '@/lib/useFetch'
import { useFeedback } from '@/dashboard/feedback'
import { EmptyState, PageHeader, TablePager } from '@/dashboard/parts'
import { Notice, Skeleton } from '@/dashboard/ui'

type Draft = { id?: number; name: string; address: string; capacity: string }
const BLANK: Draft = { name: '', address: '', capacity: '' }

export default function VenuesPage() {
  const { toast, confirm } = useFeedback()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const qs = new URLSearchParams({ page: String(page), per_page: String(size) })
  if (query) qs.set('search', query)
  const { data: rows, error, reload } = useFetch<Paginated<Venue>>(`/venues?${qs}`)

  async function save() {
    if (!draft) return
    setBusy(true)
    setFormError(null)
    const body = { name: draft.name, address: draft.address, capacity: Number(draft.capacity) }
    try {
      if (draft.id) await api(`/venues/${draft.id}`, { method: 'PUT', body })
      else await api('/venues', { method: 'POST', body })
      toast({ kind: 'success', title: draft.id ? 'Venue saved' : 'Venue added', subtitle: draft.name })
      setDraft(null)
      reload()
    } catch (err) {
      setFormError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(v: Venue) {
    const ok = await confirm({ title: `Delete ${v.name}?`, body: 'A venue that still has events cannot be deleted.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      await api(`/venues/${v.id}`, { method: 'DELETE' })
      toast({ kind: 'success', title: `${v.name} deleted` })
      reload()
    } catch (err) {
      toast({ kind: 'error', title: 'Could not delete the venue', subtitle: errorText(err) })
    }
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  return (
    <>
      <PageHeader
        title="Venues"
        description="The places events can be held. An event picks one of these, and its capacity is the ceiling for tickets."
        actions={
          <Button renderIcon={Add} onClick={() => { setFormError(null); setDraft({ ...BLANK }) }}>
            Add venue
          </Button>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <TableContainer>
        <TableToolbar aria-label="Venue list tools">
          <TableToolbarContent>
            <TableToolbarSearch
              persistent
              placeholder="Search venues by name"
              onChange={(e: React.ChangeEvent<HTMLInputElement> | '', value?: string) => {
                setPage(1)
                setQuery(value ?? (e ? e.target.value : ''))
              }}
            />
          </TableToolbarContent>
        </TableToolbar>

        {!rows ? (
          <Skeleton rows={5} />
        ) : rows.data.length === 0 ? (
          <EmptyState
            icon={<Location size={32} />}
            title={query ? `No venues match “${query}”` : 'No venues yet'}
            action={!query ? <Button renderIcon={Add} onClick={() => setDraft({ ...BLANK })}>Add the first venue</Button> : undefined}
          >
            {query ? 'Try a different name.' : 'Add a venue so organisers can schedule events.'}
          </EmptyState>
        ) : (
          <Table aria-label="Venues">
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
                    <span className="cell-title">{v.name}</span>
                    <span className="sub">{v.address}</span>
                  </TableCell>
                  <TableCell>{v.capacity.toLocaleString()} seats</TableCell>
                  <TableCell>
                    <div className="row-actions">
                      <OverflowMenu flipped aria-label={`Actions for ${v.name}`} size="sm">
                        <OverflowMenuItem itemText="Edit" onClick={() => { setFormError(null); setDraft({ id: v.id, name: v.name, address: v.address, capacity: String(v.capacity) }) }} />
                        <OverflowMenuItem itemText="Delete" isDelete hasDivider onClick={() => remove(v)} />
                      </OverflowMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
        open={!!draft}
        size="sm"
        modalHeading={draft?.id ? 'Edit venue' : 'Add venue'}
        primaryButtonText={busy ? 'Saving…' : 'Save venue'}
        primaryButtonDisabled={busy || !draft?.name || !draft?.address || !draft?.capacity}
        secondaryButtonText="Cancel"
        onRequestSubmit={save}
        onRequestClose={() => setDraft(null)}
      >
        {formError && <Notice tone="error">{formError}</Notice>}
        <div className="stack">
          <TextInput id="v-name" labelText="Name" value={draft?.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
          <TextInput id="v-address" labelText="Address" value={draft?.address ?? ''} onChange={(e) => set({ address: e.target.value })} />
          <TextInput id="v-cap" labelText="Capacity" type="number" min={1} value={draft?.capacity ?? ''} onChange={(e) => set({ capacity: e.target.value })} />
        </div>
      </Modal>
    </>
  )
}
