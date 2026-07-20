export function trackUserEvent(name, email, eventType) {
  const webhookUrl = import.meta.env.VITE_USER_LOG_WEBHOOK;
  
  // If the developer hasn't set up the webhook yet, just silently return
  if (!webhookUrl || webhookUrl.trim() === '') return;

  try {
    // We send a POST request with the user's data to the Google Sheets Webhook
    fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // no-cors is important so browser doesn't block the request to google scripts
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        name: name || 'Unknown',
        email: email || 'Unknown',
        event: eventType || 'Unknown Event'
      })
    });
  } catch (err) {
    console.error('Failed to track user event', err);
  }
}
