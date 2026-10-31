import RecordSheet from '../../components/RecordSheet';
import React, { useState, useMemo } from 'react';
import { View, FlatList, Pressable, Alert } from 'react-native';
import { Text, TextInput } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Plus, Edit2, Trash2, Settings2, Info, Search } from 'lucide-react-native';
import { useApp, DEFAULT_ASSET_TYPES } from '../../context/AppContext';
import { Card, Button, EmptyState, AppModal, FormField, SelectField, ScreenHeader, Badge, PageHero, FilterChips, Tap } from '../../components/ui';
import type { ChipOption } from '../../components/ui';
import Donut, { CHART_COLORS, Slice } from '../../components/charts/Donut';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_NOTES_LENGTH, sanitizeNumericInput } from '../../utils/validation';

// Ported from apps/web/src/pages/Assets.jsx. The web version has a
// table/by-type dual view — on mobile a single scrollable card list carries
// the same info more comfortably, so that's the only list mode here.

const TYPE_UNIT: Record<string, string> = {
  gold: 'grams', mutual_fund: 'units', stock: 'shares', fd: 'months', pf: '₹ balance',
  nps: '₹ balance', property: 'sqft', crypto: 'coins', other: 'units',
};

const getSwatches = () => [Colors.accent, Colors.green, Colors.red, Colors.yellow, Colors.blue, Colors.accent2, '#f97316', '#06b6d4'];

const getTypeMap = (types: any[]) => {
  const labels: Record<string, string> = {}, colors: Record<string, string> = {};
  types.forEach((t) => { labels[t.key] = t.label; colors[t.key] = t.color; });
  return { labels, colors };
};

const emptyForm = () => ({ name: '', type: 'gold', quantity: '', unit: 'grams', purchasePrice: '', currentPrice: '', notes: '' });
const emptyType = () => ({ label: '', color: Colors.accent });

const NUMERIC_RULES = {
  quantity: { label: 'Quantity', min: 0 },
  purchasePrice: { label: 'Purchase Price', min: 0 },
  currentPrice: { label: 'Current Price', min: 0 },
};

