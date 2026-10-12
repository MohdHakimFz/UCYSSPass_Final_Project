import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { Paginated } from '../../lib/api'
import { useFetch } from '../../lib/useFetch'
import { describeError, ONLINE_VENUE, type Venue } from '../../lib/manage'
import { Button, Empty, Notice, Skeleton } from '../../components/ui'
import { Row } from '../../components/manage'
import { fonts, type Palette } from '../../theme'
import { useStyles, useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

/** Admin: every venue (GET /venues). Tap one to edit or delete it. */
export default function VenuesScreen() {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>()
  const { data, error, refresh, refreshing } = useFetch<Paginated<Venue>>('/venues?per_page=100', { every: 30000, describe: describeError })


  return (
    <FlatList
      style={{ backgroundColor: colors.concrete }}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={data?.data ?? []}
      keyExtractor={(v) => String(v.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <Button title="New venue" onPress={() => navigation.navigate('VenueForm', {})} />
          {error && <Notice tone="error" text={error} />}
        </View>
      }
      ListEmptyComponent={!data && !error ? <Skeleton rows={4} height={70} /> : data ? <Empty text="No venues yet. Tap New venue to add one." /> : null}
      renderItem={({ item: v }) =>
        // The shared "Online" venue is used by every online event, so it is shown but not editable.
        v.name === ONLINE_VENUE ? (
          <Row>
            <Text style={s.name}>{v.name}</Text>
            <Text style={s.sub}>Built in. Used automatically by online events.</Text>
          </Row>
        ) : (
          <Row onPress={() => navigation.navigate('VenueForm', { venue: v })} label={`Edit ${v.name}`}>
            <View style={s.top}>
              <Text style={s.name}>{v.name}</Text>
              <Text style={s.cap}>{v.capacity} seats</Text>
            </View>
            <Text style={s.sub}>{v.address}</Text>
          </Row>
        )
      }
    />
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    name: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink, flexShrink: 1 },
    cap: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  })
