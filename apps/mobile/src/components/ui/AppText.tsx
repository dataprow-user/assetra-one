import React, { createContext, forwardRef, useContext } from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet, TextProps, TextInputProps } from 'react-native';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

// App-wide typeface: Inter (clear numerals, full ₹ support). Custom fonts on
// Android need one family per weight, so `fontWeight` is translated to the
// matching Inter face here — every screen keeps using plain fontWeight values.
export const FONT_ASSETS = {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
};

const familyFor = (weight: unknown): string => {
  const w = String(weight ?? '400');
  if (w === 'bold' || w === '700') return 'Inter_700Bold';
  if (w === '800' || w === '900') return 'Inter_800ExtraBold';
  if (w === '600') return 'Inter_600SemiBold';
  if (w === '500') return 'Inter_500Medium';
  return 'Inter_400Regular';
};

const withFont = (style: any, nested: boolean) => {
  const flat: any = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return style; // an explicit family (e.g. monospace) wins
  // A nested <Text> that doesn't set its own weight must inherit its parent's face.
  if (nested && flat.fontWeight == null) return style;
  return [style, { fontFamily: familyFor(flat.fontWeight), fontWeight: 'normal' as const }];
};

// Respect the user's system font size, but cap it so layouts don't break.
const MAX_SCALE = 1.15;

const NestedCtx = createContext(false);

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  const nested = useContext(NestedCtx);
  return (
    <NestedCtx.Provider value>
      <RNText ref={ref} maxFontSizeMultiplier={MAX_SCALE} {...rest} style={withFont(style, nested)} />
    </NestedCtx.Provider>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} maxFontSizeMultiplier={MAX_SCALE} {...rest} style={withFont(style, false)} />;
});
export type TextInput = RNTextInput;
export type Text = RNText;
