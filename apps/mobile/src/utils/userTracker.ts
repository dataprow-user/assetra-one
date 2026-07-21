// Ported from apps/web/src/utils/userTracker.js — same Google Sheets webhook,
// just reading the URL from an EXPO_PUBLIC_ env var instead of a Vite one.
export function trackUserEvent(name?: string, email?: string, eventType?: string) {
  const webhookUrl = process.env.EXPO_PUBLIC_USER_LOG_WEBHOOK;
  if (!webhookUrl) return;

  try {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        name: name || 'Unknown',
        email: email || 'Unknown',
        event: eventType || 'Unknown Event',
      }),
    }).catch(() => {});
  } catch {
    // best-effort logging only
  }
}
