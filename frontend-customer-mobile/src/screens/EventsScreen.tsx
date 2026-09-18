import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CATEGORY_LABEL, type Category, type EventItem, type Paginated } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { Empty, Notice } from '../components/ui'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]

function ChipRow<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{label}</Text>
      <View style={s.chips}>
        {options.map(([v, text]) => (
          <Pressable
            key={v || 'any'}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: value === v }}
            style={[s.chip, value === v && s.chipOn]}
          >
            <Text style={[s.chipText, value === v && { color: colors.paper }]}>{text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

function seatState(ev: EventItem) {
  if (!ev.capacity) return { text: 'Not on sale yet', color: colors.inkSoft }
  const left = ev.seats_remaining ?? 0
  if (left === 0) return { text: 'Sold out · waitlist', color: colors.held }
  if (left <= Math.max(5, ev.capacity * 0.1)) return { text: `Only ${left} left`, color: colors.held }
  return { text: `${left} seats left`, color: colors.cleared }
}

export default function EventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'' | Category>('')
  const [when, setWhen] = useState<'' | '7' | '30'>('')
  const [price, setPrice] = useState<'' | '0' | '50' | '100'>('')

  const path = useMemo(() => {
    const qs = new URLSearchParams({ status: 'published', from: new Date().toISOString(), per_page: '30' })
    if (query) qs.set('search', query)
    if (category) qs.set('category', category)
    if (when) qs.set('to', new Date(Date.now() + Number(when) * 86400000).toISOString())
    if (price) qs.set('max_price', price)
    return `/events?${qs}`
  }, [query, category, when, price])

  const { data, error, refresh, refreshing } = useFetch<Paginated<EventItem>>(path)

  return (
    <FlatList
      style={{ backgroundColor: colors.concrete }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={data?.data ?? []}
      keyExtractor={(e) => String(e.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 8 }}>
          <Text style={s.h1}>Find your next CTF, bootcamp or conference.</Text>
          <TextInput
            style={s.search}
            placeholder="Search events"
            placeholderTextColor={colors.inkSoft}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => setQuery(search)}
            returnKeyType="search"
            accessibilityLabel="Search events"
          />
          <View style={s.chips}>
            {(['', ...CATEGORIES] as const).map((c) => (
              <Pressable
                key={c || 'all'}
                onPress={() => setCategory(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: category === c }}
                style={[s.chip, category === c && s.chipOn]}
              >
                <Text style={[s.chipText, category === c && { color: colors.paper }]}>{c ? CATEGORY_LABEL[c] : 'All'}</Text>
              </Pressable>
            ))}
          </View>
          <ChipRow
            label="When"
            value={when}
            onChange={setWhen}
            options={[['', 'Any date'], ['7', 'Next 7 days'], ['30', 'Next 30 days']]}
          />
          <ChipRow
            label="Price"
            value={price}
            onChange={setPrice}
            options={[['', 'Any'], ['0', 'Free'], ['50', 'Up to RM 50'], ['100', 'Up to RM 100']]}
          />
          {error && <Notice tone="error" text={error} />}
        </View>
      }
      ListEmptyComponent={
        !data && !error ? (
          <Text style={{ fontFamily: fonts.regular, color: colors.inkSoft, textAlign: 'center', padding: 24 }}>Loading events…</Text>
        ) : data ? (
          <Empty text="Nothing matches yet. Try a different category or clear the search." />
        ) : null
      }
      renderItem={({ item: ev }) => {
        const d = new Date(ev.start_at)
        const seats = seatState(ev)
        return (
          <Pressable
            onPress={() => navigation.navigate('EventDetail', { id: ev.id })}
            accessibilityRole="button"
            style={({ pressed }) => [s.pass, pressed && { opacity: 0.85 }]}
          >
            <View style={s.stub}>
              <Text style={s.stubDay}>{d.getDate()}</Text>
              <Text style={s.stubMonth}>{d.toLocaleString('en-MY', { month: 'short' })}</Text>
            </View>
            <View style={{ flex: 1, padding: 14, gap: 4 }}>
              <Text style={s.title}>{ev.title}</Text>
              <Text style={s.sub}>
                {CATEGORY_LABEL[ev.category]} · {ev.venue?.name ?? 'Venue to be announced'}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={s.price}>
                  {ev.from_price != null ? (Number(ev.from_price) === 0 ? 'Free' : `From RM ${Number(ev.from_price).toFixed(0)}`) : '—'}
                </Text>
                <Text style={[s.seat, { color: seats.color }]}>{seats.text}</Text>
              </View>
            </View>
          </Pressable>
        )
      }}
    />
  )
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.heavy, fontSize: 28, lineHeight: 32, color: colors.ink },
  search: {
    minHeight: 48,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 3,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, minHeight: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 2, borderColor: colors.ink },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  pass: { flexDirection: 'row', backgroundColor: colors.paper, borderRadius: 3, overflow: 'hidden' },
  stub: {
    width: 70,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 3,
    borderRightColor: colors.concrete,
    borderStyle: 'dashed',
  },
  stubDay: { fontFamily: fonts.heavy, fontSize: 28, color: colors.paper },
  stubMonth: { fontFamily: fonts.semibold, fontSize: 14, color: colors.badge },
  title: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  price: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  seat: { fontFamily: fonts.semibold, fontSize: 13 },
})
