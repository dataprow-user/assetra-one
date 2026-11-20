import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './ui/AppText';
import { ChevronRight } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import Sheet from './ui/Sheet';
import Tap from './ui/Tap';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../constants/theme';
import { Kind, KIND_CONFIG, categoriesTracking, entitySubName } from '../utils/entities';
import LoanFormModal from './entity/LoanFormModal';
import AssetFormModal from './entity/AssetFormModal';
import PolicyFormModal from './entity/PolicyFormModal';

// Transactions in a category that TRACKS a kind (loans / assets / policies) but aren't tied to one yet — e.g.
// several lenders under one generic sub-category. The user assigns each one, or marks it "Not a payment" so it
// stops appearing. Works for every kind; nothing here depends on any category or entity name.
export function unlinkedPayments(state: any, kind: Kind, includeSkipped = false): any[] {
  const cfg = KIND_CONFIG[kind];
  const tracked = categoriesTracking(state, kind);
  if (!tracked.length) return [];
  return (state.transactions || [])
    .filter((t: any) => !t[cfg.linkField] && (includeSkipped || (!t.linkSkip && !t.loanSkip)) && tracked.some((x) => x.txnType === t.type && x.cat.name === t.category))
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
}
export const unlinkedLoanPayments = (state: any) => unlinkedPayments(state, 'liability');

const WORDS: Record<Kind, { title: string; skip: string; pick: string }> = {
  liability: { title: 'Payments that need a loan', skip: 'Not a loan', pick: 'Choose loan' },
  asset: { title: 'Transactions that need an asset', skip: 'Not an asset', pick: 'Choose asset' },
  insurance: { title: 'Payments that need a policy', skip: 'Not a premium', pick: 'Choose policy' },
};

export default function UnlinkedPaymentsSheet({ visible, onClose, kind = 'liability' }: { visible: boolean; onClose: () => void; kind?: Kind }) {
  const { state, dispatch, fmt } = useApp();
  const cfg = KIND_CONFIG[kind];
  const w = WORDS[kind];
  const entities: any[] = state[cfg.listKey] || [];
  const list = unlinkedPayments(state, kind);
  const [pick, setPick] = useState<any[] | null>(null);
  const [adding, setAdding] = useState(false);

  const groups = new Map<string, any[]>();
  list.forEach((t: any) => { const k = t.subcategory || '(no sub-category)'; groups.set(k, [...(groups.get(k) || []), t]); });
  const typeLabel = (e: any) => ((cfg.typeListKey ? state[cfg.typeListKey] : []) || []).find((t: any) => t.key === e.type)?.label || '';

  const assign = (e: any) => {
    (pick || []).forEach((t: any) => dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...t, [cfg.linkField]: e.id, subcategory: e.subName || entitySubName(kind, e) } }));
    setPick(null);
  };
  const skip = (t: any) => dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...t, linkSkip: true } });
  const sign = (t: any) => (t.type === 'income' ? '+' : '');

  return (
    <>
      <Sheet visible={visible} title={w.title} subtitle={`Pick which ${cfg.noun} each one belongs to, or mark it “${w.skip}”`} onClose={onClose}>
        {list.length === 0 ? (
          <Text style={styles.empty}>All sorted — everything is linked. ✓</Text>
        ) : [...groups.entries()].map(([sub, txns]) => (
          <View key={sub} style={styles.group}>
            <View style={styles.groupHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupTitle} numberOfLines={1}>{sub}</Text>
                <Text style={styles.groupMeta}>{txns.length} transaction{txns.length === 1 ? '' : 's'} • {fmt(txns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0))}</Text>
              </View>
              {txns.length > 1 ? (
                <Pressable onPress={() => setPick(txns)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Assign all ${txns.length} under ${sub}`}>
                  <Text style={styles.link}>Assign all ›</Text>
                </Pressable>
              ) : null}
            </View>
            {txns.map((t: any) => (
              <View key={t.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{sign(t)}{fmt(t.amount)} • {t.date}</Text>
                  {t.notes ? <Text style={styles.rowNotes} numberOfLines={2}>{t.notes}</Text> : null}
                </View>
                <Pressable onPress={() => setPick([t])} style={styles.btnPrimary} accessibilityRole="button" accessibilityLabel={`${w.pick} for ${fmt(t.amount)} on ${t.date}`}>
                  <Text style={styles.btnPrimaryText}>{w.pick}</Text>
                </Pressable>
                <Pressable onPress={() => skip(t)} style={styles.btnGhost} accessibilityRole="button" accessibilityLabel={w.skip}>
                  <Text style={styles.btnGhostText}>{w.skip}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))}
      </Sheet>

      <Sheet visible={!!pick} title={`Which ${cfg.noun}?`} subtitle={pick ? `${pick.length} transaction${pick.length === 1 ? '' : 's'} • ${fmt(pick.reduce((s, t) => s + Number(t.amount || 0), 0))}` : undefined} onClose={() => setPick(null)}>
        <Tap onPress={() => setAdding(true)} accessibilityLabel={`${cfg.addLabel}. Opens the form, then assigns these transactions to it`}>
          <View style={[styles.entityRow, styles.addRow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addText}>➕ {cfg.addLabel}…</Text>
              <Text style={styles.entityMeta}>Not in the list? Create it here and these will be assigned to it.</Text>
            </View>
            <ChevronRight size={16} color={Colors.accentLight} />
          </View>
        </Tap>
        {entities.length === 0 ? null : entities.map((e: any) => (
          <Tap key={e.id} onPress={() => assign(e)} accessibilityLabel={`${e.name}. Assign here`}>
            <View style={styles.entityRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entityName} numberOfLines={2}>{e.name}</Text>
                {typeLabel(e) ? <Text style={styles.entityMeta}>{typeLabel(e)}</Text> : null}
              </View>
              <ChevronRight size={16} color={Colors.text3} />
            </View>
          </Tap>
        ))}
      </Sheet>

      {adding && kind === 'liability' && <LoanFormModal visible onClose={() => setAdding(false)} onSaved={(e) => { assign(e); setAdding(false); }} />}
      {adding && kind === 'asset' && <AssetFormModal visible onClose={() => setAdding(false)} onSaved={(e) => { assign(e); setAdding(false); }} />}
      {adding && kind === 'insurance' && <PolicyFormModal visible onClose={() => setAdding(false)} onSaved={(e) => { assign(e); setAdding(false); }} />}
    </>
  );
}

const styles = createStyles(() => ({
  empty: { color: Colors.text2, fontSize: FontSize.md, textAlign: 'center', paddingVertical: Spacing.xl },
  group: { gap: Spacing.sm, backgroundColor: Colors.panelHover, borderRadius: Radius.md, padding: Spacing.md },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  groupTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  groupMeta: { color: Colors.text2, fontSize: FontSize.sm },
  link: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  rowTitle: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  rowNotes: { color: Colors.text2, fontSize: FontSize.sm },
  btnPrimary: { minHeight: 40, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: FontSize.sm },
  btnGhost: { minHeight: 40, paddingHorizontal: Spacing.sm, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { color: Colors.text2, fontWeight: '700', fontSize: FontSize.sm },
  entityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.panelHover },
  addRow: { backgroundColor: Colors.accentGlow },
  addText: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base },
  entityName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  entityMeta: { color: Colors.text2, fontSize: FontSize.sm },
}));
