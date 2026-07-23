import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Home, User, Save, LogOut, Trash2, RefreshCcw, FlaskConical,
  CheckCircle2, AlertTriangle, CloudUpload, Edit2, Download, Upload, FileSpreadsheet, Lock,
} from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Button, Badge, FormField, SelectField, AppModal, ScreenHeader, Toast } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { MAX_NAME_LENGTH } from '../../utils/validation';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { getDriveAuth, disconnectDrive, uploadToDrive, useGoogleDriveConnect } from '../../utils/googleDriveSync';
import { exportJSON, exportCSV, exportExcel, exportReport, pickBackupJson } from '../../utils/dataTransfer';
import PrivacyPolicyModal from '../../components/PrivacyPolicyModal';
import PinSetupModal from '../../components/PinSetupModal';
import { hasPin as checkHasPin, clearPin } from '../../utils/appLock';

const REPORT_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const LAST_BACKUP_KEY = 'a1_last_backup';
function formatBackup(ts: number | null): string {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Ported from apps/web/src/pages/Settings.jsx. Export/Import (JSON/Excel/CSV)
// and the backup-schedule picker are intentionally not ported here — they
// depend on expo-file-system / expo-document-picker / expo-sharing, which
// aren't installed in this app yet. Privacy Policy is a plain Alert instead
// of the full modal on web, since there's no dedicated policy content screen
// on mobile yet.

const RELATION_OPTIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

export default function Settings() {
  const { state, dispatch, currentUser, logout, uid, importData, setForceOnboarding } = useApp();
  const { toast, showToast } = useToast();
  const [showPrivacy, setShowPrivacy] = useState(false);

  // ── Household ────────────────────────────────────────────────────────────
  const [householdName, setHouseholdName] = useState(state.household?.name || '');
  const [saved, setSaved] = useState(false);

  const handleSaveHousehold = () => {
    dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { name: householdName } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── App Lock (PIN) ───────────────────────────────────────────────────────
  const [pinSet, setPinSet] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  useEffect(() => { checkHasPin().then(setPinSet); }, []);

  const handleRemovePin = () => {
    Alert.alert('Remove App PIN?', "You'll go straight to the app without a PIN prompt.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await clearPin(); setPinSet(false); showToast('success', 'App PIN removed.'); } },
    ]);
  };

  // ── Export / Import / Report ────────────────────────────────────────────
  const [exportModal, setExportModal] = useState(false);
  const handleExport = async (fmtType: 'json' | 'excel' | 'csv') => {
    setExportModal(false);
    try {
      if (fmtType === 'json') await exportJSON(state);
      else if (fmtType === 'csv') await exportCSV(state);
      else await exportExcel(state);
      showToast('success', 'Export ready — choose where to save or share it.');
    } catch (e: any) {
      showToast('error', e?.message || 'Export failed.');
    }
  };

  const handleImport = () => {
    Alert.alert(
      'Import backup',
      'This will REPLACE all current data with the contents of the backup file. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await pickBackupJson();
              if (!data) return;
              importData(data);
              const n = data.transactions?.length || 0;
              showToast('success', `Backup imported successfully — ${n} transaction${n === 1 ? '' : 's'} restored.`);
            } catch (e: any) {
              showToast('error', e?.message || "Couldn't read that file. Please pick an Assetra JSON backup.");
            }
          },
        },
      ],
    );
  };

  const now = new Date();
  const REPORT_YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const handleDownloadReport = async () => {
    try {
      const r = await exportReport(state, { period: reportPeriod, year: reportYear, month: reportMonth });
      showToast('success', `Report ready — ${r.count} transaction${r.count === 1 ? '' : 's'} in the period.`);
    } catch (e: any) {
      showToast('error', e?.message || 'Report generation failed.');
    }
  };

  // ── Google Drive ─────────────────────────────────────────────────────────
  const [driveConnected, setDriveConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'done' | 'error' | null>(null);
  const [lastBackup, setLastBackup] = useState('Never');
  const { connect } = useGoogleDriveConnect();

  useEffect(() => {
    (async () => {
      const auth = await getDriveAuth();
      setDriveConnected(!!auth);
      const raw = await AsyncStorage.getItem(LAST_BACKUP_KEY);
      setLastBackup(formatBackup(raw ? Number(raw) : null));
    })();
  }, []);

  const markBackupNow = async () => {
    const ts = Date.now();
    await AsyncStorage.setItem(LAST_BACKUP_KEY, String(ts));
    setLastBackup(formatBackup(ts));
  };

  const handleConnectDrive = async () => {
    setConnecting(true);
    try {
      await connect();
      setDriveConnected(true);
      showToast('success', 'Google Drive connected!');
    } catch (e: any) {
      showToast('error', 'Failed to connect: ' + (e?.message || 'Something went wrong.'));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectDrive = () => {
    Alert.alert('Disconnect Google Drive?', 'Automatic backup and sync will stop until you reconnect.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await disconnectDrive();
          setDriveConnected(false);
          showToast('success', 'Google Drive disconnected.');
        },
      },
    ]);
  };

  const handleSyncNow = async () => {
    setSyncStatus('syncing');
    try {
      await uploadToDrive(JSON.stringify(state), 'Assetra-Backup.json');
      await markBackupNow();
      setSyncStatus('done');
      showToast('success', 'Backup uploaded to Google Drive successfully!');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (e: any) {
      if (e?.message === 'AUTH_EXPIRED') {
        await disconnectDrive();
        setDriveConnected(false);
        showToast('error', 'Google Drive session expired. Please reconnect.');
      } else {
        showToast('error', 'Upload failed: ' + (e?.message || 'Something went wrong.'));
      }
      setSyncStatus('error');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  // ── Family Members ───────────────────────────────────────────────────────
  const memberList = state.household?.members || [];
  const [memberModal, setMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberForm, setMemberForm] = useState({ name: '', relation: RELATION_OPTIONS[0] });

  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm({ name: '', relation: RELATION_OPTIONS[0] });
    setMemberModal(true);
  };
  const openEditMember = (m: any) => {
    setEditingMember(m);
    setMemberForm({ name: m.name, relation: m.relation });
    setMemberModal(true);
  };

  const handleMemberSubmit = () => {
    if (!memberForm.name.trim()) return;
    const avatar = memberForm.name.slice(0, 2).toUpperCase();
    if (editingMember) {
      dispatch({ type: 'UPDATE_MEMBER', payload: { ...editingMember, name: memberForm.name, relation: memberForm.relation, avatar } });
      showToast('success', 'Member updated.');
    } else {
      dispatch({ type: 'ADD_MEMBER', payload: { name: memberForm.name, relation: memberForm.relation, avatar, id: uid() } });
      showToast('success', 'Member added.');
    }
    setMemberModal(false);
  };

  const handleDeleteMember = (id: string) => {
    Alert.alert('Remove this family member?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'DELETE_MEMBER', payload: id });
          showToast('success', 'Member removed.');
        },
      },
    ]);
  };

  // ── Danger Zone ──────────────────────────────────────────────────────────
  // Resetting is destructive, so a timestamped safety snapshot is saved first
  // (to Google Drive if connected, else a local backup file), then wiped.
  const doReset = async () => {
    let backedUp = false;
    if (driveConnected) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const d = new Date();
      const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
      try {
        await uploadToDrive(JSON.stringify(state), `Assetra-Backup-${stamp}.json`);
        backedUp = true;
      } catch {}
    } else {
      try { await exportJSON(state); backedUp = true; } catch {}
    }
    dispatch({ type: 'RESET_ALL' });
    showToast('success', backedUp ? 'Backup saved. Data cleared — signing out…' : 'Data cleared — signing out…');
    setTimeout(() => logout(), 1600);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data?',
      'This will permanently delete all your data — transactions, assets, accounts, budgets, events, insurance — and start completely fresh.\n\n' +
      (driveConnected
        ? 'A timestamped backup will be saved to your Google Drive (AssetraBackups) first, then you\'ll be signed out.'
        : 'You\'ll first be offered a backup file to save, then signed out.'),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Reset Everything', style: 'destructive', onPress: doReset },
      ],
    );
  };

  const handleLoadSample = () => {
    Alert.alert(
      'Load Sample Data?',
      'This will replace all your current data with the Kumar Family demo dataset.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Load Sample',
          onPress: () => {
            dispatch({ type: 'LOAD_SAMPLE_DATA' });
            showToast('success', 'Sample data loaded.');
          },
        },
      ],
    );
  };

  const initials = currentUser?.name?.slice(0, 2).toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Settings" subtitle="Manage your household, data, backup and account preferences" showBack hideEye />

        {/* App Lock */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Lock size={18} color={Colors.text2} />
            <Text style={styles.sectionTitle}>App Lock</Text>
          </View>
          <Text style={styles.sectionDesc}>
            {pinSet
              ? 'A PIN is required each time you open the app — no need to sign in with Google every time.'
              : 'Set a PIN to unlock the app quickly, without signing in with Google each time.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <Button title={pinSet ? 'Change PIN' : 'Set PIN'} icon={<Lock size={14} color="#fff" />} onPress={() => setShowPinSetup(true)} style={{ flex: 1 }} />
            {pinSet && <Button title="Remove PIN" variant="ghost" onPress={handleRemovePin} style={{ flex: 1 }} />}
          </View>
          {pinSet && (
            <Text style={styles.sectionDesc}>Forgot your PIN? Sign out and sign back in with Google, then set a new one here.</Text>
          )}
        </Card>

        {/* Household */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Home size={18} color={Colors.text2} />
            <Text style={styles.sectionTitle}>Household</Text>
          </View>
          <FormField
            label="Household Name"
            value={householdName}
            onChangeText={setHouseholdName}
            maxLength={MAX_NAME_LENGTH}
            placeholder="e.g. Kumar Family"
          />
          <Button title={saved ? 'Saved!' : 'Save Changes'} icon={<Save size={15} color="#fff" />} onPress={handleSaveHousehold} />
        </Card>

        {/* Profile */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <User size={18} color={Colors.text2} />
            <Text style={styles.sectionTitle}>Your Profile</Text>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{currentUser?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{currentUser?.email}</Text>
              <Badge label="Account Owner" color={Colors.accent2} style={{ marginTop: 6 }} />
            </View>
          </View>
          <View style={styles.profileActions}>
            <Button title="Sign Out" variant="danger" icon={<LogOut size={15} color={Colors.red} />} onPress={() => logout()} style={{ flex: 1 }} />
            <Button title="Privacy Policy" variant="ghost" onPress={() => setShowPrivacy(true)} style={{ flex: 1 }} />
          </View>
          <Button title="Replay Welcome Guide" variant="ghost" onPress={() => setForceOnboarding(true)} style={{ marginTop: Spacing.sm }} />
        </Card>

        {/* Export & Import */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Download size={18} color={Colors.text2} />
            <Text style={styles.sectionTitle}>Export & Import</Text>
          </View>
          <Text style={styles.sectionDesc}>Your data stays 100% private — export a backup or import one to restore.</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <Button title="Export Data" icon={<Download size={14} color="#fff" />} onPress={() => setExportModal(true)} style={{ flex: 1 }} />
            <Button title="Import Backup" variant="ghost" icon={<Upload size={14} color={Colors.text1} />} onPress={handleImport} style={{ flex: 1 }} />
          </View>
        </Card>

        {/* Download Report */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <FileSpreadsheet size={18} color={Colors.text2} />
            <Text style={styles.sectionTitle}>Download Report</Text>
          </View>
          <SelectField label="Period" value={reportPeriod} onChange={(v) => setReportPeriod(v as 'monthly' | 'yearly')}
            options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' }]} />
          {reportPeriod === 'monthly' && (
            <SelectField label="Month" value={String(reportMonth)} onChange={(v) => setReportMonth(Number(v))}
              options={REPORT_MONTHS.map((m, i) => ({ label: m, value: String(i + 1) }))} />
          )}
          <SelectField label="Year" value={String(reportYear)} onChange={(v) => setReportYear(Number(v))}
            options={REPORT_YEARS.map((y) => ({ label: String(y), value: String(y) }))} />
          <Button title="Download Report" icon={<Download size={14} color="#fff" />} onPress={handleDownloadReport} />
        </Card>

        {/* Google Drive Backup */}
        <Card style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <CloudUpload size={18} color={Colors.text2} />
            <Text style={styles.sectionTitle}>Google Drive Backup</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Connect your Google account to automatically backup your data securely to your Google Drive. The app
            only requests permission to view folders and manage files it creates itself.
          </Text>

          <View style={styles.driveRow}>
            {driveConnected ? (
              <CheckCircle2 size={32} color={Colors.green} />
            ) : (
              <AlertTriangle size={32} color={Colors.yellow} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.driveName}>{driveConnected ? currentUser?.name || 'Connected' : 'Google Drive not connected'}</Text>
              <Text style={styles.driveMeta}>
                {driveConnected ? `${currentUser?.email || ''} • Drive connected` : 'Connect to enable automatic cloud backup and sync.'}
              </Text>
            </View>
          </View>

          <Badge
            label={driveConnected ? '● Auto Sync: Enabled' : '○ Auto Sync: Disabled'}
            color={driveConnected ? Colors.green : Colors.text2}
            style={{ alignSelf: 'flex-start' }}
          />
          {driveConnected && (
            <Text style={styles.sectionDesc}>Changes save to Drive automatically a few seconds after you make them — no action needed.</Text>
          )}

          {driveConnected ? (
            <View style={styles.driveActions}>
              <Button
                title={syncStatus === 'syncing' ? 'Uploading…' : syncStatus === 'done' ? 'Done' : 'Sync Now'}
                icon={syncStatus === 'syncing' ? undefined : <CloudUpload size={14} color="#fff" />}
                loading={syncStatus === 'syncing'}
                onPress={handleSyncNow}
                size="sm"
                style={{ flex: 1 }}
              />
              <Button title="Disconnect" variant="ghost" size="sm" onPress={handleDisconnectDrive} style={{ flex: 1 }} />
            </View>
          ) : null}
          <Text style={styles.driveMeta}>Last backup: {lastBackup}</Text>
          {!driveConnected && (
            <Button
              title={connecting ? 'Connecting…' : 'Connect Google Drive'}
              icon={connecting ? undefined : <CloudUpload size={14} color="#fff" />}
              loading={connecting}
              onPress={handleConnectDrive}
              size="sm"
              style={{ marginTop: Spacing.md }}
            />
          )}
        </Card>

        {/* Family Members */}
        <Card style={styles.section}>
          <View style={styles.membersHeaderRow}>
            <Text style={styles.sectionTitle}>Family Members</Text>
            <Button title="Add Member" size="sm" variant="secondary" onPress={openAddMember} />
          </View>
          <Text style={styles.sectionDesc}>
            Assetra is a single-user account (you sign in with your own Google account). Add family members here
            only to label whose asset, expense, or account something belongs to — they don't get a separate login.
          </Text>

          {memberList.length === 0 ? (
            <Text style={styles.emptyMembersText}>No family members added yet.</Text>
          ) : (
            memberList.map((m: any) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{m.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRelation}>{m.relation}</Text>
                </View>
                <View style={styles.memberActions}>
                  <Pressable onPress={() => openEditMember(m)} hitSlop={8}>
                    <Edit2 size={15} color={Colors.text2} />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteMember(m.id)} hitSlop={8}>
                    <Trash2 size={15} color={Colors.red} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Danger Zone */}
        <Card style={[styles.section, styles.dangerCard]}>
          <View style={styles.sectionTitleRow}>
            <Trash2 size={18} color={Colors.red} />
            <Text style={[styles.sectionTitle, { color: Colors.red }]}>Danger Zone</Text>
          </View>

          <View style={styles.dangerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.dangerRowTitleRow}>
                <RefreshCcw size={14} color={Colors.text1} />
                <Text style={styles.dangerRowTitle}>Reset All Data</Text>
              </View>
              <Text style={styles.dangerRowDesc}>Wipes everything and starts fresh with empty data. Cannot be undone.</Text>
            </View>
            <Button title="Reset to Empty" variant="danger" size="sm" onPress={handleReset} />
          </View>

          <View style={styles.dangerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.dangerRowTitleRow}>
                <FlaskConical size={14} color={Colors.text1} />
                <Text style={styles.dangerRowTitle}>Load Sample Data</Text>
              </View>
              <Text style={styles.dangerRowDesc}>Replaces current data with the Kumar Family demo dataset.</Text>
            </View>
            <Button title="Load Sample" variant="secondary" size="sm" onPress={handleLoadSample} />
          </View>
        </Card>
      </ScrollView>

      {memberModal && (
        <AppModal
          visible
          title={editingMember ? 'Edit Member' : 'Add Family Member'}
          onClose={() => setMemberModal(false)}
          footer={
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setMemberModal(false)} style={{ flex: 1 }} />
              <Button title={editingMember ? 'Save Changes' : 'Add Member'} onPress={handleMemberSubmit} style={{ flex: 1 }} />
            </View>
          }
        >
          <FormField
            label="Full Name"
            value={memberForm.name}
            onChangeText={(v) => setMemberForm((f) => ({ ...f, name: v }))}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Full name"
          />
          <SelectField
            label="Relation"
            value={memberForm.relation}
            onChange={(v) => setMemberForm((f) => ({ ...f, relation: v }))}
            options={RELATION_OPTIONS.map((r) => ({ label: r, value: r }))}
          />
        </AppModal>
      )}

      {exportModal && (
        <AppModal visible title="Export Data" onClose={() => setExportModal(false)}>
          <Button title="JSON (full backup)" onPress={() => handleExport('json')} style={{ marginBottom: Spacing.md }} />
          <Button title="Excel (.xlsx)" variant="secondary" onPress={() => handleExport('excel')} style={{ marginBottom: Spacing.md }} />
          <Button title="CSV (transactions only)" variant="ghost" onPress={() => handleExport('csv')} />
        </AppModal>
      )}

      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
      {showPinSetup && (
        <PinSetupModal
          onClose={() => setShowPinSetup(false)}
          onSaved={() => { setShowPinSetup(false); setPinSet(true); showToast('success', 'App PIN saved.'); }}
        />
      )}
      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  section: { marginBottom: Spacing.lg, gap: Spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text1 },
  sectionDesc: { fontSize: FontSize.base, color: Colors.text2, lineHeight: 19 },

  // Profile
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: FontSize.lg },
  profileName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  profileEmail: { color: Colors.text2, fontSize: FontSize.base, marginTop: 1 },
  profileActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },

  // Drive
  driveRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.panelHover, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  driveName: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.md },
  driveMeta: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 1 },
  driveActions: { flexDirection: 'row', gap: Spacing.sm },

  // Members
  membersHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emptyMembersText: { color: Colors.text2, fontSize: FontSize.base },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.panelHover,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { color: Colors.accentLight, fontWeight: '700', fontSize: FontSize.base },
  memberName: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.md },
  memberRelation: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 1 },
  memberActions: { flexDirection: 'row', gap: Spacing.sm },

  // Danger zone
  dangerCard: { borderColor: 'rgba(244,63,94,0.3)' },
  dangerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md,
    paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  dangerRowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dangerRowTitle: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.base },
  dangerRowDesc: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 3 },

  // Modal
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
