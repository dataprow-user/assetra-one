import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

export default function StatCard({
  title, value, sub, subColor = Colors.text2, icon: Icon, iconColor = Colors.accentLight,
}: {
  title: string; value: string; sub?: string; subColor?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>; iconColor?: string;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.label}>{title}</Text>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
          <Icon size={16} color={iconColor} />
        </View>
      </View>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={[styles.sub, { color: subColor }]}>{sub}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: '45%' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, color: Colors.text2, fontWeight: '500' },
  iconWrap: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text1 },
  sub: { fontSize: FontSize.sm, marginTop: 4 },
});
