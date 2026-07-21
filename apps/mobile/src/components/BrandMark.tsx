import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Ported 1:1 from apps/web/src/components/BrandMark.jsx — "A" silhouette
// with its crossbar reimagined as an ascending growth-chart line.
export default function BrandMark({ size = 24, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Path d="M7 29L18 6.5L29 29" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.5 21.5L15 23.5L18.5 17L22 19.5L25 13" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
      <Path d="M21.3 12.6L25 13L24.4 16.6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
