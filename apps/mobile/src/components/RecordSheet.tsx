import React from 'react';
import { View } from 'react-native';
import { Text } from './ui/AppText';
import { Pencil, Trash2 } from 'lucide-react-native';
import Sheet from './ui/Sheet';
import Button from './ui/Button';
import { ProgressBar } from './ui';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../constants/theme';

export type RecordRow = [label: string, value?: string | number | null];

// Generic "details" sheet for assets, liabilities, policies and events:
// a headline figure, optional progress, key/value rows, then Edit / Delete.
export default function RecordSheet({
  visible, title, subtitle, headline, headlineLabel, headlineColor = Colors.text1, progress, progressColor, progressNote,
  rows, onEdit, onDelete, onClose, children,
}: {
  visible: boolean; title: string; subtitle?: string;
  headline?: string; headlineLabel?: string; headlineColor?: string;
  progress?: number; progressColor?: string; progressNote?: string;
  rows: RecordRow[]; onEdit: () => void; onDelete: () => void; onClose: () => void;
  children?: React.ReactNode;
}) {
  const shown = rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  return (
    <Sheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <Button title="Delete" variant="danger" icon={<Trash2 size={16} color={Colors.red} />} onPress={onDelete} style={{ flex: 1 }} />
          <Button title="Edit" icon={<Pencil size={16} color="#fff" />} onPress={onEdit} style={{ flex: 1 }} />
        </>
      }
    >
      {headline ? (
        <View style={styles.hero}>
          {headlineLabel ? <Text style={styles.heroLabel}>{headlineLabel}</Text> : null}
          <Text style={[styles.heroValue, { color: headlineColor }]} numberOfLines={1} adjustsFontSizeToFit>{headline}</Text>
          {progress !== undefined ? (
            <View style={{ marginTop: Spacing.sm, gap: 6 }}>
              <ProgressBar pct={progress} color={progressColor || Colors.accentLight} />
              {progressNote ? <Text style={styles.note}>{progressNote}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.card}>
        {shown.map(([k, v], i) => (
          <View key={k} style={[styles.row, i < shown.length - 1 && styles.rowBorder]}>
            <Text style={styles.key}>{k}</Text>
            <Text style={styles.val}>{String(v)}</Text>
          </View>
        ))}
      </View>
      {children}
    </Sheet>
  );
}

const styles = createStyles(() => ({
  hero: { backgroundColor: Colors.panelHover, borderRadius: Radius.md, padding: Spacing.lg, gap: 2 },
  heroLabel: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '600' },
  heroValue: { fontSize: FontSize.xxxl, fontWeight: '800', letterSpacing: -0.5 },
  note: { color: Colors.text2, fontSize: FontSize.sm },
  card: { backgroundColor: Colors.panelHover, borderRadius: Radius.md, paddingHorizontal: Spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.lg, paddingVertical: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  key: { color: Colors.text2, fontSize: FontSize.base },
  val: { color: Colors.text1, fontSize: FontSize.base, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
}));
