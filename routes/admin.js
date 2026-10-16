const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const auth = require('../lib/auth');

const router = express.Router();
const view = (name) => fs.readFileSync(path.join(__dirname, '..', 'views', name), 'utf8');

// Brute-force guard on login: 8 attempts per IP per 15 minutes.
const tries = new Map();
function tooManyTries(ip) {
  const now = Date.now(), win = 15 * 60 * 1000;
  const list = (tries.get(ip) || []).filter((t) => now - t < win);
  tries.set(ip, list);
  return list.length >= 8;
}
const noteTry = (ip) => tries.set(ip, [...(tries.get(ip) || []), Date.now()]);

router.get('/admin/login', (req, res) => {
  if (auth.isAuthed(req)) return res.redirect('/admin');
  const msg = !auth.configured()
    ? 'The dashboard is locked until ADMIN_PASSWORD (8+ characters) and SESSION_SECRET (16+ characters) are set in the host environment.'
    : req.query.e ? 'That did not match. Please try again.' : '';
  res.type('html').send(view('login.html').replace('{{MESSAGE}}', msg));
});

router.post('/admin/login', express.urlencoded({ extended: false, limit: '4kb' }), (req, res) => {
  if (tooManyTries(req.ip)) return res.status(429).type('html').send(view('login.html').replace('{{MESSAGE}}', 'Too many attempts. Please wait a few minutes.'));
  if (auth.checkCredentials(req.body.username, req.body.password)) {
    auth.issueSession(res);
    return res.redirect('/admin');
  }
  noteTry(req.ip);
  res.redirect('/admin/login?e=1');
});

router.post('/admin/logout', (req, res) => { auth.clearSession(res); res.redirect('/admin/login'); });

router.get('/admin', auth.requireAdminPage, (req, res) => res.type('html').send(view('admin.html')));

const STATUSES = ['new', 'contacted', 'in progress', 'won', 'closed'];

router.get('/api/admin/inquiries', auth.requireAdminApi, (req, res) => {
  const rows = db.prepare('SELECT * FROM inquiries ORDER BY datetime(created_at) DESC, id DESC LIMIT 1000').all();
  res.json({ inquiries: rows, statuses: STATUSES });
});

router.patch('/api/admin/inquiries/:id', auth.requireAdminApi, (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const cur = db.prepare('SELECT id FROM inquiries WHERE id = ?').get(id);
  if (!cur) return res.status(404).json({ error: 'Not found' });
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return res.status(400).json({ error: 'Bad status' });
    db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(b.status, id);
  }
  if (b.notes !== undefined) db.prepare('UPDATE inquiries SET notes = ? WHERE id = ?').run(String(b.notes).slice(0, 4000), id);
  res.json({ ok: true });
});

router.get('/admin/export.csv', auth.requireAdminPage, (req, res) => {
  const rows = db.prepare('SELECT * FROM inquiries ORDER BY datetime(created_at) DESC').all();
  const cols = ['id', 'created_at', 'category', 'topic', 'name', 'email', 'phone', 'project_type', 'location', 'timeline', 'budget', 'message', 'status', 'notes'];
  // Prefix cells that start with = + - @ so spreadsheets don't treat visitor text as a formula.
  const cell = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const csv = [cols.join(',')].concat(rows.map((r) => cols.map((c) => cell(r[c])).join(','))).join('\r\n');
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="inquiries.csv"' }).send(csv);
});

module.exports = router;
