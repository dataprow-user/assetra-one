import React, { useState } from 'react';
import { View, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { Text, TextInput } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Edit2, Tag, X, ChevronDown, ChevronRight, Layers, Check } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Button, AppModal, FormField, SelectField, ScreenHeader, FilterChips } from '../../components/ui';
import { KIND_CONFIG, KINDS, Kind } from '../../utils/entities';
import { Colors, FontSize, Spacing, Radius, GroupColors, createStyles } from '../../constants/theme';
import { MAX_NAME_LENGTH } from '../../utils/validation';
import { DEFAULT_GROUPS } from '../../data/categories';

type Tab = 'expense' | 'income' | 'group';

// Ported from apps/web/src/pages/CategoryManager.jsx. Same three tabs
// (expense / income / groups), same group-colour map, same inline
// add/remove-subcategory flow — just native controls instead of <select>/<input>.
export default function CategoryManager() {
  const { state, dispatch, uid } = useApp();
  const { expenseCategories = [], incomeCategories = [] } = state;
  // Use stored groups; if old data has none yet, fall back to defaults.
  const groups = state.groups && state.groups.length > 0 ? state.groups : DEFAULT_GROUPS;

  const [tab, setTab] = useState<Tab>('expense');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<'add-cat' | 'edit-cat' | 'add-group' | 'edit-group' | null>(null);
  const [catForm, setCatForm] = useState<any>({ name: '', group: 'Needs', tracks: '' });
  const [groupForm, setGroupForm] = useState<any>({ name: '' });
  const [newSubInput, setNewSubInput] = useState<Record<string, string>>({});
  const [editingSub, setEditingSub] = useState<{ catId: string; value: string } | null>(null);
  const [editSubVal, setEditSubVal] = useState('');
  const [subError, setSubError] = useState<Record<string, string>>({});

  const categories = tab === 'income' ? incomeCategories : expenseCategories;
  const ADD_TYPE = tab === 'expense' ? 'ADD_EXPENSE_CATEGORY' : 'ADD_INCOME_CATEGORY';
  const UPD_TYPE = tab === 'expense' ? 'UPDATE_EXPENSE_CATEGORY' : 'UPDATE_INCOME_CATEGORY';
  const DEL_TYPE = tab === 'expense' ? 'DELETE_EXPENSE_CATEGORY' : 'DELETE_INCOME_CATEGORY';

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // ── Add / Edit Category ──
  const openAddCat = () => { setCatForm({ name: '', group: 'Needs', tracks: '' }); setModal('add-cat'); };
  const openEditCat = (cat: any) => { setCatForm({ ...cat }); setModal('edit-cat'); };
  const handleCatSubmit = () => {
    if (!catForm.name.trim()) return;
    if (modal === 'add-cat') dispatch({ type: ADD_TYPE, payload: { ...catForm, id: uid(), subcategories: [] } });
    else dispatch({ type: UPD_TYPE, payload: { ...catForm, tracks: catForm.tracks || '' } });
    setModal(null);
  };
  const handleDeleteCat = (id: string) => {
    Alert.alert('Delete this category?', 'Existing transactions using it will keep the old name.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: DEL_TYPE, payload: id }) },
    ]);
  };

  // ── Add / Edit Group ──
  const openAddGroup = () => { setGroupForm({ name: '' }); setModal('add-group'); };
  const openEditGroup = (g: any) => { setGroupForm({ ...g }); setModal('edit-group'); };
  const handleGroupSubmit = () => {
    if (!groupForm.name.trim()) return;
    if (modal === 'add-group') dispatch({ type: 'ADD_GROUP', payload: { ...groupForm, id: uid() } });
    else dispatch({ type: 'UPDATE_GROUP', payload: groupForm });
    setModal(null);
  };
  const handleDeleteGroup = (id: string) => {
    Alert.alert('Delete this group?', 'Categories and transactions will keep the old name.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_GROUP', payload: id }) },
    ]);
  };

  // ── Add / remove subcategory inline ──
  const handleAddSub = (cat: any) => {
    const val = (newSubInput[cat.id] || '').trim().slice(0, MAX_NAME_LENGTH);
    if (!val) { setSubError((s) => ({ ...s, [cat.id]: 'Please enter a sub-category name.' })); return; }
    if (cat.subcategories.includes(val)) { setSubError((s) => ({ ...s, [cat.id]: 'That sub-category already exists.' })); return; }
    dispatch({ type: UPD_TYPE, payload: { ...cat, subcategories: [...cat.subcategories, val] } });
    setNewSubInput((s) => ({ ...s, [cat.id]: '' }));
    setSubError((s) => ({ ...s, [cat.id]: '' }));
  };
  const handleDeleteSub = (cat: any, sub: string) => {
    Alert.alert('Remove sub-category?', `Remove "${sub}"? Existing transactions will keep the old name.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => dispatch({ type: UPD_TYPE, payload: { ...cat, subcategories: cat.subcategories.filter((s: string) => s !== sub) } }),
      },
    ]);
  };

  const startEditSub = (cat: any, sub: string) => {
    setEditingSub({ catId: cat.id, value: sub });
    setEditSubVal(sub);
    setSubError((s) => ({ ...s, [cat.id]: '' }));
  };

  const handleUpdateSub = (cat: any, oldSub: string) => {
    const val = editSubVal.trim().slice(0, MAX_NAME_LENGTH);
    if (!val) { setSubError((s) => ({ ...s, [cat.id]: 'Sub-category name cannot be empty.' })); return; }
    if (val === oldSub) { setEditingSub(null); return; }
    if (cat.subcategories.includes(val)) { setSubError((s) => ({ ...s, [cat.id]: 'That sub-category already exists.' })); return; }
    dispatch({ type: UPD_TYPE, payload: { ...cat, subcategories: cat.subcategories.map((s: string) => (s === oldSub ? val : s)) } });
    setEditingSub(null);
    setSubError((s) => ({ ...s, [cat.id]: '' }));
  };

  // Only compute byGroup when not on the groups tab.
  const byGroup: Record<string, any[]> = {};
  if (tab !== 'group') {
    categories.forEach((c: any) => {
      const g = c.group || 'Other';
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(c);
    });
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'expense', label: 'Expense', count: expenseCategories.length },
    { key: 'income', label: 'Income', count: incomeCategories.length },
    { key: 'group', label: 'Groups', count: groups.length },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Category Manager"
          subtitle="Customize income & expense categories"
          showBack
          right={
            <Button
              title={tab === 'group' ? 'Add Group' : 'Add Category'}
              icon={<Plus size={16} color="#fff" />}
              size="sm"
              onPress={tab === 'group' ? openAddGroup : openAddCat}
            />
          }
        />

        <View style={styles.tabsRow}>
          <FilterChips<Tab>
            value={tab}
            onChange={setTab}
            options={TABS.map((t) => ({ key: t.key, label: t.label, count: t.count }))}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab !== 'group' && Object.entries(byGroup).map(([group, cats]) => (
          <Card key={group} style={styles.groupBlock}>
            <View style={styles.groupHeader}>
              <View style={styles.groupTitleRow}>
                <View style={[styles.groupDot, { backgroundColor: GroupColors[group] || Colors.text2 }]} />
                <Text style={styles.groupTitle} numberOfLines={1}>{group}</Text>
              </View>
              <Text style={styles.groupCount}>{cats.length} {cats.length === 1 ? 'category' : 'categories'}</Text>
            </View>

            {cats.map((cat: any) => (
              <View key={cat.id} style={styles.catRow}>
                <View style={styles.catRowHeader}>
                  <Pressable style={styles.catRowLeft} onPress={() => toggle(cat.id)} accessibilityRole="button" accessibilityLabel={`${cat.name}, ${cat.subcategories.length} sub-categories. Tap to ${expanded[cat.id] ? 'collapse' : 'expand'}`}>
                    {expanded[cat.id] ? <ChevronDown size={15} color={Colors.text2} /> : <ChevronRight size={15} color={Colors.text2} />}
                    <Tag size={15} color={GroupColors[group] || Colors.accentLight} />
                    <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                    <View style={styles.subCountBadge}>
                      <Text style={styles.subCountText}>{cat.subcategories.length} subs</Text>
                    </View>
                    {cat.tracks && KIND_CONFIG[cat.tracks as Kind] ? (
                      <View style={[styles.subCountBadge, { backgroundColor: Colors.accentGlow }]}>
                        <Text style={[styles.subCountText, { color: Colors.accentLight }]}>tracks {KIND_CONFIG[cat.tracks as Kind].noun}s</Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <View style={styles.catRowActions}>
                    <Pressable onPress={() => openEditCat(cat)} hitSlop={4} style={styles.iconAction} accessibilityRole="button" accessibilityLabel={`Edit ${cat.name}`}><Edit2 size={16} color={Colors.text2} /></Pressable>
                    <Pressable onPress={() => handleDeleteCat(cat.id)} hitSlop={4} style={styles.iconAction} accessibilityRole="button" accessibilityLabel={`Delete ${cat.name}`}><Trash2 size={16} color={Colors.red} /></Pressable>
                  </View>
                </View>

                {expanded[cat.id] && (
                  <View style={styles.subPanel}>
                    <View style={styles.subChips}>
                      {cat.subcategories.map((sub: string) => {
                        const isEditing = editingSub?.catId === cat.id && editingSub?.value === sub;
                        if (isEditing) {
                          return (
                            <View key={sub} style={[styles.subChip, styles.subChipEditing]}>
                              <TextInput
                                style={styles.subEditInput}
                                value={editSubVal}
                                onChangeText={setEditSubVal}
                                maxLength={MAX_NAME_LENGTH}
                                autoFocus
                                onSubmitEditing={() => handleUpdateSub(cat, sub)}
                              />
                              <Pressable onPress={() => handleUpdateSub(cat, sub)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Save sub-category">
                                <Check size={16} color={Colors.green} />
                              </Pressable>
                              <Pressable onPress={() => setEditingSub(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel editing">
                                <X size={16} color={Colors.text2} />
                              </Pressable>
                            </View>
                          );
                        }
                        return (
                          <View key={sub} style={styles.subChip}>
                            <Text style={styles.subChipText}>{sub}</Text>
                            <Pressable onPress={() => startEditSub(cat, sub)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Rename ${sub}`}>
                              <Edit2 size={14} color={Colors.accentLight} />
                            </Pressable>
                            <Pressable onPress={() => handleDeleteSub(cat, sub)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${sub}`}>
                              <X size={14} color={Colors.red} />
                            </Pressable>
                          </View>
                        );
                      })}
                      {cat.subcategories.length === 0 && (
                        <Text style={styles.emptySubText}>No sub-categories yet</Text>
                      )}
                    </View>
                    {subError[cat.id] ? <Text style={styles.fieldError}>{subError[cat.id]}</Text> : null}
                    <View style={styles.addSubRow}>
                      <TextInput
                        style={styles.addSubInput}
                        placeholder="New sub-category name…"
                        placeholderTextColor={Colors.text3}
                        maxLength={MAX_NAME_LENGTH}
                        value={newSubInput[cat.id] || ''}
                        onChangeText={(v) => { setNewSubInput((s) => ({ ...s, [cat.id]: v })); setSubError((s) => ({ ...s, [cat.id]: '' })); }}
                        onSubmitEditing={() => handleAddSub(cat)}
                      />
                      <Pressable style={styles.addSubBtn} onPress={() => handleAddSub(cat)} accessibilityRole="button" accessibilityLabel={`Add sub-category to ${cat.name}`}>
                        <Plus size={14} color={Colors.accentLight} />
                        <Text style={styles.addSubBtnText}>Add</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </Card>
        ))}

        {tab !== 'group' && categories.length === 0 && (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: Colors.blueBg }]}><Tag size={26} color={Colors.blue} /></View>
            <Text style={styles.emptyTitle}>No {tab} categories yet</Text>
            <Text style={styles.emptyText}>Categories help you see where your money comes from and goes.</Text>
            <Button title="Add category" icon={<Plus size={16} color="#fff" />} onPress={openAddCat} />
          </Card>
        )}

        {tab === 'group' && (
          <Card style={styles.groupBlock}>
            {groups.map((g: any, i: number) => (
              <View key={g.id} style={[styles.groupRow, i < groups.length - 1 && styles.groupRowBorder]}>
                <View style={styles.groupRowLeft}>
                  <View style={[styles.groupIcon, { backgroundColor: (GroupColors[g.name] || Colors.accentLight) + '1f' }]}>
                    <Layers size={18} color={GroupColors[g.name] || Colors.accentLight} />
                  </View>
                  <Text style={styles.groupRowName} numberOfLines={1}>{g.name}</Text>
                </View>
                <View style={styles.catRowActions}>
                  <Pressable onPress={() => openEditGroup(g)} hitSlop={4} style={styles.iconAction} accessibilityRole="button" accessibilityLabel={`Edit group ${g.name}`}><Edit2 size={16} color={Colors.text2} /></Pressable>
                  <Pressable onPress={() => handleDeleteGroup(g.id)} hitSlop={4} style={styles.iconAction} accessibilityRole="button" accessibilityLabel={`Delete group ${g.name}`}><Trash2 size={16} color={Colors.red} /></Pressable>
                </View>
              </View>
            ))}
            {groups.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No groups yet</Text>
                <Button title="Add group" icon={<Plus size={16} color="#fff" />} onPress={openAddGroup} />
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      {(modal === 'add-cat' || modal === 'edit-cat') && (
        <AppModal
          visible
          title={modal === 'add-cat' ? 'Add Category' : 'Edit Category'}
          onClose={() => setModal(null)}
          footer={
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
              <Button title={modal === 'add-cat' ? 'Add' : 'Update'} onPress={handleCatSubmit} style={{ flex: 1 }} />
            </View>
          }
        >
          <FormField label="Category Name" value={catForm.name} onChangeText={(v) => setCatForm((f: any) => ({ ...f, name: v }))} maxLength={MAX_NAME_LENGTH} placeholder="e.g. Outside Food" />
          {tab === 'expense' && (
            <SelectField label="Group" value={catForm.group} onChange={(v) => setCatForm((f: any) => ({ ...f, group: v }))}
              options={groups.map((g: any) => ({ label: g.name, value: g.name }))} />
          )}
          <SelectField
            label="This category tracks"
            hint="(optional)"
            value={catForm.tracks || ''}
            onChange={(v) => setCatForm((f: any) => ({ ...f, tracks: v }))}
            options={[
              { label: 'Nothing — an ordinary category', value: '' },
              ...KINDS.filter((k) => KIND_CONFIG[k].txnTypes.includes(tab === 'income' ? 'income' : 'expense'))
                .map((k: Kind) => ({ label: k === 'liability' ? 'Loans (EMIs & repayments)' : k === 'asset' ? (tab === 'income' ? 'Assets (money taken out / redeemed)' : 'Assets (money put in)') : 'Insurance (premiums)', value: k })),
            ]}
          />
          {catForm.tracks ? (
            <Text style={styles.trackHint}>
              Each {KIND_CONFIG[catForm.tracks as Kind]?.noun} you add in {catForm.tracks === 'liability' ? 'Liabilities' : catForm.tracks === 'asset' ? 'Assets' : 'Insurance'} automatically appears in this category's sub-category list, and transactions you pick it for update that {KIND_CONFIG[catForm.tracks as Kind]?.noun}'s details.
            </Text>
          ) : null}
        </AppModal>
      )}

      {(modal === 'add-group' || modal === 'edit-group') && (
        <AppModal
          visible
          title={modal === 'add-group' ? 'Add Group' : 'Edit Group'}
          onClose={() => setModal(null)}
          footer={
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
              <Button title={modal === 'add-group' ? 'Add' : 'Update'} onPress={handleGroupSubmit} style={{ flex: 1 }} />
            </View>
          }
        >
          <FormField label="Group Name" value={groupForm.name} onChangeText={(v) => setGroupForm((f: any) => ({ ...f, name: v }))} maxLength={MAX_NAME_LENGTH} placeholder="e.g. Discretionary" />
        </AppModal>
      )}
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  tabsRow: { marginBottom: Spacing.md },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  groupBlock: { gap: Spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: 2 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md, flexShrink: 1 },
  groupIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconAction: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.panelHover },
  emptyCard: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center' },
  groupCount: { fontSize: FontSize.sm, color: Colors.text2 },
  catRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  catRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, minHeight: 48 },
  catRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, minHeight: 48 },
  catName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base, flexShrink: 1 },
  trackHint: { color: Colors.text2, fontSize: FontSize.sm, marginTop: -8, marginBottom: Spacing.lg },
  subCountBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: Radius.pill, backgroundColor: Colors.panelHover },
  subCountText: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },
  catRowActions: { flexDirection: 'row', gap: Spacing.xs },
  subPanel: { marginTop: Spacing.sm, marginLeft: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xs },
  subChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: Radius.pill, backgroundColor: 'rgba(79,70,229,0.12)', borderWidth: 1, borderColor: 'rgba(79,70,229,0.25)',
  },
  subChipText: { color: Colors.accentLight, fontSize: FontSize.sm, fontWeight: '500' },
  subChipEditing: { backgroundColor: Colors.panel, borderColor: Colors.borderStrong, paddingVertical: 4 },
  subEditInput: {
    minWidth: 80, paddingVertical: 2, paddingHorizontal: 6, borderRadius: Radius.sm, fontSize: FontSize.sm,
    borderWidth: 1, borderColor: Colors.accentLight, backgroundColor: Colors.inset, color: Colors.text1,
  },
  fieldError: { color: Colors.red, fontSize: FontSize.sm },
  emptySubText: { fontSize: FontSize.sm, color: Colors.text3, fontStyle: 'italic' },
  addSubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addSubInput: {
    flex: 1, minHeight: 44, paddingVertical: 9, paddingHorizontal: 12, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inset, color: Colors.text1, fontSize: FontSize.base,
  },
  addSubBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 12 },
  addSubBtnText: { color: Colors.accentLight, fontWeight: '600', fontSize: FontSize.base },
  groupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingVertical: Spacing.sm, minHeight: 56 },
  groupRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  groupRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  groupRowName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
}));
