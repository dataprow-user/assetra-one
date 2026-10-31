import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/AppText';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontSize, createStyles } from '../../constants/theme';

// Single-value progress ring (e.g. "72% of budget used").
export default function Ring({
  pct, color, size = 92, thickness = 11, center, caption,
}: { pct: number; color: string; size?: number; thickness?: number; center?: string; caption?: string }) {
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(pct, 100));
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.track} strokeWidth={thickness} fill="none" />
        {p > 0 && (
          <Circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
            strokeDasharray={`${(p / 100) * C} ${C}`} rotation={-90} origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {center ? <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{center}</Text> : null}
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = createStyles(() => ({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  value: { color: Colors.text1, fontSize: FontSize.lg, fontWeight: '800' },
  caption: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },
}));
