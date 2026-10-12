import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api } from '../../lib/api'
import { describeError, fieldErrors } from '../../lib/manage'
import KeyboardScreen from '../../components/KeyboardScreen'
import { Button, Notice } from '../../components/ui'
import { FormField, Toggle } from '../../components/manage'
import { useStyles, useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

type Props = NativeStackScreenProps<RootParamList, 'TierForm'>

/** Add a tier (POST /events/{id}/ticket-types) or edit one (PUT /ticket-types/{id}). */
export default function TierFormScreen({ route, navigation }: Props) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const { eventId, tier } = route.params
  const [form, setForm] = useState({
    name: tier?.name ?? '',
    price: tier ? String(Number(tier.price)) : '0',
    capacity: tier ? String(tier.capacity) : '',
    members_only: tier?.members_only ?? false,
  })
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    navigation.setOptions({ title: tier ? 'Edit tier' : 'New tier' })
  }, [navigation, tier])

  async function save() {
    setBusy(true)
    setErrors({})
    setNote(null)
    try {
      // Numbers go as typed: if a box is empty or not a number, the API says so with a 422 under that box.
      const body = { name: form.name, price: form.price.trim(), capacity: form.capacity.trim(), members_only: form.members_only }
      await api(tier ? `/ticket-types/${tier.id}` : `/events/${eventId}/ticket-types`, { method: tier ? 'PUT' : 'POST', body })
      navigation.goBack()
    } catch (err) {
      setErrors(fieldErrors(err))
      setNote(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad}>
      {note && <Notice tone="error" text={note} />}
      <FormField label="Tier name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoCapitalize="words" placeholder="e.g. Student, Early bird" error={errors.name} />
      <FormField label="Price (RM)" value={form.price} onChangeText={(price) => setForm({ ...form, price })} keyboardType="decimal-pad" hint="0 makes the tier free: bookings are confirmed straight away." error={errors.price} />
      <FormField label="Seats" value={form.capacity} onChangeText={(capacity) => setForm({ ...form, capacity })} keyboardType="number-pad" error={errors.capacity ?? errors.seats_remaining} />
      <Toggle label="Members only" hint="Only UCYSS members can book this tier." value={form.members_only} onChange={(members_only) => setForm({ ...form, members_only })} />
      <Button title={tier ? 'Save tier' : 'Add tier'} busy={busy} onPress={save} />
    </KeyboardScreen>
  )
}

const makeStyles = () => StyleSheet.create({ pad: { padding: 16, gap: 14 } })
