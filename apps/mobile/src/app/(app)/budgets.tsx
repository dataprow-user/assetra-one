import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, LayoutGrid, Table2 } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Button, EmptyState, AppModal, FormField, SelectField, ScreenHeader, Badge } from '../../components/ui';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius, GroupColors } from '../../constants/theme';
import { MAX_NOTES_LENGTH, MAX_AMOUNT, sanitizeNumericInput } from '../../utils/validation';

// Ported from apps/web/src/pages/Budgets.jsx — card view + single Add/Edit
// modal, PLUS the "Bulk Entry" mode: pick a group, fill in every category's
// (and sub-category's) planned amount for the period at once, Save All.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const emptyForm = (month: string, year: number) => ({
  month, year: String(year), group: '', category: '', subcategory: '', plannedAmount: '', notes: '',
});

const NUMERIC_RULES: Record<string, any> = {
  year: { label: 'Year', min: 2000, max: 2100, maxDecimals: 0 },
  plannedAmount: { label: 'Planned Amount', min: 1, max: MAX_AMOUNT },
};

export default function Budgets() {
  const { state, dispatch, uid, fmt, fmtSigned, fmtN } = useApp();
  const { budgets = [], expenseCategories = [] } = state;

  // Month / Year navigation
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); };

  // Add/Edit modal
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [form, setForm] = useState<any>(emptyForm(MONTHS[viewMonth], viewYear));
  const { errors, validate, reset: resetErrors } = useFieldErrors();

  const allCats = expenseCategories;
  const filteredCats = form.group ? allCats.filter((c: any) => c.group === form.group) : allCats;
  const selectedCat = allCats.find((c: any) => c.name === form.category);
  const subcatOpts: string[] = selectedCat?.subcategories || [];

  const updateField = (key: string, val: string) => {
    setForm((f: any) => {
      const u = { ...f, [key]: val };
      if (key === 'group') { u.category = ''; u.subcategory = ''; }
      if (key === 'category') {
        u.subcategory = '';
        const found = allCats.find((c: any) => c.name === val);
        if (found?.group) u.group = found.group;
      }
      return u;
    });
    if (NUMERIC_RULES[key]) validate(key, val, NUMERIC_RULES[key]);
  };

  const setYear = (raw: string) => updateField('year', sanitizeNumericInput(raw));
  const setPlannedAmount = (raw: string) => updateField('plannedAmount', sanitizeNumericInput(raw));

  const openAdd = () => { setForm(emptyForm(MONTHS[viewMonth], viewYear)); resetErrors(); setModal({ mode: 'add' }); };
  const openEdit = (b: any) => {
    setForm({ ...b, year: String(b.year), plannedAmount: String(b.plannedAmount) });
    resetErrors();
    setModal({ mode: 'edit', data: b });
  };

  const handleSubmit = () => {
    const yearErr = validate('year', form.year, NUMERIC_RULES.year);
    const amtErr = validate('plannedAmount', form.plannedAmount, NUMERIC_RULES.plannedAmount);
    if (yearErr || amtErr) return;
    if (!form.category) return;

    const payload = { ...form, plannedAmount: Number(form.plannedAmount) };
    if (modal?.mode === 'add') dispatch({ type: 'ADD_BUDGET', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_BUDGET', payload: { ...payload, id: modal!.data.id } });
    setModal(null);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete this budget?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_BUDGET', payload: id }) },
    ]);
  };

  // ── Filtered budgets for the period, grouped ──
  const viewBudgets = useMemo(() => {
    if (viewMode === 'month') return budgets.filter((b: any) => b.month === MONTHS[viewMonth] && String(b.year) === String(viewYear));
    return budgets.filter((b: any) => String(b.year) === String(viewYear));
  }, [budgets, viewMonth, viewYear, viewMode]);

  const byGroup: Record<string, any[]> = {};
  viewBudgets.forEach((b: any) => {
    const g = b.group || 'Other';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(b);
  });

  const totalPlanned = viewBudgets.reduce((s: number, b: any) => s + Number(b.plannedAmount || 0), 0);

  // ── Bulk Entry mode ──
  const [entryMode, setEntryMode] = useState<'cards' | 'bulk'>('cards');
  const groupList = useMemo(() => [...new Set(expenseCategories.map((c: any) => c.group).filter(Boolean))] as string[], [expenseCategories]);
  const [bulkGroup, setBulkGroup] = useState<string>(groupList[0] || '');
  const [bulkAmounts, setBulkAmounts] = useState<Record<string, string>>({});

  const bulkKey = (cat: string, sub?: string) => `${cat}||${sub || '__cat__'}`;

  const loadExisting = () => {
    const init: Record<string, string> = {};
    budgets
      .filter((b: any) => b.month === MONTHS[viewMonth] && String(b.year) === String(viewYear))
      .forEach((b: any) => { init[bulkKey(b.category, b.subcategory)] = String(b.plannedAmount || ''); });
    setBulkAmounts(init);
  };

  const openBulk = () => { setEntryMode('bulk'); if (!bulkGroup) setBulkGroup(groupList[0] || ''); loadExisting(); };

  // Editing a sub-category amount auto-recomputes the category's "Overall ₹"
  // box as the sum of that category's sub-categories, so you can either type
  // one overall number OR break it down by sub-category and watch the total
  // build itself. The overall box stays independently editable afterward —
  // typing in it directly always wins until you edit a sub-category again.
  const setSubAmount = (cat: any, sub: string, raw: string) => {
    const val = sanitizeNumericInput(raw);
    setBulkAmounts((a) => {
      const next = { ...a, [bulkKey(cat.name, sub)]: val };
      const subs: string[] = cat.subcategories || [];
      const anyFilled = subs.some((s) => next[bulkKey(cat.name, s)]);
      if (anyFilled) {
        const sum = subs.reduce((s: number, name: string) => s + (Number(next[bulkKey(cat.name, name)]) || 0), 0);
        next[bulkKey(cat.name)] = sum > 0 ? String(sum) : '';
      }
      return next;
    });
  };

  const saveBulk = () => {
    let count = 0;
    // A category's "Overall ₹" box is auto-filled as a live preview whenever
    // its sub-categories have amounts (see setSubAmount) — but that preview
    // must NOT also be saved as its own row, or the same money gets counted
    // twice wherever budgets are totaled (category row + its sub-category
    // rows). Only persist the category-level row when there's no breakdown.
    const catHasSubAmounts = new Set<string>();
    Object.entries(bulkAmounts).forEach(([key, amount]) => {
      if (!amount || Number(amount) <= 0) return;
      const [cat, sub] = key.split('||');
      if (sub !== '__cat__') catHasSubAmounts.add(cat);
    });

    Object.entries(bulkAmounts).forEach(([key, amount]) => {
      if (!amount || Number(amount) <= 0) return;
      const [cat, sub] = key.split('||');
      const subVal = sub === '__cat__' ? '' : sub;
      if (subVal === '' && catHasSubAmounts.has(cat)) return;
      const catObj = expenseCategories.find((c: any) => c.name === cat);
      const existing = budgets.find((b: any) =>
        b.category === cat && b.subcategory === subVal &&
        b.month === MONTHS[viewMonth] && String(b.year) === String(viewYear)
      );
      const payload = {
        month: MONTHS[viewMonth], year: viewYear,
        group: catObj?.group || '', category: cat, subcategory: subVal,
        plannedAmount: Number(amount), notes: '',
      };
      if (existing) dispatch({ type: 'UPDATE_BUDGET', payload: { ...payload, id: existing.id } });
      else dispatch({ type: 'ADD_BUDGET', payload: { ...payload, id: uid() } });
      count++;
    });

    // Clean up any category-level row left over from before this category had
    // a sub-category breakdown (e.g. saved as a whole category in an earlier
    // month/session) — it would otherwise keep double-counting alongside the
    // new sub-category rows just saved above.
    catHasSubAmounts.forEach((cat) => {
      const stale = budgets.find((b: any) =>
        b.category === cat && !b.subcategory &&
        b.month === MONTHS[viewMonth] && String(b.year) === String(viewYear)
      );
      if (stale) dispatch({ type: 'DELETE_BUDGET', payload: stale.id });
    });

    Alert.alert('Saved', `${count} budget entries saved for ${MONTHS[viewMonth]} ${viewYear}.`);
  };

  const bulkCats = useMemo(() => expenseCategories.filter((c: any) => c.group === bulkGroup), [expenseCategories, bulkGroup]);
  const savedCountFor = (g: string) => budgets.filter((b: any) => b.group === g && b.month === MONTHS[viewMonth] && String(b.year) === String(viewYear)).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Budgets"
          showBack
          subtitle={
            <>
              {viewBudgets.length} budgets • Total Planned: <Text style={{ color: Colors.accentLight }}>{fmt(totalPlanned)}</Text>
            </>
          }
          right={
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Pressable onPress={() => setEntryMode('cards')} style={[styles.iconBtn, entryMode === 'cards' && styles.iconBtnActive]} hitSlop={8}>
                <LayoutGrid size={18} color={entryMode === 'cards' ? Colors.accentLight : Colors.text2} />
              </Pressable>
              <Pressable onPress={openBulk} style={[styles.iconBtn, entryMode === 'bulk' && styles.iconBtnActive]} hitSlop={8}>
                <Table2 size={18} color={entryMode === 'bulk' ? Colors.accentLight : Colors.text2} />
              </Pressable>
              <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}>
                <Plus size={20} color="#fff" />
              </Pressable>
            </View>
          }
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Period Navigator */}
        <Card style={styles.navCard}>
          <View style={styles.modeToggle}>
            <Pressable style={[styles.modeTab, viewMode === 'month' && styles.modeTabActive]} onPress={() => setViewMode('month')}>
              <Text style={[styles.modeTabText, viewMode === 'month' && styles.modeTabTextActive]}>Monthly</Text>
            </Pressable>
            <Pressable style={[styles.modeTab, viewMode === 'year' && styles.modeTabActive]} onPress={() => setViewMode('year')}>
              <Text style={[styles.modeTabText, viewMode === 'year' && styles.modeTabTextActive]}>Yearly</Text>
            </Pressable>
          </View>

          {viewMode === 'month' && (
            <View style={styles.periodRow}>
              <Pressable onPress={prevMonth} style={styles.navArrow} hitSlop={8}><ChevronLeft size={18} color={Colors.text1} /></Pressable>
              <Text style={styles.periodLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
              <Pressable onPress={nextMonth} style={styles.navArrow} hitSlop={8}><ChevronRight size={18} color={Colors.text1} /></Pressable>
            </View>
          )}
          <View style={styles.periodRow}>
            <Pressable onPress={() => setViewYear((y) => y - 1)} style={styles.navArrow} hitSlop={8}><ChevronLeft size={18} color={Colors.text1} /></Pressable>
            <Text style={styles.periodLabel}>{viewYear}</Text>
            <Pressable onPress={() => setViewYear((y) => y + 1)} style={styles.navArrow} hitSlop={8}><ChevronRight size={18} color={Colors.text1} /></Pressable>
          </View>
        </Card>

        {entryMode === 'bulk' ? (
          <Card style={{ gap: Spacing.md }}>
            <View style={styles.bulkHeaderRow}>
              <Text style={styles.bulkHeaderText}>📋 {MONTHS[viewMonth]} {viewYear} — pick a group, fill amounts, Save All</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Button title="↺ Load Saved" variant="ghost" size="sm" onPress={loadExisting} />
                <Button title="💾 Save All" size="sm" onPress={saveBulk} />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bulkTabsRow}>
              {groupList.map((g) => {
                const saved = savedCountFor(g);
                const active = bulkGroup === g;
                return (
                  <Pressable key={g} onPress={() => setBulkGroup(g)} style={[styles.bulkTab, active && styles.bulkTabActive]}>
                    <Text style={[styles.bulkTabText, active && styles.bulkTabTextActive]}>{g}</Text>
                    {saved > 0 ? (
                      <View style={styles.bulkSavedDot}><Text style={styles.bulkSavedDotText}>{saved}</Text></View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            {bulkCats.length === 0 ? (
              <Text style={styles.bulkEmptyText}>No categories in this group. Add them via the Categories screen.</Text>
            ) : (
              <View style={{ gap: Spacing.md }}>
                {bulkCats.map((cat: any) => (
                  <View key={cat.id} style={styles.bulkCatBlock}>
                    <View style={styles.bulkCatHeader}>
                      <Text style={styles.bulkCatLabel}>{cat.name}</Text>
                      <TextInput
                        style={styles.bulkInput}
                        keyboardType="decimal-pad"
                        placeholder="Overall ₹"
                        placeholderTextColor={Colors.text3}
                        value={bulkAmounts[bulkKey(cat.name)] || ''}
                        onChangeText={(v) => setBulkAmounts((a) => ({ ...a, [bulkKey(cat.name)]: sanitizeNumericInput(v) }))}
                      />
                    </View>
                    {(cat.subcategories || []).map((sub: string) => (
                      <View key={sub} style={styles.bulkSubRow}>
                        <Text style={styles.bulkSubLabel}>↳ {sub}</Text>
                        <TextInput
                          style={styles.bulkInput}
                          keyboardType="decimal-pad"
                          placeholder="₹"
                          placeholderTextColor={Colors.text3}
                          value={bulkAmounts[bulkKey(cat.name, sub)] || ''}
                          onChangeText={(v) => setSubAmount(cat, sub, v)}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </Card>
        ) : viewBudgets.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title={`No Budgets for ${viewMode === 'month' ? `${MONTHS[viewMonth]} ${viewYear}` : viewYear}`}
            description='Tap "+" to plan a budget for a category.'
          />
        ) : (
          Object.entries(byGroup).map(([group, items]) => (
            <Card key={group} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Badge label={group} color={GroupColors[group] || Colors.text2} />
                <Text style={styles.groupTotal}>
                  Planned: <Text style={{ fontWeight: '700', color: Colors.text1 }}>{fmt(items.reduce((s, b) => s + Number(b.plannedAmount || 0), 0))}</Text>
                </Text>
              </View>
              <View style={{ gap: Spacing.sm }}>
                {items.map((b: any) => (
                  <View key={b.id} style={styles.budgetItem}>
                    <View style={styles.bcHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bcName}>{b.category}</Text>
                        {b.subcategory ? <Text style={styles.bcSub}>{b.subcategory}</Text> : null}
                      </View>
                      <View style={styles.actionsRow}>
                        <Pressable onPress={() => openEdit(b)} hitSlop={8}><Edit2 size={15} color={Colors.text2} /></Pressable>
                        <Pressable onPress={() => handleDelete(b.id)} hitSlop={8}><Trash2 size={15} color={Colors.red} /></Pressable>
                      </View>
                    </View>
                    <Text style={styles.bcAmount}>{fmt(b.plannedAmount)}</Text>
                    {b.notes ? <Text style={styles.bcNotes}>{b.notes}</Text> : null}
                    <Text style={styles.bcPeriod}>{b.month} {b.year}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      {modal && (
        <AppModal
          visible
          title={modal.mode === 'add' ? 'Add Budget' : 'Edit Budget'}
          onClose={() => setModal(null)}
          footer={
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
              <Button title={modal.mode === 'add' ? 'Add Budget' : 'Update'} onPress={handleSubmit} style={{ flex: 1 }} />
            </View>
          }
        >
          <SelectField label="Month" value={form.month} onChange={(v) => updateField('month', v)}
            options={MONTHS.map((m) => ({ label: m, value: m }))} />
          <FormField label="Year" keyboardType="number-pad" value={form.year} onChangeText={setYear} error={errors.year} placeholder="2026" />
          <SelectField label="Category" value={form.category} onChange={(v) => updateField('category', v)}
            options={filteredCats.map((c: any) => ({ label: c.name, value: c.name }))}
            hint={form.group ? `Group: ${form.group}` : undefined} />
          <SelectField label="Sub-Category" hint="(optional)" value={form.subcategory} onChange={(v) => updateField('subcategory', v)}
            options={subcatOpts.map((s) => ({ label: s, value: s }))} disabled={subcatOpts.length === 0} />
          <FormField label="Planned Amount (₹)" keyboardType="decimal-pad" value={form.plannedAmount} onChangeText={setPlannedAmount}
            error={errors.plannedAmount} placeholder="e.g. 5000" />
          <FormField label="Notes" hint="(optional)" value={form.notes} onChangeText={(v) => setForm((f: any) => ({ ...f, notes: v }))}
            maxLength={MAX_NOTES_LENGTH} placeholder="Any detail..." />
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
  navCard: { gap: Spacing.md },
  modeToggle: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: Radius.sm, padding: 4 },
  modeTab: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm - 2, alignItems: 'center' },
  modeTabActive: { backgroundColor: Colors.accent },
  modeTabText: { color: Colors.text2, fontWeight: '600', fontSize: FontSize.base },
  modeTabTextActive: { color: '#fff' },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navArrow: {
    width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.panel,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  periodLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text1 },
  groupCard: { gap: Spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  groupTotal: { fontSize: FontSize.sm, color: Colors.text2 },
  budgetItem: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: 4,
  },
  bcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bcName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  bcSub: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingTop: 2 },
  bcAmount: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.lg, marginTop: 4 },
  bcNotes: { color: Colors.text2, fontSize: FontSize.sm, fontStyle: 'italic', marginTop: 2 },
  bcPeriod: { color: Colors.text3, fontSize: FontSize.xs, marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border,
  },
  iconBtnActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
  bulkHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  bulkHeaderText: { color: Colors.text1, fontSize: FontSize.sm, flex: 1, minWidth: 160 },
  bulkTabsRow: { gap: Spacing.sm, paddingVertical: 2 },
  bulkTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border,
  },
  bulkTabActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
  bulkTabText: { color: Colors.text2, fontWeight: '600', fontSize: FontSize.sm },
  bulkTabTextActive: { color: Colors.accentLight },
  bulkSavedDot: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bulkSavedDotText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bulkEmptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center', paddingVertical: Spacing.xl },
  bulkCatBlock: { gap: Spacing.sm },
  bulkCatHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm,
    backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: Radius.sm, padding: Spacing.sm,
  },
  bulkCatLabel: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base, flex: 1 },
  bulkSubRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingLeft: Spacing.lg },
  bulkSubLabel: { color: Colors.text2, fontSize: FontSize.sm, flex: 1 },
  bulkInput: {
    width: 110, paddingVertical: 8, paddingHorizontal: 10, borderRadius: Radius.sm, textAlign: 'right',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.3)', color: Colors.text1, fontSize: FontSize.base,
  },
});
