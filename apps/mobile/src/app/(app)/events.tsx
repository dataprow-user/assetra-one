import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, ChevronDown, ChevronRight, Receipt, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Button, EmptyState, AppModal, FormField, DateField, ScreenHeader, Badge, ProgressBar } from '../../components/ui';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { fmt } from '../../utils/format';
import { MAX_NAME_LENGTH, MAX_AMOUNT, sanitizeNumericInput } from '../../utils/validation';

// Ported from apps/web/src/pages/Events.jsx — event cards with live
// spend/income totals (derived from linked transactions) and an expandable
// "Linked Transactions" accordion, plus the Add/Edit modal.

const emptyForm = () => ({ name: '', startDate: '', endDate: '', budget: '' });

const NUMERIC_RULES: Record<string, any> = {
  budget: { label: 'Budget', min: 0, max: MAX_AMOUNT, required: false },
};

export default function Events() {
  const { state, dispatch, uid } = useApp();
  const { events = [], transactions = [] } = state;
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { errors, validate, reset: resetErrors } = useFieldErrors();

  const openAdd = () => { setForm(emptyForm()); resetErrors(); setModal({ mode: 'add' }); };
  const openEdit = (ev: any) => { setForm({ ...ev, budget: ev.budget ? String(ev.budget) : '' }); resetErrors(); setModal({ mode: 'edit', data: ev }); };
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const setBudget = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('budget', val, NUMERIC_RULES.budget);
    setForm((f: any) => ({ ...f, budget: val }));
  };

  const handleSubmit = () => {
    const err = validate('budget', form.budget, NUMERIC_RULES.budget);
    if (err) return;
    if (!form.name.trim()) return;

    const payload = { ...form, budget: Number(form.budget) || 0 };
    if (modal?.mode === 'add') dispatch({ type: 'ADD_EVENT', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_EVENT', payload: { ...payload, id: modal!.data.id } });
    setModal(null);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete this event?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_EVENT', payload: id }) },
    ]);
  };

  // For each event, auto-calculate spent/income from linked transactions
  const eventData = useMemo(() => events.map((ev: any) => {
    const linked = transactions.filter((t: any) => t.eventId === ev.id);
    const spent = linked.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const income = linked.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    return { ...ev, spent, income, linked };
  }), [events, transactions]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Events"
          showBack
          subtitle="Trips, functions & occasions — link transactions to see live spending"
          right={
            <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}>
              <Plus size={20} color="#fff" />
            </Pressable>
          }
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {eventData.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No Events" description="Create an event for trips, weddings, or functions. Then tag transactions to it." />
        ) : (
          eventData.map((ev: any) => {
            const pct = ev.budget ? Math.min((ev.spent / ev.budget) * 100, 100) : 0;
            const color = pct >= 90 ? Colors.red : pct >= 70 ? Colors.yellow : Colors.green;
            const remaining = ev.budget - ev.spent;
            const isOpen = !!expanded[ev.id];
            return (
              <Card key={ev.id} style={styles.eventCard}>
                <View style={styles.evHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evName} numberOfLines={1}>{ev.name}</Text>
                    <Text style={styles.evDates}>{ev.startDate}{ev.endDate ? ` → ${ev.endDate}` : ''}</Text>
                  </View>
                  <View style={styles.evHeaderActions}>
                    <Badge label={`${ev.linked.length} txn${ev.linked.length !== 1 ? 's' : ''}`} color={Colors.blue} />
                    <Pressable onPress={() => openEdit(ev)} hitSlop={8}><Edit2 size={15} color={Colors.text2} /></Pressable>
                    <Pressable onPress={() => handleDelete(ev.id)} hitSlop={8}><Trash2 size={15} color={Colors.red} /></Pressable>
                  </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Budget</Text>
                    <Text style={styles.statVal}>{ev.budget ? fmt(ev.budget) : '—'}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Spent</Text>
                    <Text style={[styles.statVal, { color: Colors.red }]}>{fmt(ev.spent)}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Income</Text>
                    <Text style={[styles.statVal, { color: Colors.green }]}>{fmt(ev.income)}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Remaining</Text>
                    <Text style={[styles.statVal, { color: remaining >= 0 ? Colors.green : Colors.red }]}>
                      {ev.budget ? fmt(remaining) : '—'}
                    </Text>
                  </View>
                </View>

                {ev.budget > 0 && <ProgressBar pct={pct} color={color} />}

                {/* Linked transactions accordion */}
                {ev.linked.length > 0 && (
                  <View style={styles.txnSection}>
                    <Pressable style={styles.txnToggle} onPress={() => toggle(ev.id)}>
                      <Receipt size={13} color={Colors.text2} />
                      {isOpen ? <ChevronDown size={13} color={Colors.text2} /> : <ChevronRight size={13} color={Colors.text2} />}
                      <Text style={styles.txnToggleText}>Linked Transactions ({ev.linked.length})</Text>
                    </Pressable>
                    {isOpen && (
                      <View style={styles.txnList}>
                        {ev.linked.map((t: any) => (
                          <View key={t.id} style={styles.txnRow}>
                            <Text style={styles.txnCat} numberOfLines={1}>
                              {t.category}{t.subcategory ? ` › ${t.subcategory}` : ''}
                              <Text style={styles.txnDate}> · {t.date}</Text>
                            </Text>
                            <Text style={[styles.txnAmt, { color: t.type === 'income' ? Colors.green : Colors.red }]}>
                              {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      {modal && (
        <AppModal visible title={modal.mode === 'add' ? 'Add Event' : 'Edit Event'} onClose={() => setModal(null)}>
          <FormField label="Event Name" value={form.name} onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))}
            maxLength={MAX_NAME_LENGTH} placeholder="e.g. Goa Trip 2026" />
          <View style={styles.dateRow}>
            <DateField label="Start Date" value={form.startDate} onChange={(v) => setForm((f: any) => ({ ...f, startDate: v }))} style={{ flex: 1 }} />
            <DateField label="End Date" value={form.endDate} onChange={(v) => setForm((f: any) => ({ ...f, endDate: v }))} style={{ flex: 1 }} />
          </View>
          <FormField label="Budget (₹)" hint="(optional)" keyboardType="decimal-pad" value={form.budget} onChangeText={setBudget}
            error={errors.budget} placeholder="e.g. 50000" />
          <Text style={styles.helperText}>Tag transactions to this event using the "Link to Event" field in Add Transaction.</Text>
          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
            <Button title={modal.mode === 'add' ? 'Add Event' : 'Update'} onPress={handleSubmit} style={{ flex: 1 }} />
          </View>
        </AppModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  addBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  eventCard: { gap: Spacing.sm },
  evHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  evName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  evDates: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },
  evHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCol: { gap: 2 },
  statLabel: { fontSize: FontSize.xs, color: Colors.text2 },
  statVal: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text1 },
  txnSection: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  txnToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txnToggleText: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '600' },
  txnList: { marginTop: Spacing.sm, gap: Spacing.xs },
  txnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, gap: Spacing.sm },
  txnCat: { flex: 1, color: Colors.text1, fontSize: FontSize.sm },
  txnDate: { color: Colors.text3, fontSize: FontSize.xs },
  txnAmt: { fontWeight: '700', fontSize: FontSize.sm },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  helperText: { fontSize: FontSize.sm, color: Colors.text2, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
