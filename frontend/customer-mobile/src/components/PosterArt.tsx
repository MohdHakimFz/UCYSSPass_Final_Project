import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg'
import { colors } from '../theme'
import type { Category } from '../lib/api'

// Each category gets a colour block with a pattern drawn in code, so posters need no image files.
export const POSTER: Record<Category, { bg: string; fg: string; ink: string }> = {
  ctf: { bg: colors.accent, fg: '#14181F', ink: '#14181F' },
  bootcamp: { bg: '#14181F', fg: '#F4F5F7', ink: '#F4F5F7' },
  conference: { bg: '#5C6B7A', fg: '#F4F5F7', ink: '#F4F5F7' },
  workshop: { bg: '#F4F5F7', fg: '#14181F', ink: '#14181F' },
}

export function PosterArt({ category }: { category: Category }) {
  const p = POSTER[category]
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: p.bg }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="check" width={48} height={48} patternUnits="userSpaceOnUse">
            <Rect width={24} height={24} fill={p.fg} opacity={0.14} />
            <Rect x={24} y={24} width={24} height={24} fill={p.fg} opacity={0.14} />
          </Pattern>
          <Pattern id="dots" width={14} height={14} patternUnits="userSpaceOnUse">
            <Circle cx={7} cy={7} r={2.2} fill={p.fg} opacity={0.3} />
          </Pattern>
          <Pattern id="grid" width={28} height={28} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0} x2={28} y2={0} stroke={p.fg} strokeWidth={2} opacity={0.18} />
            <Line x1={0} y1={0} x2={0} y2={28} stroke={p.fg} strokeWidth={2} opacity={0.18} />
          </Pattern>
        </Defs>
        {category === 'ctf' && <Rect width="100%" height="100%" fill="url(#check)" />}
        {category === 'bootcamp' && <Rect width="100%" height="100%" fill="url(#dots)" />}
        {category === 'workshop' && <Rect width="100%" height="100%" fill="url(#grid)" />}
        {category === 'conference' &&
          [110, 80, 50, 22].map((r) => (
            <Circle key={r} cx="88%" cy="20%" r={r} stroke={p.fg} strokeWidth={2} opacity={0.3} fill="none" />
          ))}
      </Svg>
    </View>
  )
}
