import React, { useMemo, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Text } from './ui/AppText';
import { Pencil, Trash2, ChevronRight } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import Sheet from './ui/Sheet';
import Button from './ui/Button';
import TransactionFormModal from './TransactionFormModal';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../constants/theme';

// One reusable "show me the transactions behind this number" flow:
//   list sheet  →  tap a row  →  full detail sheet  →  Edit / Delete.
// Lists hold transaction IDs and re-read state, so edits and deletes show up
// instantly. Screens call `show(...)` / `showTxn(...)` and render `node` once.

type Cfg = { title: string; subtitle?: string; ids: string[] };

const fmtDate = (iso: string) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export function useTxnExplorer() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const show = (title: string, txns: any[], subtitle?: string) => setCfg({ title, subtitle, ids: txns.map((t) => t.id) });
  const showTxn = (t: any) => setDetailId(t.id);
  const node = <TxnExplorerView cfg={cfg} onCloseList={() => setCfg(null)} detailId={detailId} setDetailId={setDetailId} />;
  return { show, showTxn, node };
}

function TxnExplorerView({ cfg, onCloseList, detailId, setDetailId }: {
  cfg: Cfg | null; onCloseList: () => void; detailId: string | null; setDetailId: (id: string | null) => void;
}) {
  const { state, dispatch, fmt } = useApp();
  const { transactions = [], accounts = [], events = [] } = state;
  const [sort, setSort] = useState<'date' | 'amount'>('date');
  const [editTxn, setEditTxn] = useState<any>(null);

  const accName = (id: string) => accounts.find((a: any) => a.id === id)?.name || '—';

  const list = useMemo(() => {
    if (!cfg) return [];
    const set = new Set(cfg.ids);
    return transactions
      .filter((t: any) => set.has(t.id))
      .sort((a: any, b: any) => (sort === 'amount' ? b.amount - a.amount : +new Date(b.date) - +new Date(a.date)));
  }, [cfg, transactions, sort]);

  const net = list.reduce((s: number, t: any) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
  const allExpense = list.length > 0 && list.every((t: any) => t.type === 'expense');
  const allIncome = list.length > 0 && list.every((t: any) => t.type === 'income');
  const detail = detailId ? transactions.find((t: any) => t.id === detailId) : null;

  const confirmDelete = (t: any) => Alert.alert('Delete this transaction?', 'Your account balance will be adjusted. This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { dispatch({ type: 'DELETE_TRANSACTION', payload: t.id }); setDetailId(null); } },
  ]);

  const colorOf = (t: any) => (t.type === 'transfer' ? Colors.blue : t.type === 'income' ? Colors.green : Colors.red);
  const signOf = (t: any) => (t.type === 'transfer' ? '' : t.type === 'income' ? '+' : '-');
  const titleOf = (t: any) => (t.type === 'transfer' ? `${accName(t.account)} → ${accName(t.toAccount)}` : `${t.category}${t.subcategory ? ` · ${t.subcategory}` : ''}`);

  const rows: [string, string | undefined][] = detail ? [
    ['Date', fmtDate(detail.date)],
    detail.type === 'transfer' ? ['From account', accName(detail.account)] : ['Account', accName(detail.account)],
    ...(detail.type === 'transfer' ? ([['To account', accName(detail.toAccount)]] as [string, string][]) : []),
    ['Category', detail.type === 'transfer' ? undefined : detail.category],
    ['Sub-category', detail.subcategory],
    ['Group', detail.group],
    ['Event', events.find((e: any) => e.id === detail.eventId)?.name],
    ['Notes', detail.notes],
  ] : [];

  return (
    <>
      <Sheet
        visible={!!cfg}
        title={cfg?.title || ''}
        subtitle={cfg?.subtitle}
        onClose={onCloseList}
      >
        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>{allExpense ? 'Total spent' : allIncome ? 'Total received' : 'Net'}</Text>
            <Text style={[styles.summaryValue, { color: allExpense ? Colors.red : net >= 0 ? Colors.green : Colors.red }]}>
              {allExpense ? fmt(-net) : fmt(Math.abs(net))}
            </Text>
          </View>
          <Text style={styles.summaryCount}>{list.length} transaction{list.length === 1 ? '' : 's'}</Text>
        </View>

        <View style={styles.seg}>
          {([['date', 'Newest first'], ['amount', 'Highest amount']] as const).map(([k, label]) => (
            <Pressable key={k} onPress={() => setSort(k)} style={[styles.segBtn, sort === k && styles.segBtnActive]} accessibilityRole="button" accessibilityState={{ selected: sort === k }}>
              <Text style={[styles.segText, sort === k && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {list.length === 0 ? <Text style={styles.empty}>No transactions to show.</Text> : null}
        {list.map((t: any) => (
          <Pressable key={t.id} onPress={() => setDetailId(t.id)} style={styles.row} accessibilityRole="button" accessibilityLabel={`${titleOf(t)}, ${signOf(t)}${fmt(t.amount)}, ${fmtDate(t.date)}. Open details`}>
            <View style={[styles.avatar, { backgroundColor: colorOf(t) + '1f' }]}>
              <Text style={[styles.avatarText, { color: colorOf(t) }]}>{t.type === 'transfer' ? '⇄' : String(t.category || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{titleOf(t)}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>{fmtDate(t.date)}{t.notes ? ` • ${t.notes}` : ''}</Text>
            </View>
            <Text style={[styles.rowAmt, { color: colorOf(t) }]}>{signOf(t)}{fmt(t.amount)}</Text>
            <ChevronRight size={16} color={Colors.text3} />
          </Pressable>
        ))}
      </Sheet>

      <Sheet
        visible={!!detail}
        title="Transaction details"
        onClose={() => setDetailId(null)}
        footer={detail ? (
          <>
            <Button title="Delete" variant="danger" icon={<Trash2 size={16} color={Colors.red} />} onPress={() => confirmDelete(detail)} style={{ flex: 1 }} />
            <Button title="Edit" icon={<Pencil size={16} color="#fff" />} onPress={() => setEditTxn(detail)} style={{ flex: 1 }} />
          </>
        ) : null}
      >
        {detail ? (
          <>
            <View style={styles.hero}>
              <View style={[styles.heroAvatar, { backgroundColor: colorOf(detail) + '1f' }]}>
                <Text style={[styles.heroAvatarText, { color: colorOf(detail) }]}>{detail.type === 'transfer' ? '⇄' : String(detail.category || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>{titleOf(detail)}</Text>
              <Text style={[styles.heroAmount, { color: colorOf(detail) }]}>{signOf(detail)}{fmt(detail.amount)}</Text>
              <View style={[styles.typeChip, { backgroundColor: colorOf(detail) + '1f' }]}>
                <Text style={[styles.typeChipText, { color: colorOf(detail) }]}>{detail.type === 'income' ? 'Income' : detail.type === 'transfer' ? 'Transfer' : 'Expense'}</Text>
              </View>
            </View>
            <View style={styles.detailCard}>
              {rows.filter(([, v]) => v).map(([k, v], i, arr) => (
                <View key={k} style={[styles.detailRow, i < arr.length - 1 && styles.detailRowBorder]}>
                  <Text style={styles.detailKey}>{k}</Text>
                  <Text style={styles.detailVal}>{v}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </Sheet>

      {editTxn && <TransactionFormModal visible mode="edit" transaction={editTxn} onClose={() => setEditTxn(null)} />}
    </>
  );
}

const styles = createStyles(() => ({
  summary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', backgroundColor: Colors.panelHover, borderRadius: Radius.md, padding: Spacing.lg },
  summaryLabel: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '600' },
  summaryValue: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: 2 },
  summaryCount: { color: Colors.text2, fontSize: FontSize.base, fontWeight: '600' },
  seg: { flexDirection: 'row', gap: 4, backgroundColor: Colors.inset, borderRadius: Radius.pill, padding: 4 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  segBtnActive: { backgroundColor: Colors.accent },
  segText: { color: Colors.text2, fontWeight: '700', fontSize: FontSize.base },
  empty: { color: Colors.text2, textAlign: 'center', paddingVertical: Spacing.xl, fontSize: FontSize.base },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64, paddingVertical: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: FontSize.md },
  rowTitle: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  rowMeta: { color: Colors.text2, fontSize: FontSize.sm },
  rowAmt: { fontWeight: '800', fontSize: FontSize.md },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  heroAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  heroAvatarText: { fontWeight: '800', fontSize: FontSize.xl },
  heroTitle: { color: Colors.text2, fontSize: FontSize.md, fontWeight: '600', textAlign: 'center' },
  heroAmount: { fontSize: FontSize.xxxl, fontWeight: '800', letterSpacing: -0.5 },
  typeChip: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: Radius.pill },
  typeChipText: { fontSize: FontSize.sm, fontWeight: '800' },
  detailCard: { backgroundColor: Colors.panelHover, borderRadius: Radius.md, paddingHorizontal: Spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.lg, paddingVertical: Spacing.md },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailKey: { color: Colors.text2, fontSize: FontSize.base },
  detailVal: { color: Colors.text1, fontSize: FontSize.base, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
}));
