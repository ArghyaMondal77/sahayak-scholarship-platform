const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------- Simple JSON "database" ----------
const DB_PATH = path.join(__dirname, 'reminders.json');

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, '[]');
}

function readDb() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---------- Mail setup (never crashes on missing credentials) ----------
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const isLive = Boolean(EMAIL_USER && EMAIL_PASS);

const transporter = isLive
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })
  : null;

async function sendMail(to, subject, text) {
  if (!transporter) {
    console.log('[DEMO EMAIL]', JSON.stringify({ to, subject, text }, null, 2));
    return 'demo';
  }
  try {
    await transporter.sendMail({ from: EMAIL_USER, to, subject, text });
    return 'live';
  } catch (err) {
    console.error('Email send failed:', err.message);
    return 'demo';
  }
}

// ---------- Routes ----------
app.post('/api/reminders/subscribe', async (req, res) => {
  const { email, schemeId, schemeName, deadlineDate, officialUrl, documents } = req.body || {};

  if (!email || !schemeId || !deadlineDate) {
    return res
      .status(400)
      .json({ ok: false, message: 'email, schemeId and deadlineDate are required' });
  }

  const normEmail = String(email).trim().toLowerCase();
  const docs = Array.isArray(documents) ? documents : [];
  const db = readDb();

  const exists = db.some((r) => r.email === normEmail && r.schemeId === schemeId);
  if (!exists) {
    db.push({
      email: normEmail,
      schemeId,
      schemeName,
      deadlineDate,
      officialUrl,
      documents: docs,
      createdAt: new Date().toISOString(),
    });
    writeDb(db);
  }

  const name = schemeName || schemeId;
  const docsText = docs.length ? docs.join(', ') : 'None listed';
  const text =
    `Your reminders are enabled for ${name}.\n\n` +
    `Scheme: ${name}\n` +
    `Deadline: ${deadlineDate}\n` +
    `Documents required: ${docsText}\n` +
    `Official URL: ${officialUrl || 'N/A'}\n\n` +
    `Automated alerts are sent 30 days, 7 days and 1 day before the deadline.`;

  const sentMode = await sendMail(normEmail, `Sahayak: reminders enabled for ${name}`, text);

  if (sentMode === 'live') {
    return res.json({ ok: true, mode: 'live', message: 'Confirmation email sent to ' + normEmail });
  }
  return res.json({
    ok: true,
    mode: 'demo',
    message:
      'Reminder scheduled (Demo Mode — add Gmail App Password in server/.env to send live emails)',
  });
});

app.get('/api/reminders/:email', (req, res) => {
  const normEmail = String(req.params.email).trim().toLowerCase();
  const schemeIds = readDb()
    .filter((r) => r.email === normEmail)
    .map((r) => r.schemeId);
  res.json({ ok: true, schemeIds });
});

// ---------- Daily reminder job (09:00 every day) ----------
cron.schedule('0 9 * * *', async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const db = readDb();

  for (const sub of db) {
    const daysLeft = Math.round(
      (Date.parse(sub.deadlineDate + 'T00:00:00') - startOfToday) / 86400000
    );
    if ([30, 7, 1].includes(daysLeft)) {
      await sendMail(
        sub.email,
        `Sahayak reminder: ${sub.schemeName} deadline in ${daysLeft} day(s)`,
        `Reminder: Please apply for ${sub.schemeName} before ${sub.deadlineDate}. If already completed, please ignore.`
      );
    }
  }
});

// ---------- Serverless-style API handlers (ESM modules shared with Vercel /api) ----------
async function loadApiHandlers() {
  let chatHandler = null;
  try {
    const chatModule = await import('../api/chat.js');
    if (typeof chatModule.default !== 'function') {
      throw new Error('api/chat.js has no default export function');
    }
    chatHandler = chatModule.default;
  } catch (err) {
    console.error('Failed to load api/chat.js:', err);
  }

  app.post('/api/chat', async (req, res) => {
    if (!chatHandler) {
      return res.status(500).json({ ok: false, message: 'Chat handler failed to load' });
    }
    try {
      await chatHandler(req, res);
    } catch (err) {
      console.error('/api/chat failed:', err);
      if (!res.headersSent) res.status(500).json({ ok: false, message: 'Internal server error' });
    }
  });

  const subscribeModule = await import('../api/subscribe.js');

  app.post('/api/subscribe', async (req, res) => {
    try {
      await subscribeModule.default(req, res);
    } catch (err) {
      console.error('/api/subscribe failed:', err);
      if (!res.headersSent) res.status(500).json({ ok: false, message: 'Internal server error' });
    }
  });
}

loadApiHandlers()
  .catch((err) => console.error('Failed to load API handlers:', err))
  .then(() => {
    app.listen(PORT, () => console.log('Sahayak reminder server on http://localhost:' + PORT));
  });
