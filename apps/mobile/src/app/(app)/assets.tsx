import RecordSheet from '../../components/RecordSheet';
import TransactionFormModal from '../../components/TransactionFormModal';
import AssetFormModal from '../../components/entity/AssetFormModal';
import { useTxnExplorer } from '../../components/TxnExplorer';
import LinkPaymentsSheet from '../../components/LinkPaymentsSheet';
import UnlinkedPaymentsSheet, { unlinkedPayments } from '../../components/UnlinkedPayments';
import { assetStatus, assetBaseline, categoriesTracking } from '../../utils/entities';
import React, { useState, useMemo } from 'react';
import { View, FlatList, Pressable, Alert } from 'react-native';
import { Text, TextInput } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Plus, Edit2, Trash2, Settings2, Search, Clock, ChevronRight } from 'lucide-react-native';
import { useApp, DEFAULT_ASSET_TYPES } from '../../context/AppContext';
import { Card, Button, EmptyState, AppModal, FormField, SelectField, ScreenHeader, Badge, PageHero, FilterChips, Tap } from '../../components/ui';
import type { ChipOption } from '../../components/ui';
import Donut, { CHART_COLORS, Slice } from '../../components/charts/Donut';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { MAX_SHORT_LENGTH } from '../../utils/validation';

// Ported from apps/web/src/pages/Assets.jsx. The web version has a
// table/by-type dual view — on mobile a single scrollable card list carries
// the same info more comfortably, so that's the only list mode here.

const getSwatches = () => [Colors.accent, Colors.green, Colors.red, Colors.yellow, Colors.blue, Colors.accent2, '#f97316', '#06b6d4'];

const getTypeMap = (types: any[]) => {
  const labels: Record<string, string> = {}, colors: Record<string, string> = {};
  types.forEach((t) => { labels[t.key] = t.label; colors[t.key] = t.color; });
  return { labels, colors };
};

const emptyType = () => ({ label: '', color: Colors.accent });

