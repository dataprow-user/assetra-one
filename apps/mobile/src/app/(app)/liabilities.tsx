import RecordSheet from '../../components/RecordSheet';
import LoanFormModal from '../../components/entity/LoanFormModal';
import TransactionFormModal from '../../components/TransactionFormModal';
import { useTxnExplorer } from '../../components/TxnExplorer';
import LinkPaymentsSheet from '../../components/LinkPaymentsSheet';
import UnlinkedPaymentsSheet, { unlinkedLoanPayments } from '../../components/UnlinkedPayments';
import { loanStatus, candidatePayments, localISO } from '../../utils/loans';
import { categoriesTracking } from '../../utils/entities';
import React, { useState } from 'react';
import { View, FlatList, Pressable, Alert } from 'react-native';
import { Text } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Plus, Edit2, Trash2, Settings2, CheckCircle2, Clock, Link2, ChevronRight } from 'lucide-react-native';
import { useApp, DEFAULT_LIABILITY_TYPES } from '../../context/AppContext';
import { Card, Button, EmptyState, AppModal, FormField, SelectField, ScreenHeader, Badge, DateField, PageHero, FilterChips, Tap } from '../../components/ui';
import type { ChipOption } from '../../components/ui';
import Ring from '../../components/charts/Ring';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_AMOUNT, MAX_RATE, MAX_TENURE_MONTHS, sanitizeNumericInput } from '../../utils/validation';

// Ported from apps/web/src/pages/Liabilities.jsx — same fields/calculations,
// rendered as cards instead of a table.

const getSwatches = () => [Colors.accent, Colors.green, Colors.red, Colors.yellow, Colors.blue, Colors.accent2, '#f97316', '#06b6d4'];

const emptyType = () => ({ label: '', color: Colors.red });