export default function Assets() {
  const { state, dispatch, uid, fmt, fmtSigned, fmtN } = useApp();
  const { assets = [] } = state;
  const assetTypes = state.assetTypes && state.assetTypes.length > 0 ? state.assetTypes : DEFAULT_ASSET_TYPES;
  const { labels: TYPE_LABELS, colors: TYPE_COLORS } = getTypeMap(assetTypes);

  const [detail, setDetail] = useState<any>(null);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [typeModal, setTypeModal] = useState<any>(null); // null | 'manage' | { mode, data? }
  const [form, setForm] = useState<any>(emptyForm());
  const [typeForm, setTypeForm] = useState<any>(emptyType());
  const { errors, validate, reset: resetErrors } = useFieldErrors();

  // ── Search + type filter ──
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const filteredAssets = useMemo(() => assets.filter((a: any) => {
    const matchesSearch = !search.trim() || a.name?.toLowerCase().includes(search.trim().toLowerCase());
    const matchesType = !filterType || a.type === filterType;
    return matchesSearch && matchesType;
  }), [assets, search, filterType]);

  const openAdd = () => { setForm(emptyForm()); resetErrors(); setModal({ mode: 'add' }); };
  const openEdit = (a: any) => {
    setForm({
      ...a,
      quantity: String(a.quantity ?? ''),
      purchasePrice: String(a.purchasePrice ?? a.avgPrice ?? ''),
      currentPrice: String(a.currentPrice ?? ''),
      notes: a.notes || '',
    });
    resetErrors();
    setModal({ mode: 'edit', data: a });
  };

  const onTypeChange = (v: string) => setForm((f: any) => ({ ...f, type: v, unit: TYPE_UNIT[v] || 'units' }));

  const setQuantity = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('quantity', val, NUMERIC_RULES.quantity);
    setForm((f: any) => ({ ...f, quantity: val }));
  };
  const setPurchasePrice = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('purchasePrice', val, NUMERIC_RULES.purchasePrice);
    setForm((f: any) => ({ ...f, purchasePrice: val }));
  };
  const setCurrentPrice = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('currentPrice', val, NUMERIC_RULES.currentPrice);
    setForm((f: any) => ({ ...f, currentPrice: val }));
  };

  const handleSubmit = () => {
    const qErr = validate('quantity', form.quantity, NUMERIC_RULES.quantity);
    const pErr = validate('purchasePrice', form.purchasePrice, NUMERIC_RULES.purchasePrice);
    const cErr = validate('currentPrice', form.currentPrice, NUMERIC_RULES.currentPrice);
    if (qErr || pErr || cErr) return;
    if (!form.name.trim()) return;

    const qty = Number(form.quantity), buy = Number(form.purchasePrice), curr = Number(form.currentPrice);
    const payload = { ...form, quantity: qty, purchasePrice: buy, currentPrice: curr, avgPrice: buy };
    if (modal?.mode === 'add') dispatch({ type: 'ADD_ASSET', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_ASSET', payload: { ...payload, id: modal!.data.id } });
    setModal(null);
  };

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

  // ── Value calculations ──
  const getValues = (a: any) => {
    const buy = Number(a.purchasePrice ?? a.avgPrice ?? 0) || 0;
    const curr = Number(a.currentPrice ?? 0) || 0;
    const qty = Number(a.quantity) || 0;
    return { invested: qty * buy, current: qty * curr, buy, curr, qty };
  };
  const totalPurchase = assets.reduce((s: number, a: any) => s + getValues(a).invested, 0);
  const totalCurrent = assets.reduce((s: number, a: any) => s + getValues(a).current, 0);
  const totalGain = totalCurrent - totalPurchase;

  const liveQty = Number(form.quantity) || 0, liveBuy = Number(form.purchasePrice) || 0, liveCurr = Number(form.currentPrice) || 0;
  const liveCost = liveQty * liveBuy, liveVal = liveQty * liveCurr, liveGain = liveVal - liveCost;

  const gainPctTotal = totalPurchase > 0 ? (totalGain / totalPurchase) * 100 : 0;

  const byType = assetTypes.map((t: any) => {
    const items = assets.filter((a: any) => a.type === t.key);
    return { key: t.key as string, label: t.label as string, color: (t.color || Colors.accent) as string, count: items.length, value: items.reduce((s: number, a: any) => s + getValues(a).current, 0) };
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
          const { invested, current, buy, curr } = getValues(a);
          const gain = current - invested;
          const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
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

                {a.notes ? <Text style={styles.notes} numberOfLines={2}>{a.notes}</Text> : null}
              </Card>
            </Tap>
          );
        }}
      />

      {/* Add/Edit Asset Modal */}
      {modal && (
        <AppModal
          visible
          title={modal.mode === 'add' ? 'Add Asset' : 'Edit Asset'}
          onClose={() => setModal(null)}
          footer={
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
              <Button title={modal.mode === 'add' ? 'Add Asset' : 'Update'} onPress={handleSubmit} style={{ flex: 1 }} />
            </View>
          }
        >
          <View style={styles.helpBox}>
            <Info size={14} color={Colors.accentLight} />
            <Text style={styles.helpText}>
              <Text style={{ fontWeight: '700' }}>Purchase Price</Text> = what you paid per unit.{' '}
              <Text style={{ fontWeight: '700' }}>Current Price</Text> = today's market price. Gain/Loss is auto-calculated.
            </Text>
          </View>

          <FormField label="Asset Name" value={form.name} onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))}
            maxLength={MAX_NAME_LENGTH} placeholder="e.g. 22K Gold, Axis Bluechip" />
          <SelectField label="Asset Type" value={form.type} onChange={onTypeChange}
            options={assetTypes.map((t: any) => ({ label: t.label, value: t.key }))} />
          <FormField label="Quantity" hint="(how many you own)" keyboardType="decimal-pad" value={form.quantity}
            onChangeText={setQuantity} error={errors.quantity} placeholder="e.g. 10" />
          <FormField label="Unit" hint="(grams / shares / units)" value={form.unit}
            onChangeText={(v) => setForm((f: any) => ({ ...f, unit: v }))} maxLength={MAX_SHORT_LENGTH} placeholder="e.g. grams" />
          <FormField label="Purchase Price ₹" hint="(per unit, what you paid)" keyboardType="decimal-pad" value={form.purchasePrice}
            onChangeText={setPurchasePrice} error={errors.purchasePrice} placeholder="0" />
          <FormField label="Current Price ₹" hint="(per unit, today)" keyboardType="decimal-pad" value={form.currentPrice}
            onChangeText={setCurrentPrice} error={errors.currentPrice} placeholder="0" />

          {(liveBuy > 0 || liveCurr > 0) && (
            <View style={styles.calcPreview}>
              <View style={styles.calcItem}>
                <Text style={styles.calcLabel}>Total Invested</Text>
                <Text style={[styles.calcValue, { color: Colors.text2 }]}>{fmt(liveCost)}</Text>
              </View>
              <View style={styles.calcItem}>
                <Text style={styles.calcLabel}>Current Value</Text>
                <Text style={[styles.calcValue, { color: Colors.green }]}>{fmt(liveVal)}</Text>
              </View>
              <View style={styles.calcItem}>
                <Text style={styles.calcLabel}>Gain / Loss</Text>
                <Text style={[styles.calcValue, { color: liveGain >= 0 ? Colors.green : Colors.red }]}>
                  {liveGain >= 0 ? '+' : ''}{fmtSigned(liveGain)}
                </Text>
              </View>
            </View>
          )}

          <FormField label="Notes" hint="(optional)" value={form.notes} onChangeText={(v) => setForm((f: any) => ({ ...f, notes: v }))}
            maxLength={MAX_NOTES_LENGTH} placeholder="e.g. SBI FD maturing Dec 2025" />

        </AppModal>
      )}

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
        const { invested, current, buy, curr } = getValues(a);
        const gain = current - invested;
        const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
        return (
          <RecordSheet
            visible title={a.name} subtitle={TYPE_LABELS[a.type] || a.type}
            headlineLabel="Current value" headline={fmt(current)}
            rows={[
              ['Amount invested', fmt(invested)],
              ['Gain / loss', `${gain >= 0 ? '+' : ''}${fmtSigned(gain)} (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)`],
              ['Quantity', `${fmtN(a.quantity)} ${a.unit || 'units'}`],
              ['Average buy price', fmt(buy)],
              ['Current price', fmt(curr)],
              ['Notes', a.notes],
            ]}
            onClose={() => setDetail(null)}
            onEdit={() => { setDetail(null); setTimeout(() => openEdit(a), 250); }}
            onDelete={() => { setDetail(null); setTimeout(() => handleDelete(a.id), 250); }}
          />
        );
      })()}
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
  helpBox: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: Colors.panel,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  helpText: { flex: 1, color: Colors.text2, fontSize: FontSize.sm, lineHeight: 18 },
  calcPreview: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.inset,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  calcItem: { flex: 1, alignItems: 'center', gap: 2 },
  calcLabel: { fontSize: FontSize.xs, color: Colors.text2 },
  calcValue: { fontSize: FontSize.md, fontWeight: '700' },
  typeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md,
    backgroundColor: Colors.panel, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  label: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text2, marginBottom: 6 },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: Colors.text1 },
}));
