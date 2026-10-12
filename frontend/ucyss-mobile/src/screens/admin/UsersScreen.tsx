import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { Paginated } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useFetch } from '../../lib/useFetch'
import { describeError, isDemoAccount, type ManagedUser } from '../../lib/manage'
import { Button, Empty, Notice, Skeleton } from '../../components/ui'
import { Choice, ROLE_LABEL, Row } from '../../components/manage'
import { fonts, type Palette } from '../../theme'
import { useStyles, useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

type RoleFilter = '' | ManagedUser['role']
const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'customer', label: 'Customers' },
  { value: 'organiser', label: 'Organisers' },
  { value: 'admin', label: 'Admins' },
]

/** Admin: every account, searchable by name or email and filtered by role (GET /users). Tap one to edit it. */
export default function UsersScreen() {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const { user: me } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleFilter>('')

  const qs = new URLSearchParams({ per_page: '50' })
  if (role) qs.set('role', role)
  if (query) qs.set('search', query)
  const { data, error, refresh, refreshing } = useFetch<Paginated<ManagedUser>>(`/users?${qs}`, { every: 30000, describe: describeError })


  return (
    <FlatList
      style={{ backgroundColor: colors.concrete }}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={data?.data ?? []}
      keyExtractor={(u) => String(u.id)}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <TextInput
            style={s.search}
            placeholder="Search name or email"
            placeholderTextColor={colors.inkSoft}
            selectionColor={colors.accent}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => setQuery(search.trim())}
            returnKeyType="search"
            autoCapitalize="none"
            accessibilityLabel="Search users"
          />
          <Choice options={FILTERS} value={role} onChange={setRole} />
          <Button title="New user" onPress={() => navigation.navigate('UserForm', {})} />
          {data && <Text style={s.count}>{data.total} user{data.total === 1 ? '' : 's'}</Text>}
          {error && <Notice tone="error" text={error} />}
        </View>
      }
      ListEmptyComponent={!data && !error ? <Skeleton rows={5} height={64} /> : data ? <Empty text="No users match. Try another search or role." /> : null}
      renderItem={({ item: u }) => (
        <Row onPress={() => navigation.navigate('UserForm', { user: u })} label={`Edit ${u.name}`}>
          <View style={s.top}>
            <Text style={s.name}>
              {u.name}
              {u.id === me?.id ? ' (you)' : ''}
            </Text>
            <Text style={s.role}>
              {isDemoAccount(u.email) ? 'DEMO · ' : ''}
              {ROLE_LABEL[u.role].toUpperCase()}
            </Text>
          </View>
          <Text style={s.sub}>{u.email}</Text>
        </Row>
      )}
    />
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    search: { minHeight: 48, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.field, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
    count: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    name: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink, flexShrink: 1 },
    role: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.5, color: colors.inkSoft },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  })
