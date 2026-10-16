const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // Render sits behind a proxy; needed for real client IPs and secure cookies
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
});

app.use(express.json({ limit: '32kb' }));

app.use(require('./routes/inquiry'));
app.use(require('./routes/admin'));

app.get('/healthz', (req, res) => res.send('ok'));

// Static site. Images cache for a week; pages revalidate so edits show up quickly.
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders(res, file) {
    if (/\.(jpg|jpeg|png|webp|svg|ico)$/i.test(file)) res.set('Cache-Control', 'public, max-age=604800');
    else res.set('Cache-Control', 'no-cache');
  },
}));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' });
  res.status(err.status || 500).send('Something went wrong.');
});

app.listen(PORT, () => console.log(`Erik Reynolds Creative listening on ${PORT}`));
