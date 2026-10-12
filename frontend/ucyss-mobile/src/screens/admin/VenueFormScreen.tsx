import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api } from '../../lib/api'
import { confirm, describeError, fieldErrors } from '../../lib/manage'
import KeyboardScreen from '../../components/KeyboardScreen'
import { Button, Notice } from '../../components/ui'
import { FormField } from '../../components/manage'
import { useStyles, useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

type Props = NativeStackScreenProps<RootParamList, 'VenueForm'>

/** Admin: add a venue (POST /venues), or edit (PUT) or delete (DELETE) one. */
export default function VenueFormScreen({ route, navigation }: Props) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const venue = route.params?.venue
  const [form, setForm] = useState({ name: venue?.name ?? '', address: venue?.address ?? '', capacity: venue ? String(venue.capacity) : '' })
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    navigation.setOptions({ title: venue ? 'Edit venue' : 'New venue' })
  }, [navigation, venue])

  async function save() {
    setBusy('save')
    setErrors({})
    setNote(null)
    try {
      await api(venue ? `/venues/${venue.id}` : '/venues', { method: venue ? 'PUT' : 'POST', body: { ...form, capacity: form.capacity.trim() } })
      navigation.goBack()
    } catch (err) {
      setErrors(fieldErrors(err))
      setNote(describeError(err))
    } finally {
      setBusy(null)
    }
  }

  function remove() {
    if (!venue) return
    confirm('Delete this venue?', `${venue.name} will be removed. A venue that still has events cannot be deleted.`, 'Delete venue', async () => {
      setBusy('delete')
      setNote(null)
      try {
        await api(`/venues/${venue.id}`, { method: 'DELETE' })
        navigation.goBack()
      } catch (err) {
        // 409 when events still use this venue: the API's own sentence explains it.
        setNote(describeError(err))
        setBusy(null)
      }
    })
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad}>
      {note && <Notice tone="error" text={note} />}
      <FormField label="Venue name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoCapitalize="words" error={errors.name} />
      <FormField label="Address" value={form.address} onChangeText={(address) => setForm({ ...form, address })} autoCapitalize="words" error={errors.address} />
      <FormField label="Capacity" value={form.capacity} onChangeText={(capacity) => setForm({ ...form, capacity })} keyboardType="number-pad" hint="How many people the venue holds. At least 1." error={errors.capacity} />
      <Button title={venue ? 'Save changes' : 'Add venue'} busy={busy === 'save'} onPress={save} />
      {venue && (
        <View style={{ marginTop: 8 }}>
          <Button title="Delete venue" variant="danger" busy={busy === 'delete'} onPress={remove} />
        </View>
      )}
    </KeyboardScreen>
  )
}

const makeStyles = () => StyleSheet.create({ pad: { padding: 16, gap: 14 } })
