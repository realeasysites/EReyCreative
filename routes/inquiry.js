const express = require('express');
const db = require('../db');
const { notifyInquiry } = require('../lib/mailer');

const router = express.Router();

// Simple in-memory rate limit: 5 submissions per IP per hour.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 60 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  if (list.length >= 5) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  return false;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600000)) hits.delete(k); }, 600000).unref();

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

router.post('/api/inquiry', (req, res) => {
  const b = req.body || {};

  // Honeypot: real visitors never see or fill the "website" field. Pretend success to bots.
  if (clean(b.website, 200)) return res.json({ ok: true });

  if (limited(req.ip)) return res.status(429).json({ error: 'Too many messages from this connection. Please try again later, or email Erik directly.' });

  const q = {
    topic: clean(b.topic, 120),
    name: clean(b.name, 120),
    email: clean(b.email, 200),
    phone: clean(b.phone, 40),
    project_type: clean(b.project_type, 120),
    location: clean(b.location, 160),
    timeline: clean(b.timeline, 80),
    budget: clean(b.budget, 80),
    message: clean(b.message, 4000),
  };
  if (!q.name) return res.status(400).json({ error: 'Please add your name.' });
  if (!EMAIL.test(q.email)) return res.status(400).json({ error: 'Please add a valid email so Erik can write back.' });

  const hint = clean(b.category, 20).toLowerCase();
  q.category = hint === 'architecture' || /^architecture/i.test(q.topic) ? 'architecture'
    : /^photography/i.test(q.topic) ? 'photography' : 'general';

  if (q.category === 'architecture' && !q.topic) q.topic = 'Architecture: ' + (q.project_type || 'inquiry');

  const info = db.prepare(`INSERT INTO inquiries (category, topic, name, email, phone, project_type, location, timeline, budget, message)
    VALUES (@category, @topic, @name, @email, @phone, @project_type, @location, @timeline, @budget, @message)`).run(q);

  // Respond right away; the email goes out in the background so a mail problem never loses or delays an inquiry.
  res.json({ ok: true, id: info.lastInsertRowid });
  notifyInquiry(q).catch((err) => console.error('[mail] notify failed:', err.message));
});

module.exports = router;
