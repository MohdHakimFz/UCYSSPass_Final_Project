import { useState } from 'react'
import { Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BookingStatus } from '../../lib/api'
import BookingList from '../../components/BookingList'
import { fonts } from '../../theme'
import { useTheme } from '../../lib/themeMode'
import type { RootParamList } from '../../../App'

type Props = NativeStackScreenProps<RootParamList, 'EventBookings'>

/** Bookings for one event (GET /bookings?event_id=<id>), or with no id every booking the user may see. */
export default function EventBookingsScreen({ route }: Props) {
  const { colors } = useTheme()
  const [status, setStatus] = useState<'' | BookingStatus>('')
  return (
    <BookingList
      eventId={route.params.eventId}
      status={status}
      onStatus={setStatus}
      header={<Text style={{ fontFamily: fonts.heavy, fontSize: 22, color: colors.ink }}>{route.params.title}</Text>}
    />
  )
}
