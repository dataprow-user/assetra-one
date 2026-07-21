import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

export default function ScreenHeader({
  title, subtitle, right, showBack,
}: { title: string; subtitle?: React.ReactNode; right?: React.ReactNode; showBack?: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      {showBack ? (
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ChevronLeft size={22} color={Colors.text1} />
        </Pressable>
      ) : null}
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl, gap: Spacing.md },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.panel,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1 },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text1 },
  subtitle: { fontSize: FontSize.base, color: Colors.text2, marginTop: 2 },
});
