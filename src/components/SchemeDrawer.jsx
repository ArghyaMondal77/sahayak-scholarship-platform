import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useUi } from '../context/UiContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../i18n/LanguageContext.jsx';
import { getChecklist, setChecklist } from '../utils/schemeStorage.js';
import { matchSchemes } from '../utils/matcher.js';
import { loadPartners } from '../utils/partnerStorage.js';
import { deadlineText, formatDeadlineDate, isDeadlinePassed, isValidDateString } from '../utils/deadline.js';
import { districtLabel } from '../utils/districts.js';

const STAGE_LABELS = {
  class_5_8: 'Class 5–8',
  class_9_10: 'Class 9–10',
  class_11_12: 'Class 11–12',
  diploma: 'Diploma',
  ug: 'UG',
  pg: 'PG',
  phd: 'PhD',
};

// Same shape conversion ForYou uses before calling matchSchemes().
function normalizeProfile(src) {
  const s = src || {};
  return {
    stage: String(s.stage ?? ''),
    stream: String(s.stream ?? ''),
    marks: Number(s.marks) || 0,
    income: Number(s.income) || 0,
    caste: String(s.caste ?? ''),
    gender: String(s.gender ?? ''),
    isUnmarried: s.isUnmarried === true,
    disabilityPct: Number(s.disabilityPct) || 0,
    district: String(s.district ?? ''),
  };
}

// Email reminder subscriptions are remembered per user; the scheme ids live under this key.
function reminderKeyFor(email) {
  return `sahayak_email_reminders_${email.toLowerCase()}`;
}

function readReminderIds(email) {
  if (!email || typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(reminderKeyFor(email)));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReminderId(email, schemeId) {
  if (!email || typeof window === 'undefined' || !window.localStorage) return;
  const ids = readReminderIds(email);
  if (ids.includes(schemeId)) return;
  try {
    window.localStorage.setItem(reminderKeyFor(email), JSON.stringify([...ids, schemeId]));
  } catch {
    // storage full or blocked; the server subscription (if any) still stands
  }
}

// Resolves to the server's message, or null when the request fails.
async function subscribeEmailReminder(scheme, email) {
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        schemeId: scheme.id,
        schemeName: scheme.name,
        deadlineDate: scheme.deadline_date,
        officialUrl: scheme.official_url,
        documents: scheme.documents,
      }),
    });
    const data = await res.json().catch(() => null);
    return data?.message ?? null;
  } catch {
    return null;
  }
}

// Email reminder controls for the drawer; shown only for logged-in users with an email.
function EmailReminderControls({ scheme, email }) {
  const { t } = useLang();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const subscribed = readReminderIds(email).includes(scheme.id);

  const handleEnable = async () => {
    setSending(true);
    const serverMessage = await subscribeEmailReminder(scheme, email);
    saveReminderId(email, scheme.id);
    setMessage(serverMessage || 'Saved locally; server unreachable');
    setSending(false);
  };

  if (scheme.deadline_date === null) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-ink/50"
      >
        {t('deadline_not_declared')}
      </button>
    );
  }

  if (isDeadlinePassed(scheme.deadline_date)) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-ink/50"
      >
        {t('deadline_passed')}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {subscribed ? (
        <p className="text-center text-sm font-medium text-emerald-700">✓ Email Alerts Active (30d / 7d / 1d)</p>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={sending}
          className="w-full rounded-xl bg-[#059669] px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {`${t('enable_email_reminders')} (30d / 7d / 1d)`}
        </button>
      )}
      {message && <p className="text-center text-xs text-ink/60">{message}</p>}
    </div>
  );
}

