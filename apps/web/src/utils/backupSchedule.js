/**
 * backupSchedule.js
 * Manages backup schedule preference and last-backup timestamp in localStorage.
 */

const SCHEDULE_KEY    = 'a1_backup_schedule';
const LAST_BACKUP_KEY = 'a1_backup_last';

export const SCHEDULE_OPTIONS = [
  { value: 'off',     label: 'Off',     desc: 'No automatic backups' },
  { value: 'daily',   label: 'Daily',   desc: 'Every 24 hours' },
  { value: 'weekly',  label: 'Weekly',  desc: 'Every 7 days' },
  { value: 'monthly', label: 'Monthly', desc: 'Every 30 days' },
  { value: 'yearly',  label: 'Yearly',  desc: 'Every 365 days' },
];

const SCHEDULE_MS = {
  daily:   24 * 60 * 60 * 1000,
  weekly:  7  * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly:  365 * 24 * 60 * 60 * 1000,
};

export function getBackupSchedule()  { return localStorage.getItem(SCHEDULE_KEY)    || 'off'; }
export function setBackupSchedule(v) { localStorage.setItem(SCHEDULE_KEY, v); }
export function getLastBackupTime()  { return localStorage.getItem(LAST_BACKUP_KEY) || null; }
export function setLastBackupTime()  { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); }

const SYNC_FORMAT_KEY = 'a1_sync_format';

export function getSyncFormat()  { return localStorage.getItem(SYNC_FORMAT_KEY) || 'json'; }
export function setSyncFormat(v) { localStorage.setItem(SYNC_FORMAT_KEY, v); }

export function isBackupDue() {
  const schedule = getBackupSchedule();
  if (schedule === 'off') return false;
  const ms = SCHEDULE_MS[schedule];
  if (!ms) return false;
  const last = getLastBackupTime();
  if (!last) return true;
  return (Date.now() - new Date(last).getTime()) >= ms;
}

export function lastBackupLabel() {
  const last = getLastBackupTime();
  if (!last) return 'Never';
  return new Date(last).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