export default function Assets() {
  const { state, dispatch, uid, fmt, fmtSigned, fmtN } = useApp();
  const { assets = [] } = state;
  const assetTypes = state.assetTypes && state.assetTypes.length > 0 ? state.assetTypes : DEFAULT_ASSET_TYPES;
  const { labels: TYPE_LABELS, colors: TYPE_COLORS } = getTypeMap(assetTypes);

  const [detail, setDetail] = useState<any>(null);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [typeModal, setTypeModal] = useState<any>(null); // null | 'manage' | { mode, data? }
  const [typeForm, setTypeForm] = useState<any>(emptyType());
  const transactions = state.transactions || [];
  const st = (a: any) => assetStatus(a, transactions);
  const explorer = useTxnExplorer();
  const [showUnlinked, setShowUnlinked] = useState(false);
  const [linkFor, setLinkFor] = useState<any>(null);
  const [recordInit, setRecordInit] = useState<any>(null);
  const pendingTxns = unlinkedPayments(state, 'asset');

  // ── Search + type filter ──
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const filteredAssets = useMemo(() => assets.filter((a: any) => {
    const matchesSearch = !search.trim() || a.name?.toLowerCase().includes(search.trim().toLowerCase());
    const matchesType = !filterType || a.type === filterType;
    return matchesSearch && matchesType;
  }), [assets, search, filterType]);

  const openAdd = () => setModal({ mode: 'add' });
  const openEdit = (a: any) => setModal({ mode: 'edit', data: a });

  const handleDelete = (id: string) => {
    Alert.alert('Delete this asset?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_ASSET', payload: id }) },
    ]);
  };

  // ── Type management ──
  const openTypeManager = () => setTypeModal('manage');
  const openAddType = () => { setTypeForm(emptyType()); setTypeModal({ mode: 'add' }); };
  const openEditType = (t: any) => { setTypeForm({ ...t }); setTypeModal({ mode: 'edit', data: t }); };

  const handleTypeSubmit = () => {
    if (!typeForm.label.trim()) return;
    if (typeModal?.mode === 'add') {
      const key = typeForm.label.trim().toLowerCase().replace(/\s+/g, '_');
      dispatch({ type: 'ADD_ASSET_TYPE', payload: { ...typeForm, key, id: uid() } });
    } else {
      dispatch({ type: 'UPDATE_ASSET_TYPE', payload: { ...typeForm, id: typeModal!.data.id } });
    }
    setTypeModal('manage');
  };

  const handleDeleteType = (id: string) => {
    Alert.alert('Delete this asset type?', 'Existing assets of this type will remain.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_ASSET_TYPE', payload: id }) },
    ]);
  };

  // ── Value calculations (derived from linked transactions) ──
  const statuses = new Map<string, ReturnType<typeof assetStatus>>();
  assets.forEach((a: any) => statuses.set(a.id, st(a)));
  const totalPurchase = assets.reduce((s: number, a: any) => s + statuses.get(a.id)!.invested, 0);
  const totalCurrent = assets.reduce((s: number, a: any) => s + statuses.get(a.id)!.current, 0);
  const totalGain = totalCurrent - totalPurchase;
  const gainPctTotal = totalPurchase > 0 ? (totalGain / totalPurchase) * 100 : 0;

  const byType = assetTypes.map((t: any) => {
    const items = assets.filter((a: any) => a.type === t.key);
    return { key: t.key as string, label: t.label as string, color: (t.color || Colors.accent) as string, count: items.length, value: items.reduce((s: number, a: any) => s + statuses.get(a.id)!.current, 0) };
  });
  const chipOptions: ChipOption[] = [
    { key: 'all', label: 'All', count: assets.length },
    ...byType.filter((t) => t.count > 0 || t.key === filterType).map((t) => ({ key: t.key, label: t.label, count: t.count, color: t.color })),
  ];
  const slices: Slice[] = byType.filter((t) => t.value > 0).sort((x, y) => y.value - x.value)
    .map((t, i) => ({ key: t.key, label: t.label, value: t.value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  const sliceTotal = slices.reduce((s, x) => s + x.value, 0);
  const toggleType = (k: string) => setFilterType((cur) => (cur === k ? '' : k));

  const header = (
    <View style={styles.listHeader}>
      {pendingTxns.length > 0 ? (
        <Card style={styles.pendingCard}>
          <Text style={styles.noteTitle}>{pendingTxns.length} transaction{pendingTxns.length === 1 ? '' : 's'} need an asset</Text>
          <Text style={styles.noteText}>They are in a category that tracks assets, but I cannot tell which asset they belong to. Assign them so each asset's value is right, or mark them "Not an asset".</Text>
          <Button title="Review & assign" size="sm" onPress={() => setShowUnlinked(true)} />
        </Card>
      ) : null}
      <PageHero
        label="Portfolio value"
        value={fmt(totalCurrent)}
        sub={assets.length === 0 ? 'Add your first holding to start tracking' : `${totalGain >= 0 ? '▲' : '▼'} ${fmt(Math.abs(totalGain))} (${totalGain >= 0 ? '+' : ''}${gainPctTotal.toFixed(1)}%) overall`}
        stats={[
          { label: 'Invested', value: fmt(totalPurchase) },
          { label: 'Gain / Loss', value: fmtSigned(totalGain) },
          { label: 'Holdings', value: String(assets.length), onPress: () => setFilterType(''), a11y: `${assets.length} holdings. Show all` },
        ]}
      />

      {slices.length > 0 ? (
        <Card style={{ gap: Spacing.md }}>
          <Text style={styles.cardTitle}>Allocation</Text>
          <View style={{ alignItems: 'center' }}>
            <Donut slices={slices} centerTop="Total" centerBottom={fmt(sliceTotal)} />
          </View>
          <View>
            {slices.map((s) => {
              const active = filterType === s.key;
              const pct = sliceTotal ? ((s.value / sliceTotal) * 100).toFixed(0) : '0';
              return (
                <Pressable key={s.key} onPress={() => toggleType(s.key)} style={[styles.legendRow, active && { backgroundColor: s.color + '1f' }]}
                  accessibilityRole="button" accessibilityState={{ selected: active }}
                  accessibilityLabel={`${s.label}, ${fmt(s.value)}, ${pct} percent. ${active ? 'Tap to clear filter' : 'Tap to filter'}`}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <Text style={styles.legendName} numberOfLines={1}>{s.label}</Text>
                  <Text style={styles.legendPct}>{pct}%</Text>
                  <Text style={styles.legendVal} numberOfLines={1}>{fmt(s.value)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {assets.length > 0 ? (
        <>
          <View style={styles.searchWrap}>
            <Search size={16} color={Colors.text3} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search assets…"
              placeholderTextColor={Colors.text3}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Search assets"
            />
          </View>
          <FilterChips options={chipOptions} value={filterType || 'all'} onChange={(k) => setFilterType(k === 'all' ? '' : k)} />
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Assets"
          showBack
          right={
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Pressable onPress={openTypeManager} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Manage asset types">
                <Settings2 size={18} color={Colors.text2} />
              </Pressable>
              <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add asset">
                <Plus size={20} color="#fff" />
              </Pressable>
            </View>
          }
        />
      </View>

      <FlatList extraData={[fmt, filteredAssets.length, filterType]}
        data={filteredAssets}
        keyExtractor={(a: any) => a.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={header}
        ListEmptyComponent={
          assets.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: Colors.greenBg }]}><TrendingUp size={26} color={Colors.green} /></View>
              <Text style={styles.emptyTitle}>No assets yet</Text>
              <Text style={styles.emptyText}>Track gold, mutual funds, stocks, FDs and more in one place.</Text>
              <Button title="Add your first asset" icon={<Plus size={16} color="#fff" />} onPress={openAdd} />
            </Card>
          ) : (
            <EmptyState icon={Search} title="No matches" description="Try a different search or clear the type filter." />
          )
        }
        renderItem={({ item: a }: { item: any }) => {
          const stt = statuses.get(a.id)!;
          const { invested, current, gain, gainPct } = stt;
          const { buy, curr } = assetBaseline(a);
          const last = stt.payments[0];
          const color = TYPE_COLORS[a.type] || Colors.text2;
          const gColor = gain >= 0 ? Colors.green : Colors.red;
          const share = totalCurrent > 0 ? (current / totalCurrent) * 100 : 0;
          return (
            <Tap onPress={() => setDetail(a)} accessibilityLabel={`${a.name}, ${TYPE_LABELS[a.type] || a.type}, value ${fmt(current)}, ${gain >= 0 ? 'gain' : 'loss'} ${Math.abs(gainPct).toFixed(1)} percent. Tap for details`}>
              <Card style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{a.name}</Text>
                    <Badge label={TYPE_LABELS[a.type] || a.type} color={color} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => openEdit(a)} hitSlop={8} style={styles.miniBtn} accessibilityRole="button" accessibilityLabel={`Edit ${a.name}`}><Edit2 size={16} color={Colors.text2} /></Pressable>
                    <Pressable onPress={() => handleDelete(a.id)} hitSlop={8} style={styles.miniBtn} accessibilityRole="button" accessibilityLabel={`Delete ${a.name}`}><Trash2 size={16} color={Colors.red} /></Pressable>
                  </View>
                </View>

                <View style={styles.valueHead}>
                  <Text style={styles.bigValue} numberOfLines={1} adjustsFontSizeToFit>{fmt(current)}</Text>
                  <View style={[styles.gainPill, { backgroundColor: gColor + '1f' }]}>
                    <Text style={[styles.gainText, { color: gColor }]} numberOfLines={1}>
                      {gain >= 0 ? '▲' : '▼'} {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <Text style={styles.metaText} numberOfLines={1}>
                  {fmtN(a.quantity)} {a.unit || 'units'} • Buy {fmt(buy)} • Now {fmt(curr)}
                </Text>

                <View style={styles.valuesRow}>
                  <View style={styles.valueCol}>
                    <Text style={styles.valueLabel}>Invested</Text>
                    <Text style={[styles.valueAmt, { color: Colors.text2 }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(invested)}</Text>
                  </View>
                  <View style={styles.valueCol}>
                    <Text style={styles.valueLabel}>Gain / Loss</Text>
                    <Text style={[styles.valueAmt, { color: gColor }]} numberOfLines={1} adjustsFontSizeToFit>{gain >= 0 ? '+' : ''}{fmtSigned(gain)}</Text>
                  </View>
                  <View style={styles.valueCol}>
                    <Text style={styles.valueLabel}>Of portfolio</Text>
                    <Text style={styles.valueAmt} numberOfLines={1}>{share.toFixed(1)}%</Text>
                  </View>
                </View>

                {last ? (
                  <View style={[styles.statusChip, { backgroundColor: Colors.greenBg }]}>
                    <Clock size={15} color={Colors.green} />
                    <Text style={[styles.statusText, { color: Colors.green }]} numberOfLines={1}>Last added {fmt(last.amount)} on {String(last.date).slice(0, 10)}</Text>
                  </View>
                ) : null}

                {a.notes ? <Text style={styles.notes} numberOfLines={2}>{a.notes}</Text> : null}
              </Card>
            </Tap>
          );
        }}
      />

      <AssetFormModal visible={!!modal} entity={modal?.mode === 'edit' ? modal.data : undefined} onClose={() => setModal(null)} />

      {/* Type Manager Modal */}
      {typeModal === 'manage' && (
        <AppModal visible title="Manage Asset Types" onClose={() => setTypeModal(null)}>
          <Button title="Add Type" icon={<Plus size={14} color="#fff" />} size="sm" onPress={openAddType} style={{ marginBottom: Spacing.lg, alignSelf: 'flex-start' }} />
          <View style={{ gap: Spacing.sm }}>
            {assetTypes.map((t: any) => (
              <View key={t.id} style={styles.typeRow}>
                <Badge label={t.label} color={t.color} />
                <View style={styles.actionsRow}>
                  <Pressable onPress={() => openEditType(t)} hitSlop={8}><Edit2 size={15} color={Colors.text2} /></Pressable>
                  <Pressable onPress={() => handleDeleteType(t.id)} hitSlop={8}><Trash2 size={15} color={Colors.red} /></Pressable>
                </View>
              </View>
            ))}
          </View>
        </AppModal>
      )}

      {/* Add/Edit Type Modal */}
      {typeModal && typeModal !== 'manage' && (
        <AppModal
          visible
          title={typeModal.mode === 'add' ? 'Add Asset Type' : 'Edit Asset Type'}
          onClose={() => setTypeModal('manage')}
          footer={
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setTypeModal('manage')} style={{ flex: 1 }} />
              <Button title={typeModal.mode === 'add' ? 'Add' : 'Update'} onPress={handleTypeSubmit} style={{ flex: 1 }} />
            </View>
          }
        >
          <FormField label="Type Name" value={typeForm.label} onChangeText={(v) => setTypeForm((f: any) => ({ ...f, label: v }))}
            maxLength={MAX_SHORT_LENGTH} placeholder="e.g. Crypto, PPF" />
          <Text style={styles.label}>Color</Text>
          <View style={styles.swatchRow}>
            {getSwatches().map((c) => (
              <Pressable key={c} onPress={() => setTypeForm((f: any) => ({ ...f, color: c }))}
                style={[styles.swatch, { backgroundColor: c }, typeForm.color === c && styles.swatchActive]} />
            ))}
          </View>
        </AppModal>
      )}
      {(() => {
        const a = detail ? assets.find((x: any) => x.id === detail.id) : null;
        if (!a) return null;
        const stt = statuses.get(a.id)!;
        const { gain, gainPct } = stt;
        const { buy, curr } = assetBaseline(a);
        const cat = categoriesTracking(state, 'asset').find((x) => x.txnType === 'expense')?.cat;
        const startRecord = () => setRecordInit({
          type: 'expense', category: cat?.name || '', group: cat?.group || '', subcategory: a.subName || '', assetId: a.id, notes: a.name,
        });
        const sign = (n: number) => (n >= 0 ? '+' : '');
        return (
          <RecordSheet
            visible title={a.name} subtitle={TYPE_LABELS[a.type] || a.type}
            headlineLabel="Current value" headline={fmt(stt.current)}
            rows={[
              ['Amount invested', fmt(stt.invested)],
              ['Gain / loss', `${sign(gain)}${fmtSigned(gain)} (${sign(gainPct)}${gainPct.toFixed(1)}%)`],
              ['Quantity (as entered)', `${fmtN(a.quantity)} ${a.unit || 'units'} (as of ${stt.asOf})`],
              ['Average buy price', fmt(buy)],
              ['Current price', fmt(curr)],
              ['Value you entered', `${fmt(stt.baselineCurrent)} (as of ${stt.asOf})`],
              ['Added via transactions', stt.payments.length ? `${stt.netAdded >= 0 ? '+' : '-'}${fmt(Math.abs(stt.netAdded))}${stt.withdrawals > 0 ? ` (${fmt(stt.contributions)} in, ${fmt(stt.withdrawals)} out)` : ''}` : undefined],
              ['Earlier transactions (not counted)', stt.earlierCount ? `${stt.earlierCount} • ${fmt(stt.earlierTotal)} — before ${stt.asOf}` : undefined],
              ['Notes', a.notes],
            ]}
            onClose={() => setDetail(null)}
            onEdit={() => { setDetail(null); setTimeout(() => openEdit(a), 250); }}
            onDelete={() => { setDetail(null); setTimeout(() => handleDelete(a.id), 250); }}
          >
            {cat ? (
              <Button title="Record investment" icon={<Plus size={16} color="#fff" />} onPress={startRecord} />
            ) : (
              <Text style={styles.payEmpty}>To record investments here, open Categories and choose which expense category tracks assets.</Text>
            )}

            {stt.earlierCount > 0 && !a.earlierOk ? (
              <View style={styles.linkCard}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                  <Clock size={16} color={Colors.accentLight} />
                  <Text style={styles.linkTitle}>{stt.earlierCount} transaction{stt.earlierCount === 1 ? '' : 's'} ({fmt(stt.earlierTotal)}) dated before the figures date</Text>
                </View>
                <Text style={styles.linkSub}>The figures you entered are as of {stt.asOf}. Were they the amounts <Text style={{ fontWeight: '800', color: Colors.text1 }}>before</Text> these transactions (count them), or already <Text style={{ fontWeight: '800', color: Colors.text1 }}>after</Text> them (leave them out)?</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Button title="Count them" size="sm" style={{ flex: 1 }}
                    onPress={() => dispatch({ type: 'UPDATE_ASSET', payload: { ...a, valueAsOf: stt.earlierFrom || a.valueAsOf } })} />
                  <Button title="Already included" variant="secondary" size="sm" style={{ flex: 1 }}
                    onPress={() => dispatch({ type: 'UPDATE_ASSET', payload: { ...a, earlierOk: true } })} />
                </View>
              </View>
            ) : null}

            <View style={styles.payHeadRow}>
              <Text style={styles.payHeading}>Transactions since {stt.asOf}</Text>
              <Pressable onPress={() => setLinkFor(a)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Link a transaction to this asset">
                <Text style={styles.payAll}>+ Link</Text>
              </Pressable>
              {stt.payments.length > 0 ? (
                <Pressable onPress={() => explorer.show(`${a.name} — transactions`, stt.payments, `Since ${stt.asOf}`)} hitSlop={8} style={styles.seeAll} accessibilityRole="button" accessibilityLabel={`See all transactions for ${a.name}`}>
                  <Text style={styles.payAll}>See all ›</Text>
                </Pressable>
              ) : null}
            </View>
            {stt.payments.length === 0 ? (
              <Text style={styles.payEmpty}>No transactions linked yet. Record an investment (or choose this asset when adding a transaction) and the value will update automatically.</Text>
            ) : stt.payments.slice(0, 12).map((t: any) => (
              <Pressable key={t.id} onPress={() => explorer.showTxn(t)} style={styles.payRow} accessibilityRole="button"
                accessibilityLabel={`${t.type === 'income' ? 'Withdrawal' : 'Investment'} of ${fmt(t.amount)} on ${String(t.date).slice(0, 10)}. Tap for the transaction`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payDate}>{String(t.date).slice(0, 10)}</Text>
                  <Text style={styles.payMeta}>{t.type === 'income' ? 'Taken out' : 'Put in'}</Text>
                </View>
                <Text style={[styles.payAmt, { color: t.type === 'income' ? Colors.red : Colors.green }]}>{t.type === 'income' ? '-' : '+'}{fmt(t.amount)}</Text>
                <ChevronRight size={16} color={Colors.text3} />
              </Pressable>
            ))}
          </RecordSheet>
        );
      })()}
      {recordInit && <TransactionFormModal visible mode="add" initial={recordInit} onClose={() => setRecordInit(null)} />}
      {explorer.node}
      <LinkPaymentsSheet kind="asset" entity={linkFor} visible={!!linkFor} onClose={() => setLinkFor(null)} />
      <UnlinkedPaymentsSheet kind="asset" visible={showUnlinked} onClose={() => setShowUnlinked(false)} />
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.panel,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  addBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    minHeight: 46, paddingVertical: 10, paddingLeft: 38, paddingRight: 12, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inset, color: Colors.text1, fontSize: FontSize.base,
  },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  listHeader: { gap: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  cardTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingHorizontal: Spacing.sm, borderRadius: Radius.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendName: { flex: 1, color: Colors.text1, fontSize: FontSize.base, fontWeight: '600' },
  legendPct: { color: Colors.text2, fontSize: FontSize.base, width: 40, textAlign: 'right' },
  legendVal: { color: Colors.text1, fontSize: FontSize.base, fontWeight: '800', minWidth: 74, textAlign: 'right' },
  miniBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  valueHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginTop: Spacing.sm },
  bigValue: { flex: 1, color: Colors.text1, fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.3 },
  gainPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill },
  gainText: { fontSize: FontSize.sm, fontWeight: '800' },
  emptyCard: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800' },
  emptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center' },
  card: { gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  actionsRow: { flexDirection: 'row', gap: 0 },
  name: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  metaText: { color: Colors.text2, fontSize: FontSize.sm },
  valuesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, gap: Spacing.sm },
  valueCol: { flex: 1, flexShrink: 1 },
  valueLabel: { fontSize: FontSize.xs, color: Colors.text2, marginBottom: 2 },
  valueAmt: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text1 },
  notes: { fontSize: FontSize.sm, color: Colors.text2, marginTop: Spacing.sm, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  pendingCard: { gap: Spacing.sm, backgroundColor: Colors.yellowBg, borderColor: Colors.yellow + '55' },
  noteTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  noteText: { color: Colors.text2, fontSize: FontSize.sm, lineHeight: 18 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.md },
  statusText: { flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  linkCard: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accentGlow },
  linkTitle: { flex: 1, color: Colors.text1, fontWeight: '800', fontSize: FontSize.base },
  linkSub: { color: Colors.text2, fontSize: FontSize.sm },
  payHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  seeAll: { minHeight: 44, justifyContent: 'center' },
  payAll: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base },
  payHeading: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  payEmpty: { color: Colors.text2, fontSize: FontSize.base },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 48, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  payDate: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  payAmt: { fontWeight: '800', fontSize: FontSize.base },
  payMeta: { color: Colors.text2, fontSize: FontSize.sm },
  typeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md,
    backgroundColor: Colors.panel, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  label: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text2, marginBottom: 6 },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: Colors.text1 },
}));
