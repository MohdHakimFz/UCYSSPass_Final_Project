import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import { useIsFocused } from '@react-navigation/native'
import { checkIn, describeError, readPass } from '../../lib/manage'
import { Button, Notice } from '../../components/ui'
import { fonts, type Palette } from '../../theme'
import { useStyles, useTheme } from '../../lib/themeMode'

type Result = { tone: 'ok' | 'error' | 'warn'; title: string; detail?: string }

/**
 * Door check-in: point the camera at a guest's pass. The QR holds {booking_id, qr_token}; the app sends the token
 * to POST /bookings/{id}/checkin and the API decides if it is genuine, confirmed and for one of my events.
 */
export default function ScanScreen() {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const focused = useIsFocused()
  const [permission, requestPermission] = useCameraPermissions()
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  // The camera reports the same code many times a second; this stops a second request while one is running.
  const handling = useRef(false)

  async function onScanned({ data }: BarcodeScanningResult) {
    if (handling.current || result) return
    handling.current = true
    setBusy(true)

    const pass = readPass(data)
    if (!pass) {
      setResult({ tone: 'warn', title: 'Not a UCYSS pass', detail: 'This QR code is not an event pass. Ask the guest to open My passes.' })
    } else {
      try {
        const b = await checkIn(pass.booking_id, pass.qr_token)
        setResult({ tone: 'ok', title: 'Checked in. Welcome!', detail: `Booking #${b.id}${b.seat ? ` · seat ${b.seat.label ?? `${b.seat.row_label}${b.seat.number}`}` : ''}` })
      } catch (err) {
        // 409 already checked in / not confirmed, 422 forged ticket, 403 another organiser's event.
        setResult({ tone: 'error', title: 'Not checked in', detail: describeError(err) })
      }
    }

    setBusy(false)
    handling.current = false
  }

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.concrete }} />

  if (!permission.granted) {
    return (
      <View style={[s.center, { backgroundColor: colors.concrete }]}>
        <Text style={s.h1}>Scan passes at the door</Text>
        <Text style={s.body}>The camera reads each guest&apos;s QR pass and checks them in.</Text>
        {permission.canAskAgain ? (
          <Button title="Allow camera" onPress={requestPermission} />
        ) : (
          <Notice tone="warn" text="Camera access is off for UCYSS. Turn it on in the phone's Settings → Apps → UCYSS → Permissions." />
        )}
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bar }}>
      {/* Only run the camera while this tab is on screen, so it is not left on in the background. */}
      {focused && (
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={result || busy ? undefined : onScanned} />
      )}
      <View style={s.frameWrap} pointerEvents="none">
        <View style={s.frame} />
        <Text style={s.aim}>{busy ? 'Checking…' : 'Point at the guest’s QR pass'}</Text>
      </View>
      {result && (
        <View style={s.sheet}>
          <Notice tone={result.tone} text={result.detail ? `${result.title}\n${result.detail}` : result.title} />
          <Button title="Scan next guest" onPress={() => setResult(null)} />
        </View>
      )}
    </View>
  )
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    center: { flex: 1, padding: 24, gap: 14, justifyContent: 'center' },
    h1: { fontFamily: fonts.heavy, fontSize: 26, color: colors.ink },
    body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.inkSoft },
    frameWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 16 },
    frame: { width: 240, height: 240, borderWidth: 4, borderColor: colors.accent },
    aim: { fontFamily: fonts.semibold, fontSize: 16, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6 },
    sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 10, backgroundColor: colors.paper, borderTopWidth: 3, borderTopColor: colors.ink },
  })
