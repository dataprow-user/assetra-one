import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Edit2, Tag, X, ChevronDown, ChevronRight, Layers } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Button, Badge, EmptyState, AppModal, FormField, SelectField, ScreenHeader } from '../../components/ui';
import { Colors, FontSize, Spacing, Radius, GroupColors } from '../../constants/theme';
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
  const [catForm, setCatForm] = useState<any>({ name: '', group: 'Needs' });
  const [groupForm, setGroupForm] = useState<any>({ name: '' });
  const [newSubInput, setNewSubInput] = useState<Record<string, string>>({});

  const categories = tab === 'income' ? incomeCategories : expenseCategories;
  const ADD_TYPE = tab === 'expense' ? 'ADD_EXPENSE_CATEGORY' : 'ADD_INCOME_CATEGORY';
  const UPD_TYPE = tab === 'expense' ? 'UPDATE_EXPENSE_CATEGORY' : 'UPDATE_INCOME_CATEGORY';
  const DEL_TYPE = tab === 'expense' ? 'DELETE_EXPENSE_CATEGORY' : 'DELETE_INCOME_CATEGORY';

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // ── Add / Edit Category ──
  const openAddCat = () => { setCatForm({ name: '', group: 'Needs' }); setModal('add-cat'); };
  const openEditCat = (cat: any) => { setCatForm({ ...cat }); setModal('edit-cat'); };
  const handleCatSubmit = () => {
    if (!catForm.name.trim()) return;
    if (modal === 'add-cat') dispatch({ type: ADD_TYPE, payload: { ...catForm, id: uid(), subcategories: [] } });
    else dispatch({ type: UPD_TYPE, payload: catForm });
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
    if (!val) return;
    if (cat.subcategories.includes(val)) { Alert.alert('Duplicate', 'Subcategory already exists.'); return; }
    dispatch({ type: UPD_TYPE, payload: { ...cat, subcategories: [...cat.subcategories, val] } });
    setNewSubInput((s) => ({ ...s, [cat.id]: '' }));
  };
  const handleDeleteSub = (cat: any, sub: string) => {
    dispatch({ type: UPD_TYPE, payload: { ...cat, subcategories: cat.subcategories.filter((s: string) => s !== sub) } });
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
    { key: 'expense', label: 'Expense Categories', count: expenseCategories.length },
    { key: 'income', label: 'Income Categories', count: incomeCategories.length },
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
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              <View style={[styles.countBadge, tab === t.key && styles.countBadgeActive]}>
                <Text style={[styles.countText, tab === t.key && styles.countTextActive]}>{t.count}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab !== 'group' && Object.entries(byGroup).map(([group, cats]) => (
          <Card key={group} style={styles.groupBlock}>
            <View style={styles.groupHeader}>
              <Badge label={group} color={GroupColors[group] || Colors.text2} />
              <Text style={styles.groupCount}>{cats.length} categories</Text>
            </View>

            {cats.map((cat: any) => (
              <View key={cat.id} style={styles.catRow}>
                <View style={styles.catRowHeader}>
                  <Pressable style={styles.catRowLeft} onPress={() => toggle(cat.id)} hitSlop={4}>
                    {expanded[cat.id] ? <ChevronDown size={15} color={Colors.text2} /> : <ChevronRight size={15} color={Colors.text2} />}
                    <Tag size={15} color={GroupColors[group] || Colors.accentLight} />
                    <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                    <View style={styles.subCountBadge}>
                      <Text style={styles.subCountText}>{cat.subcategories.length} subs</Text>
                    </View>
                  </Pressable>
                  <View style={styles.catRowActions}>
                    <Pressable onPress={() => openEditCat(cat)} hitSlop={8}><Edit2 size={14} color={Colors.text2} /></Pressable>
                    <Pressable onPress={() => handleDeleteCat(cat.id)} hitSlop={8}><Trash2 size={14} color={Colors.red} /></Pressable>
                  </View>
                </View>

                {expanded[cat.id] && (
                  <View style={styles.subPanel}>
                    <View style={styles.subChips}>
                      {cat.subcategories.map((sub: string) => (
                        <View key={sub} style={styles.subChip}>
                          <Text style={styles.subChipText}>{sub}</Text>
                          <Pressable onPress={() => handleDeleteSub(cat, sub)} hitSlop={8}>
                            <X size={12} color={Colors.text2} />
                          </Pressable>
                        </View>
                      ))}
                      {cat.subcategories.length === 0 && (
                        <Text style={styles.emptySubText}>No sub-categories yet</Text>
                      )}
                    </View>
                    <View style={styles.addSubRow}>
                      <TextInput
                        style={styles.addSubInput}
                        placeholder="New sub-category name…"
                        placeholderTextColor={Colors.text3}
                        maxLength={MAX_NAME_LENGTH}
                        value={newSubInput[cat.id] || ''}
                        onChangeText={(v) => setNewSubInput((s) => ({ ...s, [cat.id]: v }))}
                        onSubmitEditing={() => handleAddSub(cat)}
                      />
                      <Pressable style={styles.addSubBtn} onPress={() => handleAddSub(cat)}>
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
          <EmptyState icon={Tag} title="No Categories" description={'Tap "Add Category" to create your first category.'} />
        )}

        {tab === 'group' && (
          <Card style={styles.groupBlock}>
            {groups.map((g: any, i: number) => (
              <View key={g.id} style={[styles.groupRow, i < groups.length - 1 && styles.groupRowBorder]}>
                <View style={styles.groupRowLeft}>
                  <Layers size={18} color={GroupColors[g.name] || Colors.accentLight} />
                  <Text style={styles.groupRowName}>{g.name}</Text>
                </View>
                <View style={styles.catRowActions}>
                  <Pressable onPress={() => openEditGroup(g)} hitSlop={8}><Edit2 size={14} color={Colors.text2} /></Pressable>
                  <Pressable onPress={() => handleDeleteGroup(g.id)} hitSlop={8}><Trash2 size={14} color={Colors.red} /></Pressable>
                </View>
              </View>
            ))}
            {groups.length === 0 && <Text style={styles.emptySubText}>No groups found</Text>}
          </Card>
        )}
      </ScrollView>

      {(modal === 'add-cat' || modal === 'edit-cat') && (
        <AppModal visible title={modal === 'add-cat' ? 'Add Category' : 'Edit Category'} onClose={() => setModal(null)}>
          <FormField label="Category Name" value={catForm.name} onChangeText={(v) => setCatForm((f: any) => ({ ...f, name: v }))} maxLength={MAX_NAME_LENGTH} placeholder="e.g. Outside Food" />
          {tab === 'expense' && (
            <SelectField label="Group" value={catForm.group} onChange={(v) => setCatForm((f: any) => ({ ...f, group: v }))}
              options={groups.map((g: any) => ({ label: g.name, value: g.name }))} />
          )}
          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
            <Button title={modal === 'add-cat' ? 'Add' : 'Update'} onPress={handleCatSubmit} style={{ flex: 1 }} />
          </View>
        </AppModal>
      )}

      {(modal === 'add-group' || modal === 'edit-group') && (
        <AppModal visible title={modal === 'add-group' ? 'Add Group' : 'Edit Group'} onClose={() => setModal(null)}>
          <FormField label="Group Name" value={groupForm.name} onChangeText={(v) => setGroupForm((f: any) => ({ ...f, name: v }))} maxLength={MAX_NAME_LENGTH} placeholder="e.g. Discretionary" />
          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
            <Button title={modal === 'add-group' ? 'Add' : 'Update'} onPress={handleGroupSubmit} style={{ flex: 1 }} />
          </View>
        </AppModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.panel,
  },
  tabActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
  tabText: { color: Colors.text2, fontWeight: '500', fontSize: FontSize.sm },
  tabTextActive: { color: Colors.accentLight },
  countBadge: { paddingVertical: 1, paddingHorizontal: 7, borderRadius: Radius.pill, backgroundColor: Colors.panelHover },
  countBadgeActive: { backgroundColor: 'rgba(99,102,241,0.25)' },
  countText: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '700' },
  countTextActive: { color: Colors.accentLight },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  groupBlock: { gap: Spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  groupCount: { fontSize: FontSize.sm, color: Colors.text2 },
  catRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  catRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  catRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  catName: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.base, flexShrink: 1 },
  subCountBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: Radius.pill, backgroundColor: Colors.panelHover },
  subCountText: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },
  catRowActions: { flexDirection: 'row', gap: Spacing.sm },
  subPanel: { marginTop: Spacing.sm, marginLeft: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xs },
  subChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: Radius.pill, backgroundColor: Colors.panelHover, borderWidth: 1, borderColor: Colors.border,
  },
  subChipText: { color: Colors.text1, fontSize: FontSize.sm },
  emptySubText: { fontSize: FontSize.sm, color: Colors.text3, fontStyle: 'italic' },
  addSubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addSubInput: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 12, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.3)', color: Colors.text1, fontSize: FontSize.base,
  },
  addSubBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 9, paddingHorizontal: 12 },
  addSubBtnText: { color: Colors.accentLight, fontWeight: '600', fontSize: FontSize.base },
  groupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  groupRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  groupRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  groupRowName: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.base },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
