import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { Colors, FontSize, Spacing } from '../../constants/theme';

export default function EmptyState({
  icon: Icon, title, description,
}: { icon: React.ComponentType<{ size?: number; color?: string }>; title: string; description?: string }) {
  return (
    <Card style={styles.wrap}>
      <Icon size={36} color={Colors.text3} />
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text1, marginTop: Spacing.sm },
  desc: { fontSize: FontSize.base, color: Colors.text2, textAlign: 'center' },
});