export default function SchemeDrawer({ scheme, onClose, profile = null }) {
  const { liteMode } = useUi();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [checked, setChecked] = useState(() => getChecklist(scheme.id));


  // Logged-in student profile first, then the profile passed in, else null.
  const activeProfile = useMemo(() => {
    const source = user?.role === 'student' ? user.profile : profile;
    return source ? normalizeProfile(source) : null;
  }, [user, profile]);

  const match = activeProfile ? matchSchemes([scheme], activeProfile)[0] : undefined;
  const reasons = match?.reasons ?? [];

  const partners = useMemo(() => loadPartners(), []);
  const district = activeProfile?.district || '';
  const verifiedCsc = partners.csc_centers.find(
    (c) => c.verified_by_admin === true && (!district || c.district === district),
  );
  const verifiedBank = partners.bank_partners.find(
    (b) => b.verified_by_admin === true && b.dbt_ready === true,
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleDoc = (doc) => {
    const next = checked.includes(doc)
      ? checked.filter((d) => d !== doc)
      : [...checked, doc];
    setChecked(next);
    setChecklist(scheme.id, next);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.aside
        initial={liteMode ? false : { x: '100%' }}
        animate={{ x: 0 }}
        className="fixed right-0 top-0 z-[80] h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheme-drawer-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="scheme-drawer-title" className="font-display text-xl font-semibold">
              {scheme.name}
            </h2>
            <p className="mt-1 text-sm text-ink/60">{scheme.nodal_agency}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-ink/70 hover:bg-stone-100"
          >
            <X size={20} />
          </button>
        </div>

        {match ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <p className="font-semibold">Likely Eligible</p>
            <ul className="mt-2 flex flex-col gap-1">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span aria-hidden="true">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            <a
              href={scheme.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-medium underline underline-offset-2"
            >
              Open official portal ↗
            </a>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Official Guidelines — Check Eligibility in For You</p>
            <a
              href={scheme.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-medium underline underline-offset-2"
            >
              Open official portal ↗
            </a>
          </div>
        )}

        {!user && (
          <p className="mt-5 text-sm text-ink/60">
            Sign in to track application status &amp; set deadline reminders.
          </p>
        )}
        {user?.email && (
          <div className="mt-5">
            <EmailReminderControls scheme={scheme} email={user.email} />
          </div>
        )}

        <section className="mt-6">
          <h3 className="font-display text-lg font-semibold">Stage-wise benefits</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {scheme.tiers.map((tier, i) => (
              <li key={`${tier.stage}-${i}`} className="rounded-xl border border-stone-200 p-3">
                <p className="text-sm font-semibold text-ink">
                  {STAGE_LABELS[tier.stage] ?? tier.stage}
                </p>
                {tier.streams?.length > 0 && (
                  <p className="mt-0.5 text-xs text-ink/60">{tier.streams.join(', ')}</p>
                )}
                {tier.min_marks > 0 && (
                  <p className="mt-0.5 text-xs text-ink/60">Min marks: {tier.min_marks}%</p>
                )}
                <p className="mt-1 text-sm text-ink/80">{tier.benefit_text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h3 className="font-display text-lg font-semibold">Documents you need</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {scheme.documents.map((doc) => (
              <li key={doc}>
                <label className="flex cursor-pointer items-center gap-3 text-sm text-ink/80">
                  <input
                    type="checkbox"
                    checked={checked.includes(doc)}
                    onChange={() => toggleDoc(doc)}
                    className="h-4 w-4 accent-[#D97706]"
                  />
                  <span>{doc}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-6 rounded-xl border border-stone-200 p-3 text-sm">
          <h3 className="font-semibold text-ink">Need a DBT Bank Account or CSC Help?</h3>
          <div className="mt-2 flex flex-col gap-2 text-ink/80">
            {verifiedBank ? (
              <p>
                <span className="font-medium">DBT bank: </span>
                {verifiedBank.name}{' '}
                <a
                  href={verifiedBank.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#D97706] hover:underline"
                >
                  Official site ↗
                </a>
              </p>
            ) : (
              <p>No admin-verified DBT bank listed yet.</p>
            )}
            {verifiedCsc ? (
              <p>
                <span className="font-medium">CSC: </span>
                {verifiedCsc.name}, {verifiedCsc.address}
              </p>
            ) : (
              <p>No admin-verified CSC {district ? `in ${districtLabel(district, lang)} ` : ''}listed yet.</p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <h3 className="font-semibold">Rules & exclusivity</h3>
          <p className="mt-1">{scheme.exclusivity_note}</p>
          {scheme.eligibility?.income_note && (
            <p className="mt-2">{scheme.eligibility.income_note}</p>
          )}
        </div>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Application mode</h3>
            <p className="mt-1 text-sm text-ink/70">{scheme.apply_mode}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('deadline_label')}</h3>
            <p className="mt-1 text-sm text-ink/70">{deadlineText(scheme)}</p>
            {isValidDateString(scheme.deadline_date) &&
              (isDeadlinePassed(scheme.deadline_date) ? (
                <span className="mt-2 inline-block rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  {`${t('deadline_passed')} (${formatDeadlineDate(scheme.deadline_date)})`}
                </span>
              ) : (
                <span className="mt-2 inline-block rounded-md border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                  {`${t('deadline_apply_before')}: ${formatDeadlineDate(scheme.deadline_date)}`}
                </span>
              ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="font-display text-lg font-semibold">{t('how_to_apply')}</h3>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink/80">
            <li>Check eligibility and gather the documents listed above.</li>
            <li>Apply via: {scheme.apply_mode}</li>
            <li>
              Use the official portal (
              <a
                href={scheme.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2"
              >
                {scheme.official_url}
              </a>
              ) and note the deadline: {deadlineText(scheme)}.
              {isValidDateString(scheme.deadline_date) &&
                (isDeadlinePassed(scheme.deadline_date) ? (
                  <span className="ml-2 inline-block rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    {`${t('deadline_passed')} (${formatDeadlineDate(scheme.deadline_date)})`}
                  </span>
                ) : (
                  <span className="ml-2 inline-block rounded-md border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                    {`${t('deadline_apply_before')}: ${formatDeadlineDate(scheme.deadline_date)}`}
                  </span>
                ))}
            </li>
            <li>Track your application status in For You.</li>
          </ol>
        </section>
      </motion.aside>

    </>
  );
}
