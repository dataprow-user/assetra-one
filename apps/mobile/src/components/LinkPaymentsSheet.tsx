import React from 'react';
import { View } from 'react-native';
import { Text } from './ui/AppText';
import { ChevronRight } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import Sheet from './ui/Sheet';
import Tap from './ui/Tap';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../constants/theme';
import { Kind, KIND_CONFIG, entitySubName } from '../utils/entities';
import { unlinkedPayments } from './UnlinkedPayments';

// "Link a transaction" for ONE loan / asset / policy: lists the transactions in the categories that track this
// kind and aren't linked yet (including ones the user unlinked), and links the tapped one to this entity.
// Transactions that were unlinked from this very entity come first.
export default function LinkPaymentsSheet({ visible, onClose, kind, entity }: { visible: boolean; onClose: () => void; kind: Kind; entity: any }) {
  const { state, dispatch, fmt } = useApp();
  const cfg = KIND_CONFIG[kind];
  const list = entity ? unlinkedPayments(state, kind, true) : [];
  const mine = (t: any) => (entity && t.unlinkedFrom === entity.id ? 1 : 0);
  const sorted = [...list].sort((a, b) => mine(b) - mine(a));
  const link = (t: any) => {
    const { noAutoLink, unlinkedFrom, linkSkip, loanSkip, ...rest } = t;
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...rest, [cfg.linkField]: entity.id, subcategory: entity.subName || entitySubName(kind, entity) } });
  };
  return (
    <Sheet visible={visible} title={`Link a transaction`} subtitle={entity ? `to ${entity.name}` : undefined} onClose={onClose}>
      {sorted.length === 0 ? (
        <Text style={styles.empty}>No unlinked transactions in the categories that track {cfg.noun}s. Unlink one from its details, or add a new transaction.</Text>
      ) : sorted.map((t: any) => (
        <Tap key={t.id} onPress={() => link(t)} accessibilityLabel={`Link ${fmt(t.amount)} on ${t.date} to ${entity?.name}`}>
          <View style={[styles.row, mine(t) ? styles.mine : null]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t.type === 'income' ? '+' : ''}{fmt(t.amount)} • {String(t.date).slice(0, 10)}</Text>
              <Text style={styles.meta} numberOfLines={2}>{t.category}{t.notes ? ` • ${t.notes}` : ''}{mine(t) ? ' • was linked here' : ''}{t.linkSkip || t.loanSkip ? ' • marked “not a ' + cfg.noun + '”' : ''}</Text>
            </View>
            <ChevronRight size={16} color={Colors.text3} />
          </View>
        </Tap>
      ))}
    </Sheet>
  );
}

const styles = createStyles(() => ({
  empty: { color: Colors.text2, fontSize: FontSize.md, textAlign: 'center', paddingVertical: Spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.panelHover },
  mine: { backgroundColor: Colors.accentGlow },
  title: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  meta: { color: Colors.text2, fontSize: FontSize.sm },
}));
