import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Parses a deadline string into { year, month, day }, or null if it cannot be read.
// Accepts YYYY-MM-DD, DD/MM/YYYY (or DD-MM-YYYY, DD.MM.YYYY), and text dates that contain a 4-digit year.
export function parseDeadline(text) {
  const s = String(text ?? '').trim();
  let year;
  let month;
  let day;

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else {
    if (!/\d{4}/.test(s)) return null;
    const t = new Date(s);
    if (Number.isNaN(t.getTime())) return null;
    year = t.getFullYear();
    month = t.getMonth() + 1;
    day = t.getDate();
  }

  // Round-trip check rejects impossible dates such as 31/02/2025.
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

// RFC 5545 text escaping.
function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Folds content lines longer than 75 characters, per RFC 5545.
function foldIcsLine(line) {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) {
    parts.push(` ${line.slice(i, i + 74)}`);
  }
  return parts.join('\r\n');
}

const MONTH =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const ORDINAL = '(?:st|nd|rd|th)?';
const MONTH_NUMBER = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const monthNumber = (word) => MONTH_NUMBER[word.slice(0, 3).toLowerCase()];

// Date patterns for getDeadlineDate, matched case-insensitively.
const FULL_DAY_MONTH_YEAR = new RegExp(`\\b(\\d{1,2})${ORDINAL}\\s+(?:of\\s+)?${MONTH}\\.?,?\\s+(\\d{4})(?!\\d)`, 'i');
const FULL_MONTH_DAY_YEAR = new RegExp(`\\b${MONTH}\\.?\\s+(\\d{1,2})${ORDINAL},?\\s+(\\d{4})(?!\\d)`, 'i');
const MONTH_YEAR = new RegExp(`\\b${MONTH}\\.?,?\\s+(\\d{4})(?!\\d)`, 'i');
const MONTH_DAY = new RegExp(`\\b${MONTH}\\.?\\s+(\\d{1,2})${ORDINAL}\\b(?!,?\\s*\\d{4})`, 'i');
const DAY_MONTH = new RegExp(`\\b(\\d{1,2})${ORDINAL}\\s+(?:of\\s+)?${MONTH}\\b(?!\\.?,?\\s*\\d{4})`, 'i');
const ISO_DATE = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;
const YEAR_OR_RANGE = /\b(20\d{2})(?!\d)(?:\s*[-–]\s*(\d{2}|20\d{2})(?!\d))?/;

// Returns the deadline as a local Date. Never null: rolling or unannounced deadlines use 45 days from today.
// The earliest matching date in the string wins; ties go to the pattern listed first.
export function getDeadlineDate(scheme) {
  const s = String(scheme?.deadline ?? '');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const makeDate = (y, m, d) => {
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
  };
  // Next occurrence of month/day that is today or later.
  const nextOccurrence = (m, d) => {
    for (let y = today.getFullYear(); y <= today.getFullYear() + 4; y += 1) {
      const dt = makeDate(y, m, d);
      if (dt && dt >= today) return dt;
    }
    return null;
  };

  const candidates = [
    { re: FULL_DAY_MONTH_YEAR, build: (m) => makeDate(Number(m[3]), monthNumber(m[2]), Number(m[1])) },
    { re: FULL_MONTH_DAY_YEAR, build: (m) => makeDate(Number(m[3]), monthNumber(m[1]), Number(m[2])) },
    // Day 0 of the following month is the last day of the named month.
    { re: MONTH_YEAR, build: (m) => new Date(Number(m[2]), monthNumber(m[1]), 0) },
    { re: MONTH_DAY, build: (m) => nextOccurrence(monthNumber(m[1]), Number(m[2])) },
    { re: DAY_MONTH, build: (m) => nextOccurrence(monthNumber(m[2]), Number(m[1])) },
    { re: ISO_DATE, build: (m) => makeDate(Number(m[1]), Number(m[2]), Number(m[3])) },
    {
      re: YEAR_OR_RANGE,
      build: (m) => {
        const start = Number(m[1]);
        // "2026-27" ends in the second year; a 2-digit end is completed with the century of the start.
        const end = m[2] ? Number(m[2].length === 2 ? `${String(start).slice(0, 2)}${m[2]}` : m[2]) : null;
        const dt = end ? new Date(end, 2, 31) : new Date(start, 11, 31);
        return dt >= today ? dt : null;
      },
    },
  ];

  let best = null;
  for (const { re, build } of candidates) {
    const m = s.match(re);
    const dt = m ? build(m) : null;
    if (dt && (!best || m.index < best.index)) best = { index: m.index, date: dt };
  }
  if (best) return best.date;
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 45);
}

// Builds an all-day iCalendar reminder for the scheme deadline, with display alarms 30, 7 and 1 days before.
export function buildIcsReminder(scheme, benefit = '') {
  const date = getDeadlineDate(scheme);

  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const dayStamp = (d) => `${pad(d.getFullYear(), 4)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const dtStart = dayStamp(date);
  const dtEnd = dayStamp(nextDay);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const docs = (scheme.documents || []).map((d, i) => `${i + 1}. ${d}`);
  const description = [
    `Benefit: ${benefit}`,
    `Deadline: ${scheme.deadline}`,
    'Required documents:',
    ...docs,
    `Official URL: ${scheme.official_url}`,
  ].join('\n');

  const alarmText = escapeIcsText(
    `Reminder: Please apply for ${scheme.name} before the deadline. If already completed, please ignore.`,
  );
  const alarm = (trigger) => [
    'BEGIN:VALARM',
    `TRIGGER:${trigger}`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${alarmText}`,
    'END:VALARM',
  ];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sahayak//Scheme Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(scheme.id)}-${dtStart}@sahayak`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeIcsText(`Deadline: ${scheme.name}`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${escapeIcsText(scheme.official_url)}`,
    ...alarm('-P30D'),
    ...alarm('-P7D'),
    ...alarm('-P1D'),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

