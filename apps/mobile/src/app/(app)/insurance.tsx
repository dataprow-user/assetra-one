import RecordSheet from '../../components/RecordSheet';
import TransactionFormModal from '../../components/TransactionFormModal';
import PolicyFormModal from '../../components/entity/PolicyFormModal';
import { useTxnExplorer } from '../../components/TxnExplorer';
import LinkPaymentsSheet from '../../components/LinkPaymentsSheet';
import UnlinkedPaymentsSheet, { unlinkedPayments } from '../../components/UnlinkedPayments';
import { policyStatus, categoriesTracking } from '../../utils/entities';
import React, { useState } from 'react';
import { View, FlatList, Pressable, Alert } from 'react-native';
import { Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Plus, Edit2, Trash2, CheckCircle2, Clock, ChevronRight } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Button, Badge, EmptyState, ScreenHeader, PageHero, FilterChips, Tap } from '../../components/ui';
import type { ChipOption } from '../../components/ui';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';

// Ported from apps/web/src/pages/Insurance.jsx. Premium payments are linked to policies through transactions;
// each policy's next-due date is derived from them (policyStatus).
const INS_TYPES = ['life', 'health', 'vehicle', 'term'];
const INS_COLORS: Record<string, string> = { get life() { return Colors.blue; }, get health() { return Colors.green; }, get vehicle() { return Colors.yellow; }, get term() { return Colors.accentLight; } };