export default function Liabilities() {
  const { state, dispatch, uid, fmt, fmtSigned, fmtN } = useApp();
  const { liabilities = [], transactions = [] } = state;
  const st = (l: any) => loanStatus(l, transactions);
  const [payForm, setPayForm] = useState<any>(null);
  const explorer = useTxnExplorer();
  const [showUnlinked, setShowUnlinked] = useState(false);
  const [linkFor, setLinkFor] = useState<any>(null);
  const pendingPayments = unlinkedLoanPayments(state);
  const libTypes = state.liabilityTypes && state.liabilityTypes.length > 0 ? state.liabilityTypes : DEFAULT_LIABILITY_TYPES;

  const typeLabels: Record<string, string> = {}, typeColors: Record<string, string> = {};
  libTypes.forEach((t: any) => { typeLabels[t.key] = t.label; typeColors[t.key] = t.color; });

  const [detail, setDetail] = useState<any>(null);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [typeModal, setTypeModal] = useState<any>(null); // null | 'manage' | { mode, data? }
  const [typeForm, setTypeForm] = useState<any>(emptyType());

  const openAdd = () => setModal({ mode: 'add' });
  const openEdit = (l: any) => setModal({ mode: 'edit', data: l });

  const handleDelete = (id: string) => {
    Alert.alert('Delete this liability?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_LIABILITY', payload: id }) },
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
      dispatch({ type: 'ADD_LIABILITY_TYPE', payload: { ...typeForm, key, id: uid() } });
    } else {
      dispatch({ type: 'UPDATE_LIABILITY_TYPE', payload: { ...typeForm, id: typeModal!.data.id } });
    }
    setTypeModal('manage');
  };

  const handleDeleteType = (id: string) => {
    Alert.alert('Delete this type?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_LIABILITY_TYPE', payload: id }) },
    ]);
  };

  const totalOutstanding = liabilities.reduce((s: number, l: any) => s + st(l).outstanding, 0);
  const activeLoans = liabilities.filter((l: any) => !st(l).closed);
  const paidCount = activeLoans.filter((l: any) => st(l).paidThisMonth).length;
  const totalEmi = liabilities.reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
  const totalPrincipal = liabilities.reduce((s: number, l: any) => s + Number(l.principal || 0), 0);
  const totalRepaid = totalPrincipal - totalOutstanding;
  const overallPct = totalPrincipal > 0 ? Math.max(0, Math.min((totalRepaid / totalPrincipal) * 100, 100)) : 0;

  const [filterType, setFilterType] = useState('all');
  const shown = filterType === 'all' ? liabilities : liabilities.filter((l: any) => l.type === filterType);
  const chipOptions: ChipOption[] = [
    { key: 'all', label: 'All', count: liabilities.length },
    ...libTypes
      .map((t: any) => ({ key: t.key as string, label: t.label as string, color: t.color as string, count: liabilities.filter((l: any) => l.type === t.key).length }))
      .filter((o: any) => o.count > 0 || o.key === filterType),
  ];

  const note = state.household?.loanBackfillNote;
  const header = (
    <View style={styles.listHeader}>
      {note ? (
        <Card style={styles.noteCard}>
          <Text style={styles.noteTitle}>{note.kind === 'subs' ? 'Your loans are now sub-categories' : note.linked > 0 ? `Balances updated from ${note.linked} past EMI payment${note.linked === 1 ? '' : 's'}` : 'Loan balances are now live'}</Text>
          <Text style={styles.noteText}>
            {note.kind === 'subs'
              ? "Each loan now has its own entry in the sub-category list of the categories that track loans (like “<loan name> EMI”), replacing any generic one. Your past payments and budget lines were renamed and linked to the right loan, so nothing is lost."
              : note.linked > 0
              ? "We counted each loan's balance as of the day you added it, and matched your earlier loan/EMI expenses to the right loan. Open a loan to see its payments."
              : "No earlier loan/EMI expenses matched a loan. Record EMIs (or pick the loan when adding an expense) and the balance will drop automatically."}
            {' '}If you typed a balance later than you added the loan, edit the loan and set "Balance is as of" to that date.
          </Text>
          <Button title="Got it" size="sm" variant="secondary" onPress={() => dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { loanBackfillNote: null } })} />
        </Card>
      ) : null}
      {pendingPayments.length > 0 ? (
        <Card style={styles.pendingCard}>
          <Text style={styles.noteTitle}>{pendingPayments.length} loan payment{pendingPayments.length === 1 ? '' : 's'} need a loan</Text>
          <Text style={styles.noteText}>They're recorded under {categoriesTracking(state, 'liability').map((x) => x.cat.name).join(', ') || 'a loan category'}, but I can't tell which loan they repaid. Assign them so each loan's balance is right — or mark them “Not a loan”.</Text>
          <Button title="Review & assign" size="sm" onPress={() => setShowUnlinked(true)} />
        </Card>
      ) : null}
      <PageHero
        label="Total outstanding"
        value={fmt(totalOutstanding)}
        sub={liabilities.length === 0 ? 'No loans tracked yet' : `EMI ${fmt(totalEmi)} / month • ${paidCount} of ${activeLoans.length} paid this month • ${overallPct.toFixed(0)}% repaid`}
        stats={[
          { label: 'Principal', value: fmt(totalPrincipal) },
          { label: 'Repaid', value: fmt(totalRepaid) },
          { label: 'Monthly EMI', value: fmt(totalEmi) },
        ]}
      />
      {liabilities.length > 0 ? <FilterChips options={chipOptions} value={filterType} onChange={setFilterType} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Liabilities"
          showBack
          right={
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Pressable onPress={openTypeManager} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Manage liability types">
                <Settings2 size={18} color={Colors.text2} />
              </Pressable>
              <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add liability">
                <Plus size={20} color="#fff" />
              </Pressable>
            </View>
          }
        />
      </View>

      <FlatList extraData={[fmt, filterType]}
        data={shown}
        keyExtractor={(l: any) => l.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={header}
        ListEmptyComponent={
          liabilities.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: Colors.redBg }]}><CreditCard size={26} color={Colors.red} /></View>
              <Text style={styles.emptyTitle}>No liabilities</Text>
              <Text style={styles.emptyText}>Add home, personal or gold loans to watch your repayment progress.</Text>
              <Button title="Add your first loan" icon={<Plus size={16} color="#fff" />} onPress={openAdd} />
            </Card>
          ) : (
            <EmptyState icon={CreditCard} title="No loans of this type" description="Pick another filter above." />
          )
        }
        renderItem={({ item: l }: { item: any }) => {
          const color = typeColors[l.type] || Colors.text2;
          const s = st(l);
          const paid = Number(l.principal || 0) - s.outstanding;
          const pct = l.principal ? Math.max(0, Math.min((paid / l.principal) * 100, 100)) : 0;
          const ringColor = pct >= 75 ? Colors.green : pct >= 35 ? Colors.yellow : Colors.accentLight;
          return (
            <Tap onPress={() => setDetail(l)} accessibilityLabel={`${l.name}, ${typeLabels[l.type] || l.type}, outstanding ${fmt(s.outstanding)}, ${pct.toFixed(0)} percent repaid. Tap for details`}>
              <Card style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{l.name}</Text>
                    <Badge label={typeLabels[l.type] || l.type} color={color} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => openEdit(l)} hitSlop={8} style={styles.miniBtn} accessibilityRole="button" accessibilityLabel={`Edit ${l.name}`}><Edit2 size={16} color={Colors.text2} /></Pressable>
                    <Pressable onPress={() => handleDelete(l.id)} hitSlop={8} style={styles.miniBtn} accessibilityRole="button" accessibilityLabel={`Delete ${l.name}`}><Trash2 size={16} color={Colors.red} /></Pressable>
                  </View>
                </View>

                <View style={styles.body}>
                  <Ring pct={pct} color={ringColor} size={64} thickness={8} center={`${pct.toFixed(0)}%`} />
                  <View style={styles.figures}>
                    <Text style={styles.valueLabel}>Outstanding</Text>
                    <Text style={styles.bigValue} numberOfLines={1} adjustsFontSizeToFit>{fmt(s.outstanding)}</Text>
                    <Text style={styles.metaText} numberOfLines={1}>of {fmt(l.principal)} • {pct.toFixed(0)}% repaid</Text>
                  </View>
                </View>

                <View style={styles.valuesRow}>
                  <View style={styles.valueCol}>
                    <Text style={styles.valueLabel}>EMI</Text>
                    <Text style={[styles.valueAmt, { color: Colors.yellow }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(l.emi)}/mo</Text>
                  </View>
                  <View style={styles.valueCol}>
                    <Text style={styles.valueLabel}>Rate</Text>
                    <Text style={styles.valueAmt} numberOfLines={1}>{l.interestRate}% p.a.</Text>
                  </View>
                  <View style={styles.valueCol}>
                    <Text style={styles.valueLabel}>Tenure</Text>
                    <Text style={styles.valueAmt} numberOfLines={1}>{l.tenureMonths} mo</Text>
                  </View>
                </View>

                {s.closed ? (
                  <View style={[styles.statusChip, { backgroundColor: Colors.greenBg }]}>
                    <CheckCircle2 size={15} color={Colors.green} /><Text style={[styles.statusText, { color: Colors.green }]}>Loan fully repaid 🎉</Text>
                  </View>
                ) : s.dueState ? (
                  <View style={[styles.statusChip, { backgroundColor: s.dueState === 'paid' ? Colors.greenBg : s.dueState === 'overdue' ? Colors.yellowBg : Colors.panelHover }]}>
                    {s.dueState === 'paid' ? <CheckCircle2 size={15} color={Colors.green} /> : <Clock size={15} color={s.dueState === 'overdue' ? Colors.yellow : Colors.text2} />}
                    <Text style={[styles.statusText, { color: s.dueState === 'paid' ? Colors.green : s.dueState === 'overdue' ? Colors.yellow : Colors.text2 }]}>
                      {s.dueState === 'paid'
                        ? `This month's EMI recorded • next due ${s.dueDate}`
                        : s.dueState === 'overdue'
                          ? `EMI due ${s.dueDate} — no payment recorded yet`
                          : `EMI due ${s.daysToDue === 0 ? 'today' : `in ${s.daysToDue} day${s.daysToDue === 1 ? '' : 's'}`} • ${s.dueDate}`}
                    </Text>
                  </View>
                ) : null}
              </Card>
            </Tap>
          );
        }}
      />

      {/* Add/Edit Liability — one shared form (also opened from the transaction form) */}
      {modal && <LoanFormModal visible entity={modal.mode === 'edit' ? modal.data : undefined} onClose={() => setModal(null)} />}

      {/* Type Manager Modal */}
      {typeModal === 'manage' && (
        <AppModal visible title="Manage Liability Types" onClose={() => setTypeModal(null)}>
          <Button title="Add Type" icon={<Plus size={14} color="#fff" />} size="sm" onPress={openAddType} style={{ marginBottom: Spacing.lg, alignSelf: 'flex-start' }} />
          <View style={{ gap: Spacing.sm }}>
            {libTypes.map((t: any) => (
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
          title={typeModal.mode === 'add' ? 'Add Liability Type' : 'Edit Type'}
          onClose={() => setTypeModal('manage')}
          footer={
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setTypeModal('manage')} style={{ flex: 1 }} />
              <Button title={typeModal.mode === 'add' ? 'Add' : 'Update'} onPress={handleTypeSubmit} style={{ flex: 1 }} />
            </View>
          }
        >
          <FormField label="Type Name" value={typeForm.label} onChangeText={(v) => setTypeForm((f: any) => ({ ...f, label: v }))}
            maxLength={MAX_SHORT_LENGTH} placeholder="e.g. Business Loan" />
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
        const l = detail ? liabilities.find((x: any) => x.id === detail.id) : null;
        if (!l) return null;
        const s = st(l);
        const paid = Number(l.principal || 0) - s.outstanding;
        const pct = l.principal ? Math.max(0, Math.min((paid / l.principal) * 100, 100)) : 0;
        const linkedAsset = l.collateral ? (state.assets || []).find((a: any) => a.id === l.collateral)?.name : undefined;
        const candidates = candidatePayments(l, typeLabels[l.type], transactions, liabilities.length, liabilities);
        const candTotal = candidates.reduce((t: number, x: any) => t + Number(x.amount || 0), 0);
        const emiCat = (state.expenseCategories || []).find((c: any) => /loan.*emi|emi/i.test(c.name)) || (state.expenseCategories || []).find((c: any) => /loan/i.test(c.name));
        const emiSub = emiCat?.subcategories?.find((x: string) => x.toLowerCase() === String(typeLabels[l.type] || '').toLowerCase()) || '';
        const startPay = () => setPayForm({
          type: 'expense', amount: l.emi ? String(l.emi) : '', liabilityId: l.id, notes: `${l.name} EMI`,
          category: emiCat?.name || '', group: emiCat?.group || '', subcategory: emiSub,
        });
        return (
          <RecordSheet
            visible title={l.name} subtitle={typeLabels[l.type] || l.type}
            headlineLabel="Outstanding now" headline={fmt(s.outstanding)} headlineColor={s.closed ? Colors.green : Colors.red}
            progress={pct} progressColor={Colors.green} progressNote={`${pct.toFixed(0)}% repaid • ${fmt(paid)} of ${fmt(l.principal)}`}
            rows={[
              ['Original loan', fmt(l.principal)],
              ['Balance you entered', `${fmt(s.baseline)} (as of ${s.asOf})`],
              ['Principal repaid since', s.payments.length ? fmt(s.principalPaid) : undefined],
              ['Interest paid since', s.payments.length ? fmt(s.interestPaid) : undefined],
              ['Earlier payments (not counted)', s.earlierCount ? `${s.earlierCount} • ${fmt(s.earlierTotal)} — before ${s.asOf}` : undefined],
              ['Interest rate', l.interestRate ? `${l.interestRate}% p.a.` : undefined],
              ['Monthly EMI', l.emi ? fmt(l.emi) : undefined],
              ['Next EMI due', s.dueState === 'paid' ? `${s.dueDate} (this month paid)` : s.dueDate],
              ['Estimated months left', s.monthsLeft ? `${s.monthsLeft} months` : undefined],
              ['Tenure', l.tenureMonths ? `${l.tenureMonths} months` : undefined],
              ['Start date', l.startDate],
              ['Collateral', linkedAsset],
            ]}
            onClose={() => setDetail(null)}
            onEdit={() => { setDetail(null); setTimeout(() => openEdit(l), 250); }}
            onDelete={() => { setDetail(null); setTimeout(() => handleDelete(l.id), 250); }}
          >
            {!s.closed ? <Button title="Record EMI payment" icon={<Plus size={16} color="#fff" />} onPress={startPay} /> : null}

            {candidates.length > 0 ? (
              <View style={styles.linkCard}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                  <Link2 size={16} color={Colors.accentLight} />
                  <Text style={styles.linkTitle}>{candidates.length} earlier payment{candidates.length === 1 ? '' : 's'} look like this loan</Text>
                </View>
                <Text style={styles.linkSub}>{fmt(candTotal)} recorded as loan/EMI expenses and not linked to any loan. Link them to this loan.</Text>
                <Button title={`Link ${candidates.length} payment${candidates.length === 1 ? '' : 's'}`} variant="secondary" size="sm"
                  onPress={() => candidates.forEach((t: any) => dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...t, liabilityId: l.id, subcategory: l.subName || t.subcategory } }))} />
              </View>
            ) : null}

            {s.earlierCount > 0 && !l.earlierOk ? (
              <View style={styles.linkCard}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                  <Clock size={16} color={Colors.accentLight} />
                  <Text style={styles.linkTitle}>{s.earlierCount} payment{s.earlierCount === 1 ? '' : 's'} ({fmt(s.earlierTotal)}) dated before the balance date</Text>
                </View>
                <Text style={styles.linkSub}>The balance you entered is as of {s.asOf}. Was it the amount <Text style={{ fontWeight: '800', color: Colors.text1 }}>before</Text> these payments (count them), or already <Text style={{ fontWeight: '800', color: Colors.text1 }}>after</Text> them (leave them out)?</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Button title="Count them" size="sm" style={{ flex: 1 }}
                    onPress={() => dispatch({ type: 'UPDATE_LIABILITY', payload: { ...l, outstandingAsOf: s.earlierFrom || l.outstandingAsOf } })} />
                  <Button title="Already included" variant="secondary" size="sm" style={{ flex: 1 }}
                    onPress={() => dispatch({ type: 'UPDATE_LIABILITY', payload: { ...l, earlierOk: true } })} />
                </View>
              </View>
            ) : null}

            <View style={styles.payHeadRow}>
              <Text style={styles.payHeading}>Payments since {s.asOf}</Text>
              <Pressable onPress={() => setLinkFor(l)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Link a transaction to this loan">
                <Text style={styles.payAll}>+ Link</Text>
              </Pressable>
              {s.payments.length > 0 ? (
                <Pressable onPress={() => explorer.show(`${l.name} — payments`, s.payments.map((p) => p.txn), `Since ${s.asOf} • ${fmt(s.paidTotal)} paid`)} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.payAll}>See all ›</Text>
                </Pressable>
              ) : null}
            </View>
            {s.payments.length === 0 ? (
              <Text style={styles.payEmpty}>No payments linked yet. Record an EMI payment (or choose this loan when adding an expense) and the balance will drop automatically.</Text>
            ) : s.payments.slice(0, 12).map((p) => (
              <Pressable key={p.txn.id} onPress={() => explorer.showTxn(p.txn)} style={styles.payRow} accessibilityRole="button"
                accessibilityLabel={`Payment of ${fmt(p.txn.amount)} on ${p.txn.date}, balance after ${fmt(p.balanceAfter)}. Tap for the transaction`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payDate}>{p.txn.date}</Text>
                  <Text style={styles.payMeta}>{fmt(p.principal)} principal{p.interest > 0 ? ` • ${fmt(p.interest)} interest` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.payAmt}>{fmt(p.txn.amount)}</Text>
                  <Text style={styles.payMeta}>balance {fmt(p.balanceAfter)}</Text>
                </View>
                <ChevronRight size={16} color={Colors.text3} />
              </Pressable>
            ))}
          </RecordSheet>
        );
      })()}
      {payForm && <TransactionFormModal visible mode="add" initial={payForm} onClose={() => setPayForm(null)} />}
      {explorer.node}
      <LinkPaymentsSheet kind="liability" entity={linkFor} visible={!!linkFor} onClose={() => setLinkFor(null)} />
      <UnlinkedPaymentsSheet kind="liability" visible={showUnlinked} onClose={() => setShowUnlinked(false)} />
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
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  listHeader: { gap: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  miniBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  body: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.md },
  figures: { flex: 1, flexShrink: 1, gap: 2 },
  bigValue: { color: Colors.red, fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.3 },
  emptyCard: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800' },
  emptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center' },
  card: { gap: 4 },
  pendingCard: { gap: Spacing.sm, backgroundColor: Colors.yellowBg, borderColor: Colors.yellow + '55' },
  noteCard: { gap: Spacing.sm, backgroundColor: Colors.accentGlow, borderColor: Colors.accentLight + '55' },
  noteTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  noteText: { color: Colors.text2, fontSize: FontSize.sm, lineHeight: 18 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.md },
  statusText: { flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  asOfHint: { color: Colors.text2, fontSize: FontSize.sm, marginTop: -8, marginBottom: Spacing.lg },
  linkCard: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accentGlow },
  linkTitle: { flex: 1, color: Colors.text1, fontWeight: '800', fontSize: FontSize.base },
  linkSub: { color: Colors.text2, fontSize: FontSize.sm },
  payHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  payAll: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base },
  payHeading: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  payEmpty: { color: Colors.text2, fontSize: FontSize.base },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  payDate: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  payAmt: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.base },
  payMeta: { color: Colors.text2, fontSize: FontSize.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  actionsRow: { flexDirection: 'row', gap: 0 },
  name: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  metaText: { color: Colors.text2, fontSize: FontSize.sm },
  valuesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, gap: Spacing.sm },
  valueCol: { flex: 1, flexShrink: 1 },
  valueLabel: { fontSize: FontSize.xs, color: Colors.text2, marginBottom: 2 },
  valueAmt: { fontSize: FontSize.base, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  typeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md,
    backgroundColor: Colors.panel, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  label: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text2, marginBottom: 6 },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: Colors.text1 },
}));
