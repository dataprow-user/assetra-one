import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/AppText';
import { Info } from 'lucide-react-native';
import { useApp, DEFAULT_ASSET_TYPES } from '../../context/AppContext';
import { Button, AppModal, FormField, SelectField, DateField } from '../ui';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_NOTES_LENGTH, sanitizeNumericInput } from '../../utils/validation';
import { localISO } from '../../utils/entities';

const TYPE_UNIT: Record<string, string> = {
  gold: 'grams', mutual_fund: 'units', stock: 'shares', fd: 'months', pf: '₹ balance',
  nps: '₹ balance', property: 'sqft', crypto: 'coins', other: 'units',
};

const NUMERIC_RULES = {
  quantity: { label: 'Quantity', min: 0 },
  purchasePrice: { label: 'Purchase Price', min: 0 },
  currentPrice: { label: 'Current Price', min: 0 },
};

const emptyForm = (defaultType: string) => ({
  name: '', type: defaultType, quantity: '', unit: TYPE_UNIT[defaultType] || 'units',
  purchasePrice: '', currentPrice: '', notes: '', valueAsOf: localISO(new Date()),
});

const fromEntity = (a: any) => ({
  ...a,
  quantity: String(a.quantity ?? ''),
  purchasePrice: String(a.purchasePrice ?? a.avgPrice ?? ''),
  currentPrice: String(a.currentPrice ?? ''),
  notes: a.notes || '',
  valueAsOf: a.valueAsOf || localISO(new Date()),
});

export default function AssetFormModal({ visible, entity, onClose, onSaved }: {
  visible: boolean; entity?: any; onClose: () => void; onSaved?: (asset: any) => void;
}) {
  const { state, dispatch, uid, fmt, fmtSigned } = useApp();
  const assetTypes = state.assetTypes && state.assetTypes.length > 0 ? state.assetTypes : DEFAULT_ASSET_TYPES;
  const [form, setForm] = useState<any>(() => (entity ? fromEntity(entity) : emptyForm(assetTypes[0]?.key || 'other')));
  const { errors, validate, reset: resetErrors } = useFieldErrors();

  useEffect(() => {
    if (!visible) return;
    setForm(entity ? fromEntity(entity) : emptyForm(assetTypes[0]?.key || 'other'));
    resetErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entity?.id]);

  const setNum = (field: 'quantity' | 'purchasePrice' | 'currentPrice') => (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate(field, val, NUMERIC_RULES[field]);
    setForm((f: any) => ({ ...f, [field]: val }));
  };

  const onTypeChange = (v: string) => setForm((f: any) => ({ ...f, type: v, unit: TYPE_UNIT[v] || 'units' }));

  const handleSubmit = () => {
    const qErr = validate('quantity', form.quantity, NUMERIC_RULES.quantity);
    const pErr = validate('purchasePrice', form.purchasePrice, NUMERIC_RULES.purchasePrice);
    const cErr = validate('currentPrice', form.currentPrice, NUMERIC_RULES.currentPrice);
    if (qErr || pErr || cErr) return;
    if (!String(form.name || '').trim()) return;

    const qty = Number(form.quantity), buy = Number(form.purchasePrice), curr = Number(form.currentPrice);
    const today = localISO(new Date());
    let valueAsOf = form.valueAsOf || today;
    if (entity) {
      const oldBuy = Number(entity.purchasePrice ?? entity.avgPrice ?? 0) || 0;
      const changed = qty !== (Number(entity.quantity) || 0) || buy !== oldBuy || curr !== (Number(entity.currentPrice) || 0);
      if (changed && form.valueAsOf === entity.valueAsOf) valueAsOf = today;
    }
    const payload = { ...form, name: String(form.name).trim(), quantity: qty, purchasePrice: buy, currentPrice: curr, avgPrice: buy, valueAsOf };
    const saved = entity ? { ...entity, ...payload, id: entity.id } : { ...payload, id: uid() };
    dispatch({ type: entity ? 'UPDATE_ASSET' : 'ADD_ASSET', payload: saved });
    onSaved?.(saved);
    onClose();
  };

  const liveQty = Number(form.quantity) || 0, liveBuy = Number(form.purchasePrice) || 0, liveCurr = Number(form.currentPrice) || 0;
  const liveCost = liveQty * liveBuy, liveVal = liveQty * liveCurr, liveGain = liveVal - liveCost;

  if (!visible) return null;
  return (
    <AppModal
      visible
      title={entity ? 'Edit Asset' : 'Add Asset'}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title={entity ? 'Update' : 'Add Asset'} onPress={handleSubmit} style={{ flex: 1 }} />
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
        onChangeText={setNum('quantity')} error={errors.quantity} placeholder="e.g. 10" />
      <FormField label="Unit" hint="(grams / shares / units)" value={form.unit}
        onChangeText={(v) => setForm((f: any) => ({ ...f, unit: v }))} maxLength={MAX_SHORT_LENGTH} placeholder="e.g. grams" />
      <FormField label="Purchase Price ₹" hint="(per unit, what you paid)" keyboardType="decimal-pad" value={form.purchasePrice}
        onChangeText={setNum('purchasePrice')} error={errors.purchasePrice} placeholder="0" />
      <FormField label="Current Price ₹" hint="(per unit, today)" keyboardType="decimal-pad" value={form.currentPrice}
        onChangeText={setNum('currentPrice')} error={errors.currentPrice} placeholder="0" />
      <DateField label="Figures are as of" value={form.valueAsOf} onChange={(v) => setForm((f: any) => ({ ...f, valueAsOf: v }))} maximumDate={new Date()} />
      <Text style={styles.asOfHint}>Investments you record after this date are added to the value automatically.</Text>

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
  );
}

const styles = createStyles(() => ({
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  helpBox: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: Colors.panel,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  helpText: { flex: 1, color: Colors.text2, fontSize: FontSize.sm, lineHeight: 18 },
  asOfHint: { color: Colors.text2, fontSize: FontSize.sm, marginTop: -8, marginBottom: Spacing.lg },
  calcPreview: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.inset,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  calcItem: { flex: 1, alignItems: 'center', gap: 2 },
  calcLabel: { fontSize: FontSize.xs, color: Colors.text2 },
  calcValue: { fontSize: FontSize.md, fontWeight: '700' },
}));
