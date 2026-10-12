import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api, CATEGORY_LABEL, type Category, type Paginated } from '../../lib/api'
import { describeError, fieldErrors, fromInput, ONLINE_VENUE, toInput, type OrgEvent, type Venue } from '../../lib/manage'
import KeyboardScreen from '../../components/KeyboardScreen'
import { Button, Notice, Skeleton } from '../../components/ui'
import { Choice, FieldError, FormField } from '../../components/manage'
import { fonts, type Palette } from '../../theme'
import { useStyles, useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

type Props = NativeStackScreenProps<RootParamList, 'EventForm'>
type Status = OrgEvent['status']

const CATEGORIES = (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))
const STATUSES: { value: Status; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
]

/** One form for both: no id creates an event (POST /events), an id edits it (PUT /events/{id}). */
export default function EventFormScreen({ route, navigation }: Props) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const id = route.params?.id
  const editing = id !== undefined

  const [form, setForm] = useState({
    title: '',
    category: 'ctf' as Category,
    mode: 'physical' as 'physical' | 'online',
    venue_id: null as number | null,
    meeting_url: '',
    start: '',
    end: '',
    status: 'draft' as Status,
    description: '',
  })
  const [venues, setVenues] = useState<Venue[] | null>(null)
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [note, setNote] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit event' : 'New event' })
  }, [navigation, editing])

  // The venue picker: every venue except the shared "Online" one, which online events get automatically.
  useEffect(() => {
    api<Paginated<Venue>>('/venues?per_page=100')
      .then((res) => setVenues(res.data.filter((v) => v.name !== ONLINE_VENUE)))
      .catch((err) => setNote(describeError(err)))
  }, [])

  // Editing: fill the form with the event as it is now.
  useEffect(() => {
    if (!editing) return
    api<OrgEvent>(`/events/${id}`)
      .then((ev) =>
        setForm({
          title: ev.title,
          category: ev.category,
          mode: ev.mode ?? 'physical',
          venue_id: ev.mode === 'online' ? null : ev.venue_id,
          meeting_url: ev.meeting_url ?? '',
          start: toInput(ev.start_at),
          end: toInput(ev.end_at),
          status: ev.status,
          description: ev.description ?? '',
        }),
      )
      .catch((err) => setNote(describeError(err)))
      .finally(() => setLoading(false))
  }, [editing, id])

  async function save() {
    setNote(null)
    // Check the date format here first, so a typo gets a clear message under the field without a round trip.
    const start_at = fromInput(form.start)
    const end_at = fromInput(form.end)
    const local: Record<string, string> = {}
    if (!start_at) local.start_at = 'Use the format YYYY-MM-DD HH:mm, for example 2026-11-20 09:00.'
    if (!end_at) local.end_at = 'Use the format YYYY-MM-DD HH:mm, for example 2026-11-20 17:00.'
    if (Object.keys(local).length) {
      setErrors(local)
      setNote('Please fix the fields marked in red.')
      return
    }

    const body = {
      title: form.title,
      category: form.category,
      mode: form.mode,
      start_at,
      end_at,
      status: form.status,
      description: form.description || null,
      ...(form.mode === 'physical' ? { venue_id: form.venue_id } : { meeting_url: form.meeting_url || null }),
    }

    setBusy(true)
    setErrors({})
    try {
      const saved = await api<OrgEvent>(editing ? `/events/${id}` : '/events', { method: editing ? 'PUT' : 'POST', body })
      // A new event goes straight to its page, where the ticket tiers are added.
      if (editing) navigation.goBack()
      else navigation.replace('OrgEvent', { id: saved.id })
    } catch (err) {
      // 422: each message goes under its own field. Anything else (403, network...) goes in the box at the top.
      setErrors(fieldErrors(err))
      setNote(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: colors.concrete }}>
        <Skeleton rows={5} height={56} />
      </View>
    )
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad}>
      {note && <Notice tone="error" text={note} />}

      <FormField label="Title" value={form.title} onChangeText={(v) => set('title', v)} autoCapitalize="sentences" placeholder="e.g. Aisyah Test CTF" error={errors.title} />

      <Choice label="Category" options={CATEGORIES} value={form.category} onChange={(v) => set('category', v)} error={errors.category} />

      <Choice
        label="Where"
        options={[
          { value: 'physical', label: 'Physical venue' },
          { value: 'online', label: 'Online' },
        ]}
        value={form.mode}
        onChange={(v) => set('mode', v)}
        error={errors.mode}
      />

      {form.mode === 'physical' ? (
        venues ? (
          venues.length ? (
            <Choice label="Venue" options={venues.map((v) => ({ value: v.id, label: v.name }))} value={form.venue_id} onChange={(v) => set('venue_id', v)} error={errors.venue_id} />
          ) : (
            <Notice tone="warn" text="There are no venues yet. Ask an admin to add one." />
          )
        ) : (
          <Skeleton rows={1} height={40} />
        )
      ) : (
        <FormField
          label="Meeting link"
          value={form.meeting_url}
          onChangeText={(v) => set('meeting_url', v)}
          keyboardType="url"
          placeholder="https://zoom.us/j/..."
          hint="Needed before an online event can be published. Guests only see it once the meeting opens."
          error={errors.meeting_url}
        />
      )}

      <FormField label="Starts" value={form.start} onChangeText={(v) => set('start', v)} placeholder="YYYY-MM-DD HH:mm" keyboardType="numbers-and-punctuation" error={errors.start_at} />
      <FormField label="Ends" value={form.end} onChangeText={(v) => set('end', v)} placeholder="YYYY-MM-DD HH:mm" keyboardType="numbers-and-punctuation" error={errors.end_at} />

      <Choice label="Status" options={STATUSES} value={form.status} onChange={(v) => set('status', v)} error={errors.status} />

      <FormField
        label="Description"
        value={form.description}
        onChangeText={(v) => set('description', v)}
        multiline
        autoCapitalize="sentences"
        style={s.multi}
        error={errors.description}
      />
      <FieldError text={errors.seated} />

      <Text style={s.hint}>Times are in this phone&apos;s time zone.</Text>
      <Button title={editing ? 'Save changes' : 'Create event'} busy={busy} onPress={save} />
    </KeyboardScreen>
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pad: { padding: 16, gap: 14 },
    hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
    multi: {
      minHeight: 110,
      textAlignVertical: 'top',
      paddingTop: 10,
      borderWidth: 2,
      borderColor: colors.ink,
      backgroundColor: colors.field,
      paddingHorizontal: 12,
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.ink,
    },
  })
