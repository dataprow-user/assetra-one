import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Shield } from 'lucide-react-native';
import AppModal from './ui/AppModal';
import Button from './ui/Button';
import { Colors, FontSize, Spacing } from '../constants/theme';

// Mirrors apps/web/src/components/PrivacyPolicyModal.jsx — same content,
// shared by Login and Settings.
export default function PrivacyPolicyModal({ onClose }: { onClose: () => void }) {
  return (
    <AppModal
      visible
      title="Privacy Policy"
      onClose={onClose}
      footer={<Button title="I Understand" onPress={onClose} />}
    >
      <View style={styles.headerRow}>
        <Shield size={30} color={Colors.green} />
        <View style={{ flex: 1 }}>
          <Text style={styles.h3}>Your Privacy Matters</Text>
          <Text style={styles.metaText}>Effective Date: {new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      <Text style={styles.h4}>1. Data Storage</Text>
      <Text style={styles.body}>
        Assetra One is a client-side application. This means all of your financial data — including accounts,
        transactions, assets, and liabilities — is stored <Text style={styles.bold}>locally on your device</Text>.
        We do not transmit, process, or store your sensitive financial data on any external servers.
      </Text>

      <Text style={styles.h4}>2. Cloud Sync (Google Drive)</Text>
      <Text style={styles.body}>
        If you choose to enable the Google Drive Backup feature, Assetra One will securely authenticate with your
        Google account. The application requests the <Text style={styles.bold}>narrowest possible permissions</Text>{' '}
        (drive.file), meaning it can only view and manage the specific backup files it creates inside your Drive. It
        cannot see or access your other Google Drive files.
      </Text>

      <Text style={styles.h4}>3. User Tracking</Text>
      <Text style={styles.body}>
        To improve the application and understand usage, the developer logs basic account creation and login
        events. When you create an account, sign in, or connect your Google Drive, we collect your{' '}
        <Text style={styles.bold}>Name and Email Address</Text>. This information is used strictly for internal
        usage analytics and to provide support. We never sell or share your email with third parties.
      </Text>

      <Text style={styles.h4}>4. Data Deletion</Text>
      <Text style={styles.body}>
        Because your financial data is stored on your device, you have complete control over it. You can
        permanently delete all data at any time by going to{' '}
        <Text style={styles.bold}>Settings → Danger Zone → Reset All Data</Text>.
      </Text>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  h3: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text1 },
  metaText: { fontSize: FontSize.sm, color: Colors.text2, marginTop: 2 },
  h4: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text1, marginTop: Spacing.lg, marginBottom: 6 },
  body: { fontSize: FontSize.base, color: Colors.text2, lineHeight: 20 },
  bold: { fontWeight: '700', color: Colors.text1 },
});
