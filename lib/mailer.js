const nodemailer = require('nodemailer');

// Email alerts are optional. Set SMTP_USER + SMTP_PASS (a Gmail app password works) and NOTIFY_EMAIL to turn them on.
// Without them, inquiries are still saved and visible in /admin.
let transporter = null;
function getTransport() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || 'true') !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function notifyInquiry(q) {
  const t = getTransport();
  const to = process.env.NOTIFY_EMAIL;
  if (!t || !to) return false;

  const label = q.category === 'architecture' ? 'Architecture inquiry' : q.category === 'photography' ? 'Photography inquiry' : 'New message';
  const rows = [
    ['Name', q.name], ['Email', q.email], ['Phone', q.phone], ['Topic', q.topic],
    ['Project type', q.project_type], ['Location', q.location], ['Timeline', q.timeline], ['Budget', q.budget],
  ].filter((r) => r[1]);
  const site = (process.env.SITE_URL || '').replace(/\/$/, '');

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
    <h2 style="margin:0 0 12px">${esc(label)}</h2>
    <table cellpadding="6" style="border-collapse:collapse">${rows.map((r) => `<tr><td style="color:#666">${r[0]}</td><td><b>${esc(r[1])}</b></td></tr>`).join('')}</table>
    ${q.message ? `<p style="white-space:pre-wrap;border-left:3px solid #b4694a;padding-left:12px;margin:16px 0">${esc(q.message)}</p>` : ''}
    ${site ? `<p><a href="${site}/admin">Open the dashboard</a></p>` : ''}
  </div>`;
  const text = rows.map((r) => `${r[0]}: ${r[1]}`).join('\n') + (q.message ? `\n\n${q.message}` : '') + (site ? `\n\n${site}/admin` : '');

  await t.sendMail({
    from: `"Erik Reynolds Creative" <${process.env.SMTP_USER}>`,
    to,
    replyTo: q.email,
    subject: `${label}: ${q.name}${q.topic ? ' (' + q.topic.replace(/^Architecture: /, '') + ')' : ''}`,
    text,
    html,
  });
  return true;
}

module.exports = { notifyInquiry };
