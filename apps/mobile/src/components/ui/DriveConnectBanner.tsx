import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CloudUpload } from 'lucide-react-native';
import { getDriveAuth, useGoogleDriveConnect } from '../../utils/googleDriveSync';
import { Colors, Radius, FontSize, Spacing } from '../../constants/theme';

// Mirrors web App.jsx's DriveConnectBanner — shown on Home until Drive is
// connected. "Not Now" only dismisses for this app session (plain component
// state, not persisted), so it reappears next time the app opens, same as web.
export default function DriveConnectBanner() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');
  const { connect } = useGoogleDriveConnect();

  useEffect(() => {
    (async () => setConnected(!!(await getDriveAuth())))();
  }, []);

  if (connected === null || connected || dismissed) return null;

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      await connect();
      setConnected(true);
    } catch (e: any) {
      setError(e?.message || 'Connection failed.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        <CloudUpload size={18} color={Colors.accentLight} />
        <View style={{ flex: 1 }}>
          <Text style={styles.text}>
            <Text style={styles.bold}>Connect Google Drive</Text> — back up and sync your data automatically.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={handleConnect} disabled={connecting} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>{connecting ? 'Connecting…' : '☁ Connect Google Drive'}</Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)} style={styles.ghostBtn}>
          <Text style={styles.ghostText}>Not Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(99,102,241,0.12)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  text: { color: Colors.text1, fontSize: FontSize.base, lineHeight: 19 },
  bold: { fontWeight: '700' },
  error: { color: Colors.red, fontSize: FontSize.sm, marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  primaryBtn: { flex: 1, backgroundColor: Colors.accent, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: FontSize.sm },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, backgroundColor: Colors.panel },
  ghostText: { color: Colors.text2, fontWeight: '600', fontSize: FontSize.sm },
});
