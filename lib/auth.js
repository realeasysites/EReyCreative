const crypto = require('crypto');

// No default password: the dashboard stays locked until ADMIN_PASSWORD (8+ chars) and SESSION_SECRET are set.
const ADMIN_USER = process.env.ADMIN_USER || 'erik';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const COOKIE = 'erc_admin';
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

const configured = () => ADMIN_PASSWORD.length >= 8 && SESSION_SECRET.length >= 16;

const sign = (value) => crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function checkCredentials(user, pass) {
  if (!configured()) return false;
  // evaluate both so timing doesn't reveal which one was wrong
  const okUser = safeEqual(user || '', ADMIN_USER);
  const okPass = safeEqual(pass || '', ADMIN_PASSWORD);
  return okUser && okPass;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function issueSession(res) {
  const exp = String(Date.now() + MAX_AGE_MS);
  const token = exp + '.' + sign(exp);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_MS / 1000}${secure}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function isAuthed(req) {
  if (!configured()) return false;
  const token = parseCookies(req)[COOKIE];
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

// Page routes redirect to the login screen; API routes answer with JSON 401.
const requireAdminPage = (req, res, next) => (isAuthed(req) ? next() : res.redirect('/admin/login'));
const requireAdminApi = (req, res, next) => (isAuthed(req) ? next() : res.status(401).json({ error: 'Not signed in' }));

module.exports = { configured, checkCredentials, issueSession, clearSession, isAuthed, requireAdminPage, requireAdminApi };