// Per-user storage key for reminder preferences.
const reminderKey = (email) => `sahayak_reminders_${email.toLowerCase()}`;

// Returns the saved { phone, scheduleAlerts } for this user, or null when logged out or nothing is saved.
export function readReminderState(email) {
  if (!email) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(reminderKey(email)) ?? 'null');
    if (!saved || typeof saved !== 'object') return null;
    return {
      phone: typeof saved.phone === 'string' ? saved.phone : '',
      scheduleAlerts: saved.scheduleAlerts !== false,
    };
  } catch {
    return null;
  }
}


function icsFilename(name) {
  const base = String(name ?? '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return `${base || 'scheme'}_deadline.ics`;
}

function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function WhatsAppModal({ scheme, benefit = '', onClose }) {
  const { user: currentUser } = useAuth();
  const email = currentUser?.email ? currentUser.email.toLowerCase() : '';
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [scheduleAlerts, setScheduleAlerts] = useState(true);
  const [alertsSaved, setAlertsSaved] = useState(false);

  // Pre-fill the saved number and alert toggle for the logged-in user.
  useEffect(() => {
    const saved = readReminderState(email);
    if (!saved) return;
    setPhone(saved.phone);
    setScheduleAlerts(saved.scheduleAlerts);
    setAlertsSaved(true);
  }, [email]);

  // Persists only for a logged-in user; nothing is stored when logged out.
  const persistReminder = (nextPhone, nextScheduleAlerts) => {
    if (!email) return;
    localStorage.setItem(
      reminderKey(email),
      JSON.stringify({ phone: nextPhone, scheduleAlerts: nextScheduleAlerts }),
    );
    setAlertsSaved(true);
  };

  const docs = scheme.documents || [];
  const message = [
    `Sahayak reminder: ${scheme.name}`,
    `Benefit: ${benefit}`,
    `Deadline: ${scheme.deadline}`,
    `Official URL: ${scheme.official_url}`,
    'Required documents:',
    ...docs.map((d, i) => `${i + 1}. ${d}`),
  ].join('\n');

  const handleSend = () => {
    let url;
    if (phone.trim() === '') {
      setPhoneError('');
      url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    } else {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        setPhoneError('Enter exactly 10 digits, or leave the number blank.');
        return;
      }
      setPhoneError('');
      url = `https://wa.me/91${digits}?text=${encodeURIComponent(message)}`;
    }
    persistReminder(phone, scheduleAlerts);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    persistReminder(phone, scheduleAlerts);
    downloadIcs(icsFilename(scheme.name), buildIcsReminder(scheme, benefit));
  };


  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-modal-title"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="whatsapp-modal-title" className="font-display text-xl font-semibold text-ink">
            WhatsApp Reminder
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-ink/70 hover:bg-stone-100"
          >
            <X size={20} />
          </button>
        </div>

        <dl className="mt-4 flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">Scheme Name</dt>
            <dd className="text-ink">{scheme.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">Matched Benefit</dt>
            <dd className="text-ink/80">{benefit || 'See scheme details'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">Deadline</dt>
            <dd className="text-ink/80">{scheme.deadline}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">Official URL</dt>
            <dd className="break-all text-ink/80">{scheme.official_url}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">Required Documents</dt>
            <dd className="text-ink/80">
              <ul className="list-disc pl-5">
                {docs.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <label htmlFor="whatsapp-phone" className="text-xs font-semibold uppercase tracking-wide text-ink/60">
            WhatsApp number (optional)
          </label>
          <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-stone-300 bg-white">
            <span className="flex items-center bg-stone-100 px-3 text-sm font-medium text-ink/70">+91</span>
            <input
              id="whatsapp-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError('');
              }}
              className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-ink/60">
            Enter your or your parent&apos;s WhatsApp number to send directly, or leave blank to pick a contact in WhatsApp.
          </p>
          {phoneError && <p role="alert" className="mt-1 text-sm text-red-600">{phoneError}</p>}
        </div>

        <div className="mt-5">
          <label className="flex items-center gap-3 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={scheduleAlerts}
              onChange={(e) => {
                setScheduleAlerts(e.target.checked);
                persistReminder(phone, e.target.checked);
              }}
              className="h-4 w-4 accent-[#059669]"
            />
            Schedule 30-day, 7-day &amp; 1-day alerts
          </label>
          {scheduleAlerts && alertsSaved && (
            <span className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#059669]">
              Alerts Scheduled (30d / 7d / 1d)
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSend}
            className="bg-[#059669] hover:bg-emerald-700 text-white rounded-xl py-2 px-3 text-sm font-medium flex items-center justify-center gap-2"
          >
            Open &amp; Send on WhatsApp
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-xl border border-stone-300 py-2 px-3 text-sm font-medium text-ink hover:bg-stone-50"
          >
            Download 3-Alert Calendar (.ics)
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
