import React from 'react';
import { View, ViewProps } from 'react-native';
import { Colors, Radius, Spacing, createStyles } from '../../constants/theme';

// Surface for every grouped block. In light mode it lifts off the page with a
// soft shadow; in dark mode it's a faint translucent panel with a hairline.
export default function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = createStyles(() => ({
  card: {
    backgroundColor: Colors.panel,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    shadowColor: '#2a2f78',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Colors.shadowOpacity < 0.2 ? Colors.shadowOpacity : 0,
    shadowRadius: 16,
    elevation: Colors.shadowOpacity < 0.2 ? 3 : 0,
  },
}));
