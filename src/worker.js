export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/quote' && request.method === 'POST') {
      let data;
      try {
        data = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid request body' }, 400);
      }

      const { name, email, phone, service, message } = data;

      if (!name || !email || !service || !message) {
        return jsonResponse({ error: 'Missing required fields' }, 400);
      }

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'quotes@nexgenglass.net',
          to: 'info@nexgenglass.net',
          reply_to: email,
          subject: `New Quote Request – ${service} (${name})`,
          html: quoteEmailHtml({ name, email, phone, service, message }),
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.text();
        console.error('Resend error:', err);
        return jsonResponse({ error: 'Failed to send email' }, 500);
      }

      return jsonResponse({ success: true });
    }

    // All other requests → static assets
    return env.ASSETS.fetch(request);
  },
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function quoteEmailHtml({ name, email, phone, service, message }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 24px;color:#000">New Quote Request</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;width:140px">Name</td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0">${escHtml(name)}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600">Email</td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0">${escHtml(email)}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600">Phone</td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0">${phone ? escHtml(phone) : '—'}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600">Service</td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0">${escHtml(service)}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;font-weight:600;vertical-align:top">Message</td>
      <td style="padding:10px 0;white-space:pre-wrap">${escHtml(message)}</td>
    </tr>
  </table>
  <p style="margin:32px 0 0;font-size:0.85em;color:#64748b">Sent from nexgenglass.net quote form</p>
</body>
</html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
