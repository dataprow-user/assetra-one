import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/AppText';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontSize, createStyles } from '../../constants/theme';

export type Slice = { key: string; label: string; value: number; color: string };

// Colour-blind-friendlier categorical palette (distinct hue AND lightness).
export const CHART_COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#a855f7', '#f97316', '#3b82f6'];
export const OTHER_COLOR = '#94a3b8';

// Ring chart. The legend (rendered by the caller) is the accessible tap
// target for each slice, so the ring itself is decorative.
export default function Donut({
  slices, size = 168, thickness = 22, centerTop, centerBottom,
}: { slices: Slice[]; size?: number; thickness?: number; centerTop?: string; centerBottom?: string }) {
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.track} strokeWidth={thickness} fill="none" />
        {total > 0 && slices.map((s) => {
          const len = (s.value / total) * C;
          const gap = slices.length > 1 ? Math.min(3, len * 0.2) : 0;
          const el = (
            <Circle
              key={s.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${Math.max(len - gap, 0)} ${C - Math.max(len - gap, 0)}`} strokeDashoffset={-acc}
              rotation={-90} origin={`${size / 2}, ${size / 2}`}
            />
          );
          acc += len;
          return el;
        })}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {centerTop ? <Text style={styles.top}>{centerTop}</Text> : null}
        {centerBottom ? <Text style={styles.bottom} numberOfLines={1} adjustsFontSizeToFit>{centerBottom}</Text> : null}
      </View>
    </View>
  );
}

const styles = createStyles(() => ({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  top: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '600' },
  bottom: { color: Colors.text1, fontSize: FontSize.lg, fontWeight: '800', marginTop: 2 },
}));
