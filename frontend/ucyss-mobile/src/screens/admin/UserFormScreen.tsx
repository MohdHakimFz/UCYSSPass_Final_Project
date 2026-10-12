import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { confirm, describeError, fieldErrors, isDemoAccount, type ManagedUser } from '../../lib/manage'
import KeyboardScreen from '../../components/KeyboardScreen'
import { Button, Notice } from '../../components/ui'
import { Choice, FormField, ROLE_LABEL } from '../../components/manage'
import { fonts, type Palette } from '../../theme'
import { useStyles, useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

type Props = NativeStackScreenProps<RootParamList, 'UserForm'>
type Role = ManagedUser['role']

const ROLES = (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))

/** Admin: create a user with any role (POST /users), or edit one: details, role, a new password, or delete. */
export default function UserFormScreen({ route, navigation }: Props) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const { user: me } = useAuth()
  const existing = route.params?.user
  const isMe = existing?.id === me?.id
  // The shared demo accounts are read-only here, so nobody's video breaks because of a test edit.
  const locked = !!existing && isDemoAccount(existing.email)

  const [form, setForm] = useState({ name: existing?.name ?? '', email: existing?.email ?? '', role: (existing?.role ?? 'customer') as Role, password: '' })
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    navigation.setOptions({ title: existing ? 'Edit user' : 'New user' })
  }, [navigation, existing])

  async function save() {
    setBusy('save')
    setErrors({})
    setNote(null)
    // Editing: a blank password means "keep the current one", so it is left out of the request.
    const body: Record<string, string> = { name: form.name, email: form.email, role: form.role }
    if (!existing || form.password) body.password = form.password
    try {
      await api(existing ? `/users/${existing.id}` : '/users', { method: existing ? 'PUT' : 'POST', body })
      navigation.goBack()
    } catch (err) {
      setErrors(fieldErrors(err))
      setNote(describeError(err))
    } finally {
      setBusy(null)
    }
  }

  function remove() {
    if (!existing) return
    confirm('Delete this user?', `${existing.name} (${existing.email}) will be removed for good.`, 'Delete user', async () => {
      setBusy('delete')
      setNote(null)
      try {
        await api(`/users/${existing.id}`, { method: 'DELETE' })
        navigation.goBack()
      } catch (err) {
        setNote(describeError(err))
        setBusy(null)
      }
    })
  }

  if (locked) {
    return (
      <KeyboardScreen style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad}>
        <Notice tone="warn" text="This is a shared demo account that the whole group uses in their videos, so it is locked: it cannot be edited, have its role changed or be deleted." />
        <Text style={s.label}>Name</Text>
        <Text style={s.value}>{existing.name}</Text>
        <Text style={s.label}>Email</Text>
        <Text style={s.value}>{existing.email}</Text>
        <Text style={s.label}>Role</Text>
        <Text style={s.value}>{ROLE_LABEL[existing.role]}</Text>
      </KeyboardScreen>
    )
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad}>
      {note && <Notice tone="error" text={note} />}
      <FormField label="Full name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoCapitalize="words" error={errors.name} />
      <FormField label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} keyboardType="email-address" autoComplete="off" error={errors.email} />
      {isMe ? (
        <Text style={s.hint}>This is your own account, so its role cannot be changed here.</Text>
      ) : (
        <Choice label="Role" options={ROLES} value={form.role} onChange={(role) => setForm({ ...form, role })} error={errors.role} />
      )}
      <FormField
        label={existing ? 'New password' : 'Password'}
        value={form.password}
        onChangeText={(password) => setForm({ ...form, password })}
        secureTextEntry
        autoComplete="off"
        hint={existing ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}
        error={errors.password ?? errors.current_password}
      />
      <Button title={existing ? 'Save changes' : 'Create user'} busy={busy === 'save'} onPress={save} />
      {existing && !isMe && (
        <View style={{ marginTop: 8 }}>
          <Button title="Delete user" variant="danger" busy={busy === 'delete'} onPress={remove} />
        </View>
      )}
    </KeyboardScreen>
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pad: { padding: 16, gap: 14 },
    hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
    label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
    value: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink, marginTop: -8 },
  })
