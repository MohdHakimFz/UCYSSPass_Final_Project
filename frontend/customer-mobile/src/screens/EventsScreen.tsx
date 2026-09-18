import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CATEGORY_LABEL, type Category, type EventItem, type Paginated } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { Empty, Notice, Skeleton } from '../components/ui'
import { PosterArt, POSTER } from '../components/PosterArt'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]

function seatState(ev: EventItem) {
  if (!ev.capacity) return { text: 'Not on sale yet', color: colors.inkSoft }
  const left = ev.seats_remaining ?? 0
  if (left === 0) return { text: 'Sold out · waitlist', color: colors.held }
  if (left <= Math.max(5, ev.capacity * 0.1)) return { text: `Only ${left} left`, color: colors.held }
  return { text: `${left} seats left`, color: colors.cleared }
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.8 }]}
    >
      <Text style={[s.chipText, on && { color: colors.paper }]}>{label}</Text>
    </Pressable>
  )
}

// One line of chips that scrolls sideways, so filters don't push the results off the screen.
function ChipStrip({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
      {children}
    </ScrollView>
  )
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
  const hasFilters = !!(query || category || when || price)

  function clearFilters() {
    setSearch('')
    setQuery('')
    setCategory('')
    setWhen('')
    setPrice('')
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.concrete }}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={data?.data ?? []}
      keyExtractor={(e) => String(e.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <Text style={s.h1}>Find your next CTF, bootcamp or conference.</Text>
          <TextInput
            style={s.search}
            placeholder="Search events"
            placeholderTextColor={colors.inkSoft}
            selectionColor={colors.badge}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => setQuery(search)}
            returnKeyType="search"
            accessibilityLabel="Search events"
          />
          <ChipStrip>
            <Chip label="All" on={category === ''} onPress={() => setCategory('')} />
            {CATEGORIES.map((c) => (
              <Chip key={c} label={CATEGORY_LABEL[c]} on={category === c} onPress={() => setCategory(c)} />
            ))}
          </ChipStrip>
          <ChipStrip>
            <Chip label="Any date" on={when === ''} onPress={() => setWhen('')} />
            <Chip label="Next 7 days" on={when === '7'} onPress={() => setWhen('7')} />
            <Chip label="Next 30 days" on={when === '30'} onPress={() => setWhen('30')} />
            <View style={s.divider} />
            <Chip label="Free" on={price === '0'} onPress={() => setPrice(price === '0' ? '' : '0')} />
            <Chip label="Up to RM 50" on={price === '50'} onPress={() => setPrice(price === '50' ? '' : '50')} />
            <Chip label="Up to RM 100" on={price === '100'} onPress={() => setPrice(price === '100' ? '' : '100')} />
          </ChipStrip>
          {hasFilters && (
            <Pressable onPress={clearFilters} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
              <Text style={{ fontFamily: fonts.semibold, color: colors.ink, textDecorationLine: 'underline' }}>Clear filters</Text>
            </Pressable>
          )}
          {error && <Notice tone="error" text={error} />}
        </View>
      }
      ListEmptyComponent={
        !data && !error ? (
          <Skeleton rows={4} height={92} />
        ) : data ? (
          <Empty text="Nothing matches yet. Try a different category, or widen the date and price." />
        ) : null
      }
      renderItem={({ item: ev, index: i }) => {
        const d = new Date(ev.start_at)
        const seats = seatState(ev)
        const tone = POSTER[ev.category]
        const featured = i === 0
        return (
          <Pressable
            onPress={() => navigation.navigate('EventDetail', { id: ev.id })}
            accessibilityRole="button"
            accessibilityLabel={ev.title}
            style={({ pressed }) => [s.poster, { minHeight: featured ? 260 : 190 }, pressed && { opacity: 0.88 }]}
          >
            <PosterArt category={ev.category} />
            <View style={s.posterTop}>
              <View>
                <Text style={[s.day, { color: tone.ink, fontSize: featured ? 88 : 64, lineHeight: featured ? 88 : 64 }]}>{d.getDate()}</Text>
                <Text style={[s.month, { color: tone.ink }]}>{d.toLocaleString('en-MY', { month: 'short' }).toUpperCase()}</Text>
              </View>
              <Text style={[s.cat, { color: tone.bg, backgroundColor: tone.ink }]}>{CATEGORY_LABEL[ev.category].toUpperCase()}</Text>
            </View>
            <View style={s.posterBody}>
              <Text style={[s.title, { color: tone.ink, fontSize: featured ? 26 : 20 }]}>{ev.title}</Text>
              <Text style={[s.sub, { color: tone.ink }]}>{ev.venue?.name ?? 'Venue to be announced'}</Text>
              <View style={s.posterFoot}>
                <Text style={[s.price, { color: tone.ink }]}>
                  {ev.from_price != null ? (Number(ev.from_price) === 0 ? 'Free' : `From RM ${Number(ev.from_price).toFixed(0)}`) : 'Not on sale'}
                </Text>
                <Text style={[s.seat, { color: tone.ink }]}>{seats.text}</Text>
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
    borderRadius: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 0, borderWidth: 2, borderColor: colors.ink },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  divider: { width: 2, marginVertical: 8, backgroundColor: colors.line },
  poster: { overflow: 'hidden', justifyContent: 'space-between', padding: 16 },
  posterTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  posterBody: { gap: 2, marginTop: 20 },
  posterFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  day: { fontFamily: fonts.heavy, letterSpacing: -2 },
  month: { fontFamily: fonts.heavy, fontSize: 16, letterSpacing: 2 },
  cat: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.5, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden' },
  title: { fontFamily: fonts.heavy, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.semibold, fontSize: 14 },
  price: { fontFamily: fonts.heavy, fontSize: 15 },
  seat: { fontFamily: fonts.semibold, fontSize: 13 },
})
