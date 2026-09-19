/**
 * The colours of the app in light and dark. Screens ask for the current set with useTheme() (src/lib/themeMode.tsx).
 * Names describe the job, not the colour: `ink` is the main text and border colour, so it is dark in light mode and
 * light in dark mode. `onAccent` is always dark, for text that sits on the orange.
 */
export const lightColors = {
  concrete: '#E7EAEE',
  paper: '#F4F5F7',
  ink: '#14181F',
  inkSoft: '#4A5361',
  line: '#C5CAD1',
  accent: '#E4623F',
  badge: '#E4623F',
  onAccent: '#14181F',
  cleared: '#0F8B6D',
  held: '#A86F00',
  revoked: '#B3372F',
  bar: '#14181F',
  onBar: '#F4F5F7',
  field: '#FFFFFF',
  skeleton: '#D5DCE2',
  tearLine: '#B3BEC8',
  okBg: '#DCEFE8',
  errorBg: '#F3DCDA',
  warnBg: '#F3ECD7',
}

export type Palette = typeof lightColors

export const darkColors: Palette = {
  concrete: '#0F1318',
  paper: '#171C23',
  ink: '#EDEFF2',
  inkSoft: '#A3ADBA',
  line: '#2A323D',
  accent: '#E4623F',
  badge: '#E4623F',
  onAccent: '#14181F',
  cleared: '#4CC38F',
  held: '#E3B341',
  revoked: '#F0786C',
  bar: '#0B0E12',
  onBar: '#EDEFF2',
  field: '#1D242D',
  skeleton: '#232B35',
  tearLine: '#3B4653',
  okBg: '#173428',
  errorBg: '#3A1F1D',
  warnBg: '#3A3018',
}

export const fonts = {
  regular: 'Archivo_400Regular',
  semibold: 'Archivo_600SemiBold',
  heavy: 'Archivo_800ExtraBold',
}
