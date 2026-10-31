import RecordSheet from '../../components/RecordSheet';
import React, { useState } from 'react';
import { View, FlatList, Pressable, Alert } from 'react-native';
import { Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Button, Badge, EmptyState, AppModal, FormField, SelectField, DateField, ScreenHeader, PageHero, FilterChips, Tap } from '../../components/ui';
import type { ChipOption } from '../../components/ui';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_AMOUNT, sanitizeNumericInput } from '../../utils/validation';

// Ported from apps/web/src/pages/Insurance.jsx — same field set, same
// day-count/badge logic for renewal reminders.
const INS_TYPES = ['life', 'health', 'vehicle', 'term'];
const INS_COLORS: Record<string, string> = { get life() { return Colors.blue; }, get health() { return Colors.green; }, get vehicle() { return Colors.yellow; }, get term() { return Colors.accentLight; } };
const FREQUENCIES = [{ label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' }];

const emptyForm = () => ({ name: '', type: 'term', policyNo: '', premium: '', frequency: 'yearly', sumAssured: '', nextDue: '' });

const PREMIUM_RULE = { label: 'Premium Amount', min: 1, max: MAX_AMOUNT };
const SUM_ASSURED_RULE = { label: 'Sum Assured', min: 0, max: MAX_AMOUNT, required: false };

const getDaysLeft = (dateStr: string) => {
  if (!dateStr) return null;
  return Math.ceil((+new Date(dateStr) - +new Date()) / 86400000);
};

export default function Insurance() {
  const { state, dispatch, uid, fmt, fmtSigned, fmtN } = useApp();
  const { insurance = [] } = state;
  const [detail, setDetail] = useState<any>(null);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [form, setForm] = useState(emptyForm());
  const { errors, validate, reset: resetErrors } = useFieldErrors();

  const openAdd = () => { setForm(emptyForm()); resetErrors(); setModal({ mode: 'add' }); };
  const openEdit = (p: any) => { setForm({ ...p, premium: String(p.premium ?? ''), sumAssured: String(p.sumAssured ?? '') }); resetErrors(); setModal({ mode: 'edit', data: p }); };

  const setPremium = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('premium', val, PREMIUM_RULE);
    setForm((f) => ({ ...f, premium: val }));
  };
  const setSumAssured = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('sumAssured', val, SUM_ASSURED_RULE);
    setForm((f) => ({ ...f, sumAssured: val }));
  };

  const handleSubmit = () => {
    const premiumErr = validate('premium', form.premium, PREMIUM_RULE);
    const sumErr = validate('sumAssured', form.sumAssured, SUM_ASSURED_RULE);
    if (premiumErr || sumErr) return;
    if (!form.name.trim()) return;

    const payload = { ...form, premium: Number(form.premium), sumAssured: Number(form.sumAssured || 0) };
    if (modal?.mode === 'add') dispatch({ type: 'ADD_INSURANCE', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_INSURANCE', payload: { ...payload, id: modal!.data.id } });
    setModal(null);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete this policy?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_INSURANCE', payload: id }) },
    ]);
  };

  const annualOf = (p: any) => {
    const f = String(p.frequency || '').toLowerCase().replace(/[\s-]/g, '_');
    const mult = f === 'monthly' ? 12 : f === 'quarterly' ? 4 : f === 'half_yearly' || f === 'halfyearly' ? 2 : 1;
    return Number(p.premium || 0) * mult;
  };
  const totalAnnual = insurance.reduce((s: number, p: any) => s + annualOf(p), 0);
  const totalCover = insurance.reduce((s: number, p: any) => s + Number(p.sumAssured || 0), 0);
  const withDays = insurance.map((p: any) => ({ p, days: getDaysLeft(p.nextDue) }));
  const upcoming = withDays.filter((x) => x.days !== null && x.days >= 0).map((x) => x.days as number);
  const nextDueDays = upcoming.length ? Math.min(...upcoming) : null;
  const hasOverdue = withDays.some((x) => x.days !== null && x.days < 0);
  const nextDueText = nextDueDays !== null ? (nextDueDays === 0 ? 'Today' : `${nextDueDays} day${nextDueDays === 1 ? '' : 's'}`) : hasOverdue ? 'Overdue' : '—';

  const [filterType, setFilterType] = useState('all');
  const typeKeys = Array.from(new Set([...INS_TYPES, ...insurance.map((p: any) => String(p.type || '')).filter(Boolean)]));
  const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const chipOptions: ChipOption[] = [
    { key: 'all', label: 'All', count: insurance.length },
    ...typeKeys
      .map((t) => ({ key: t, label: typeLabel(t), color: INS_COLORS[t] || Colors.text2, count: insurance.filter((p: any) => p.type === t).length }))
      .filter((o) => o.count > 0 || o.key === filterType),
  ];
  const sorted = [...insurance]
    .filter((p: any) => filterType === 'all' || p.type === filterType)
    .sort((x: any, y: any) => {
      const dx = x.nextDue ? +new Date(x.nextDue) : Infinity;
      const dy = y.nextDue ? +new Date(y.nextDue) : Infinity;
      return dx === dy ? 0 : dx < dy ? -1 : 1;
    });

  const header = (
    <View style={styles.listHeader}>
      <PageHero
        label="Annual premium"
        value={fmt(totalAnnual)}
        sub={insurance.length === 0 ? 'No policies tracked yet' : `Total cover ${fmt(totalCover)} across ${insurance.length} ${insurance.length === 1 ? 'policy' : 'policies'}`}
        stats={[
          { label: 'Policies', value: String(insurance.length) },
          { label: 'Total cover', value: fmt(totalCover) },
          { label: 'Next due', value: nextDueText },
        ]}
      />
      {insurance.length > 0 ? <FilterChips options={chipOptions} value={filterType} onChange={setFilterType} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Insurance Policies"
          showBack
          right={<Button title="Add" icon={<Plus size={16} color="#fff" />} size="sm" onPress={openAdd} />}
        />
      </View>

      <FlatList extraData={[fmt, filterType]}
        data={sorted}
        keyExtractor={(p: any) => p.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={header}
        ListEmptyComponent={
          insurance.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: Colors.blueBg }]}><Shield size={26} color={Colors.blue} /></View>
              <Text style={styles.emptyTitle}>No policies yet</Text>
              <Text style={styles.emptyText}>Add life, health, vehicle or term policies and never miss a renewal.</Text>
              <Button title="Add your first policy" icon={<Plus size={16} color="#fff" />} onPress={openAdd} />
            </Card>
          ) : (
            <EmptyState icon={Shield} title="No policies of this type" description="Pick another filter above." />
          )
        }
        renderItem={({ item: p }: { item: any }) => {
          const daysLeft = getDaysLeft(p.nextDue);
          const color = INS_COLORS[p.type] || Colors.text2;
          const dueColor = daysLeft === null ? Colors.text2 : daysLeft < 0 ? Colors.red : daysLeft <= 7 ? Colors.red : daysLeft <= 30 ? Colors.yellow : Colors.green;
          const dueLabel = daysLeft === null ? 'No date' : daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
          return (
            <Tap onPress={() => setDetail(p)} accessibilityLabel={`${p.name}, ${typeLabel(String(p.type || ''))} policy, premium ${fmt(p.premium)} ${p.frequency || ''}, ${dueLabel}. Tap for details`}>
              <Card style={[styles.policyCard, { borderLeftWidth: 4, borderLeftColor: dueColor }]}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text style={styles.policyName} numberOfLines={1}>{p.name}</Text>
                    {p.policyNo ? <Text style={styles.policyNo} numberOfLines={1}>{p.policyNo}</Text> : null}
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => openEdit(p)} hitSlop={8} style={styles.miniBtn} accessibilityRole="button" accessibilityLabel={`Edit ${p.name}`}><Edit2 size={16} color={Colors.text2} /></Pressable>
                    <Pressable onPress={() => handleDelete(p.id)} hitSlop={8} style={styles.miniBtn} accessibilityRole="button" accessibilityLabel={`Delete ${p.name}`}><Trash2 size={16} color={Colors.red} /></Pressable>
                  </View>
                </View>

                <View style={styles.badgeRow}>
                  <Badge label={typeLabel(String(p.type || ''))} color={color} />
                  <Badge label={typeLabel(String(p.frequency || ''))} color={Colors.text2} />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Premium</Text>
                    <Text style={styles.premiumValue} numberOfLines={1} adjustsFontSizeToFit>{fmt(p.premium)}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Sum assured</Text>
                    <Text style={styles.sumValue} numberOfLines={1} adjustsFontSizeToFit>{fmt(p.sumAssured)}</Text>
                  </View>
                </View>

                <View style={styles.dueRow}>
                  <View style={[styles.dueBadge, { backgroundColor: dueColor + '1f' }]}>
                    <Text style={[styles.dueBadgeText, { color: dueColor }]} numberOfLines={1}>{dueLabel}</Text>
                  </View>
                  {p.nextDue ? <Text style={styles.dueDate} numberOfLines={1}>Next due {p.nextDue}</Text> : null}
                </View>
              </Card>
            </Tap>
          );
        }}
      />

      {modal && (
        <AppModal
          visible
          title={modal.mode === 'add' ? 'Add Insurance Policy' : 'Edit Policy'}
          onClose={() => setModal(null)}
          footer={
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
              <Button title={modal.mode === 'add' ? 'Add Policy' : 'Update'} onPress={handleSubmit} style={{ flex: 1 }} />
            </View>
          }
        >
          <FormField label="Policy Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} maxLength={MAX_NAME_LENGTH} placeholder="e.g. LIC Term Plan" />
          <SelectField label="Type" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={INS_TYPES.map((t) => ({ label: t, value: t }))} />
          <FormField label="Policy Number" value={form.policyNo} onChangeText={(v) => setForm((f) => ({ ...f, policyNo: v }))} maxLength={MAX_SHORT_LENGTH} placeholder="LIC-XXXXX" />
          <FormField label="Premium Amount (₹)" keyboardType="numbers-and-punctuation" value={form.premium} onChangeText={setPremium} error={errors.premium} placeholder="0" />
          <SelectField label="Frequency" value={form.frequency} onChange={(v) => setForm((f) => ({ ...f, frequency: v }))} options={FREQUENCIES} />
          <FormField label="Sum Assured (₹)" keyboardType="numbers-and-punctuation" value={form.sumAssured} onChangeText={setSumAssured} error={errors.sumAssured} placeholder="0" />
          <DateField label="Next Due Date" value={form.nextDue} onChange={(v) => setForm((f) => ({ ...f, nextDue: v }))} />
        </AppModal>
      )}
      {(() => {
        const p = detail ? insurance.find((x: any) => x.id === detail.id) : null;
        if (!p) return null;
        const dl = getDaysLeft(p.nextDue);
        return (
          <RecordSheet
            visible title={p.name} subtitle={`${String(p.type || '').replace(/_/g, ' ')} insurance`}
            headlineLabel={`Premium (${p.frequency || 'per term'})`} headline={fmt(p.premium)}
            rows={[
              ['Policy number', p.policyNo],
              ['Sum assured', p.sumAssured ? fmt(p.sumAssured) : undefined],
              ['Premium frequency', p.frequency],
              ['Next due date', p.nextDue],
              ['Due in', dl === null ? undefined : dl < 0 ? `Overdue by ${-dl} day${-dl === 1 ? '' : 's'}` : dl === 0 ? 'Today' : `${dl} day${dl === 1 ? '' : 's'}`],
            ]}
            onClose={() => setDetail(null)}
            onEdit={() => { setDetail(null); setTimeout(() => openEdit(p), 250); }}
            onDelete={() => { setDetail(null); setTimeout(() => handleDelete(p.id), 250); }}
          />
        );
      })()}
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  listHeader: { gap: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  miniBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  statCol: { flex: 1, flexShrink: 1 },
  dueBadge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: Radius.pill },
  dueBadgeText: { fontSize: FontSize.sm, fontWeight: '800' },
  emptyCard: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800' },
  emptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center' },
  policyCard: { gap: Spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  policyName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  policyNo: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 0 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  statLabel: { fontSize: FontSize.sm, color: Colors.text2 },
  premiumValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.red, marginTop: 2 },
  sumValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text1, marginTop: 2 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  dueDate: { fontSize: FontSize.sm, color: Colors.text2 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
}));