const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function Insurance() {
  const { state, dispatch, fmt } = useApp();
  const { insurance = [], transactions = [] } = state;
  const st = (p: any) => policyStatus(p, transactions);
  const [detail, setDetail] = useState<any>(null);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [payForm, setPayForm] = useState<any>(null);
  const [showUnlinked, setShowUnlinked] = useState(false);
  const [linkFor, setLinkFor] = useState<any>(null);
  const explorer = useTxnExplorer();
  const pendingPayments = unlinkedPayments(state, 'insurance');

  const openAdd = () => setModal({ mode: 'add' });
  const openEdit = (p: any) => setModal({ mode: 'edit', data: p });

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
  const withStatus = insurance.map((p: any) => ({ p, s: st(p) }));
  const upcoming = withStatus.filter((x: any) => x.s.daysToDue !== undefined && x.s.daysToDue >= 0).map((x: any) => x.s.daysToDue as number);
  const nextDueDays = upcoming.length ? Math.min(...upcoming) : null;
  const hasOverdue = withStatus.some((x: any) => x.s.dueState === 'overdue');
  const nextDueText = nextDueDays !== null ? (nextDueDays === 0 ? 'Today' : `${nextDueDays} day${nextDueDays === 1 ? '' : 's'}`) : hasOverdue ? 'Overdue' : '—';

  const [filterType, setFilterType] = useState('all');
  const typeKeys = Array.from(new Set([...INS_TYPES, ...insurance.map((p: any) => String(p.type || '')).filter(Boolean)]));
  const chipOptions: ChipOption[] = [
    { key: 'all', label: 'All', count: insurance.length },
    ...typeKeys
      .map((t) => ({ key: t, label: typeLabel(t), color: INS_COLORS[t] || Colors.text2, count: insurance.filter((p: any) => p.type === t).length }))
      .filter((o) => o.count > 0 || o.key === filterType),
  ];
  const sorted = [...insurance]
    .filter((p: any) => filterType === 'all' || p.type === filterType)
    .sort((x: any, y: any) => {
      const nx = st(x).nextDue, ny = st(y).nextDue;
      const dx = nx ? +new Date(nx) : Infinity;
      const dy = ny ? +new Date(ny) : Infinity;
      return dx === dy ? 0 : dx < dy ? -1 : 1;
    });

  const header = (
    <View style={styles.listHeader}>
      {pendingPayments.length > 0 ? (
        <Card style={styles.pendingCard}>
          <Text style={styles.noteTitle}>{pendingPayments.length} payment{pendingPayments.length === 1 ? '' : 's'} need a policy</Text>
          <Text style={styles.noteText}>They're recorded under a category that tracks insurance, but I can't tell which policy they paid. Assign them so each policy's due date is right, or mark them "Not a premium".</Text>
          <Button title="Review & assign" size="sm" onPress={() => setShowUnlinked(true)} />
        </Card>
      ) : null}
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

      <FlatList extraData={[fmt, filterType, transactions]}
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
          const ps = st(p);
          const color = INS_COLORS[p.type] || Colors.text2;
          const chipColor = ps.dueState === 'paid' ? Colors.green : ps.dueState === 'overdue' ? Colors.yellow : Colors.text2;
          const dueLabel = ps.dueState === 'paid' ? `Premium paid • next due ${ps.nextDue}`
            : ps.dueState === 'overdue' ? `Overdue since ${ps.nextDue} — no payment recorded yet`
            : ps.dueState === 'upcoming' ? `Due ${ps.daysToDue === 0 ? 'today' : `in ${ps.daysToDue} day${ps.daysToDue === 1 ? '' : 's'}`} • ${ps.nextDue}`
            : 'No due date set';
          return (
            <Tap onPress={() => setDetail(p)} accessibilityLabel={`${p.name}, ${typeLabel(String(p.type || ''))} policy, premium ${fmt(p.premium)} ${String(p.frequency || '').replace(/_/g, ' ')}, ${dueLabel}. Tap for details`}>
              <Card style={[styles.policyCard, { borderLeftWidth: 4, borderLeftColor: color }]}>
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

                <View style={[styles.statusChip, { backgroundColor: ps.dueState === 'paid' ? Colors.greenBg : ps.dueState === 'overdue' ? Colors.yellowBg : Colors.panelHover }]}>
                  {ps.dueState === 'paid' ? <CheckCircle2 size={15} color={chipColor} /> : <Clock size={15} color={chipColor} />}
                  <Text style={[styles.statusText, { color: chipColor }]}>{dueLabel}</Text>
                </View>
              </Card>
            </Tap>
          );
        }}
      />

      <PolicyFormModal
        visible={!!modal}
        entity={modal?.mode === 'edit' ? modal.data : undefined}
        onClose={() => setModal(null)}
      />
      {(() => {
        const p = detail ? insurance.find((x: any) => x.id === detail.id) : null;
        if (!p) return null;
        const s = st(p);
        const insCat = categoriesTracking(state, 'insurance').find((x) => x.txnType === 'expense')?.cat;
        const startPay = () => setPayForm({
          type: 'expense', category: insCat?.name || '', group: insCat?.group || '', subcategory: p.subName || '',
          policyId: p.id, amount: String(p.premium || ''), notes: p.name,
        });
        return (
          <RecordSheet
            visible title={p.name} subtitle={`${String(p.type || '').replace(/_/g, ' ')} insurance`}
            headlineLabel={`Premium (${String(p.frequency || 'per term').replace(/_/g, ' ')})`} headline={fmt(p.premium)}
            rows={[
              ['Policy number', p.policyNo],
              ['Sum assured', p.sumAssured ? fmt(p.sumAssured) : undefined],
              ['Premium frequency', p.frequency ? typeLabel(String(p.frequency)) : undefined],
              ['Next due date', s.nextDue],
              ['Status', s.dueState === 'overdue' ? `Overdue since ${s.nextDue}` : s.dueState === 'paid' ? 'Premium paid' : s.daysToDue === undefined ? undefined : s.daysToDue === 0 ? 'Due today' : `Due in ${s.daysToDue} day${s.daysToDue === 1 ? '' : 's'}`],
              ['Last paid', s.lastPaid],
              [`Total paid since ${s.asOf}`, s.payments.length ? fmt(s.paidTotal) : undefined],
              ['Earlier payments (not counted)', s.earlierCount ? `${s.earlierCount} • ${fmt(s.earlierTotal)} — before ${s.asOf}` : undefined],
            ]}
            onClose={() => setDetail(null)}
            onEdit={() => { setDetail(null); setTimeout(() => openEdit(p), 250); }}
            onDelete={() => { setDetail(null); setTimeout(() => handleDelete(p.id), 250); }}
          >
            {insCat ? (
              <Button title="Record premium payment" icon={<Plus size={16} color="#fff" />} onPress={startPay} />
            ) : (
              <Text style={styles.payEmpty}>To record premiums here, open Categories and choose which expense category tracks insurance.</Text>
            )}

            {s.earlierCount > 0 && !p.earlierOk ? (
              <View style={styles.linkCard}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                  <Clock size={16} color={Colors.accentLight} />
                  <Text style={styles.linkTitle}>{s.earlierCount} payment{s.earlierCount === 1 ? '' : 's'} ({fmt(s.earlierTotal)}) dated before the due date was set</Text>
                </View>
                <Text style={styles.linkSub}>The due date you entered is as of {s.asOf}. Was it the date <Text style={{ fontWeight: '800', color: Colors.text1 }}>before</Text> these payments (count them), or already <Text style={{ fontWeight: '800', color: Colors.text1 }}>after</Text> them (leave them out)?</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Button title="Count them" size="sm" style={{ flex: 1 }}
                    onPress={() => dispatch({ type: 'UPDATE_INSURANCE', payload: { ...p, nextDueAsOf: s.earlierFrom || p.nextDueAsOf } })} />
                  <Button title="Already included" variant="secondary" size="sm" style={{ flex: 1 }}
                    onPress={() => dispatch({ type: 'UPDATE_INSURANCE', payload: { ...p, earlierOk: true } })} />
                </View>
              </View>
            ) : null}

            <View style={styles.payHeadRow}>
              <Text style={styles.payHeading}>Premium payments since {s.asOf}</Text>
              <Pressable onPress={() => setLinkFor(p)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Link a payment to this policy">
                <Text style={styles.payAll}>+ Link</Text>
              </Pressable>
              {s.payments.length > 0 ? (
                <Pressable onPress={() => explorer.show(`${p.name} — premiums`, s.payments, `Since ${s.asOf} • ${fmt(s.paidTotal)} paid`)} hitSlop={8} style={styles.seeAll} accessibilityRole="button" accessibilityLabel={`See all premium payments for ${p.name}`}>
                  <Text style={styles.payAll}>See all ›</Text>
                </Pressable>
              ) : null}
            </View>
            {s.payments.length === 0 ? (
              <Text style={styles.payEmpty}>No premium payments linked yet. Record a premium (or choose this policy when adding an expense) and the next due date will move forward automatically.</Text>
            ) : s.payments.slice(0, 12).map((t: any) => (
              <Pressable key={t.id} onPress={() => explorer.showTxn(t)} style={styles.payRow} accessibilityRole="button"
                accessibilityLabel={`Premium of ${fmt(t.amount)} on ${String(t.date).slice(0, 10)}. Tap for the transaction`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payDate}>{String(t.date).slice(0, 10)}</Text>
                </View>
                <Text style={styles.payAmt}>{fmt(t.amount)}</Text>
                <ChevronRight size={16} color={Colors.text3} />
              </Pressable>
            ))}
          </RecordSheet>
        );
      })()}
      {payForm && <TransactionFormModal visible mode="add" initial={payForm} onClose={() => setPayForm(null)} />}
      {explorer.node}
      <LinkPaymentsSheet kind="insurance" entity={linkFor} visible={!!linkFor} onClose={() => setLinkFor(null)} />
      <UnlinkedPaymentsSheet kind="insurance" visible={showUnlinked} onClose={() => setShowUnlinked(false)} />
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  listHeader: { gap: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  miniBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  statCol: { flex: 1, flexShrink: 1 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.md },
  statusText: { flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  pendingCard: { gap: Spacing.sm, backgroundColor: Colors.yellowBg, borderColor: Colors.yellow + '55' },
  noteTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  noteText: { color: Colors.text2, fontSize: FontSize.sm, lineHeight: 18 },
  linkCard: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accentGlow },
  linkTitle: { flex: 1, color: Colors.text1, fontWeight: '800', fontSize: FontSize.base },
  linkSub: { color: Colors.text2, fontSize: FontSize.sm },
  payHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  seeAll: { minHeight: 44, justifyContent: 'center' },
  payAll: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base },
  payHeading: { flex: 1, color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  payEmpty: { color: Colors.text2, fontSize: FontSize.base },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 48, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  payDate: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  payAmt: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.base },
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
}));
