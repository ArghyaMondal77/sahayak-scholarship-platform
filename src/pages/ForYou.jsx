import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../i18n/LanguageContext.jsx';
import { getAllSchemes } from '../utils/schemeStorage.js';
import { matchSchemes } from '../utils/matcher.js';
import { loadPartners } from '../utils/partnerStorage.js';
import { deadlineText, formatDeadlineDate, isDeadlinePassed, isValidDateString } from '../utils/deadline.js';
import { districtLabel } from '../utils/districts.js';

// Tracker statuses are stored per logged-in user; logged-out visitors get no stored tracker.
function trackerKeyFor(user) {
  return user?.email ? `sahayak_tracker_${user.email.toLowerCase()}` : null;
}
const TRACKER_STATUSES = ['Not Started', 'Gathering Docs', 'Applied', 'Verified'];

const PROVIDER_ORDER = [
  { key: 'state_govt', label: 'WB State Govt', className: 'bg-amber-100 text-amber-800' },
  { key: 'central_govt', label: 'Central Govt', className: 'bg-slate-100 text-slate-700' },
  { key: 'private', label: 'Private', className: 'bg-indigo-100 text-indigo-800' },
];

const STAGE_OPTIONS = [
  { value: 'class_5_8', label: 'Class 5–8' },
  { value: 'class_9_10', label: 'Class 9–10' },
  { value: 'class_11_12', label: 'Class 11–12' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'ug', label: 'UG' },
  { value: 'pg', label: 'PG' },
  { value: 'phd', label: 'PhD' },
];

const STREAM_OPTIONS = [
  { value: 'all', label: 'None / General (Class 5–10)' },
  { value: 'arts', label: 'Arts' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'science', label: 'Science' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'medical', label: 'Medical' },
  { value: 'professional', label: 'Professional' },
];

const CASTE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'sc', label: 'SC' },
  { value: 'st', label: 'ST' },
  { value: 'obc', label: 'OBC' },
  { value: 'minority', label: 'Minority' },
];

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

const EMPTY_PROFILE = {
  stage: '',
  stream: '',
  marks: '',
  income: '',
  caste: '',
  gender: '',
  isUnmarried: true,
  disabilityPct: '',
  district: '',
};

const INPUT_CLASS =
  'rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100 disabled:text-ink/50';

// Converts any stored or form profile into the shape matchSchemes() expects.
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

// Pre-fills the Quick Eligibility form from Home search or chip route state.
function prefillFromSource(src) {
  const s = src || {};
  return Object.fromEntries(Object.keys(EMPTY_PROFILE).map((k) => [k, s[k] ?? EMPTY_PROFILE[k]]));
}

function readTracker(key) {
  if (!key || typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeTracker(key, map) {
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // storage full or blocked; keep in-memory state only
  }
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

function labelOf(options, value) {
  return options.find((o) => o.value === value)?.label ?? value;
}

// Display-only: turns raw stage keys such as "class_11_12" into "Class 11–12".
function formatReason(reason) {
  return String(reason).replace(/class_(\d+)_(\d+)/g, 'Class $1–$2');
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-ink/60">
        {label}
      </label>
      {children}
    </div>
  );
}

// Shared eligibility inputs, used by the Quick Eligibility form and the Edit Profile form.
function ProfileFields({ values, onChange, districts, idPrefix }) {
  const { lang } = useLang();
  const id = (key) => `${idPrefix}-${key}`;
  const set = (key) => (e) => onChange(key, e.target.value);
  const handleStageChange = (e) => {
    const stage = e.target.value;
    onChange('stage', stage);
    // Classes 5–10 have no stream split, so the general option applies automatically.
    if (stage === 'class_5_8' || stage === 'class_9_10') onChange('stream', 'all');
  };
  const districtOptions =
    values.district && !districts.includes(values.district)
      ? [...districts, values.district]
      : districts;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Stage" htmlFor={id('stage')}>
        <select id={id('stage')} required value={values.stage} onChange={handleStageChange} className={INPUT_CLASS}>
          <option value="">Select stage</option>
          {STAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Stream" htmlFor={id('stream')}>
        <select id={id('stream')} required value={values.stream} onChange={set('stream')} className={INPUT_CLASS}>
          <option value="">Select stream</option>
          {STREAM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Marks %" htmlFor={id('marks')}>
        <input
          id={id('marks')}
          type="number"
          min="0"
          max="100"
          value={values.marks}
          onChange={set('marks')}
          className={INPUT_CLASS}
        />
      </Field>

      <Field label="Annual family income (₹)" htmlFor={id('income')}>
        <input
          id={id('income')}
          type="number"
          min="0"
          value={values.income}
          onChange={set('income')}
          className={INPUT_CLASS}
        />
      </Field>

      <Field label="Category" htmlFor={id('caste')}>
        <select id={id('caste')} value={values.caste} onChange={set('caste')} className={INPUT_CLASS}>
          <option value="">Select category</option>
          {CASTE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Gender" htmlFor={id('gender')}>
        <select id={id('gender')} value={values.gender} onChange={set('gender')} className={INPUT_CLASS}>
          <option value="">Select gender</option>
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Disability %" htmlFor={id('disability')}>
        <input
          id={id('disability')}
          type="number"
          min="0"
          max="100"
          value={values.disabilityPct}
          onChange={set('disabilityPct')}
          className={INPUT_CLASS}
        />
      </Field>

      <Field label="District" htmlFor={id('district')}>
        <select id={id('district')} value={values.district} onChange={set('district')} className={INPUT_CLASS}>
          <option value="">Select district</option>
          {districtOptions.map((d) => (
            <option key={d} value={d}>{districtLabel(d, lang)}</option>
          ))}
        </select>
      </Field>

      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input
            id={id('unmarried')}
            type="checkbox"
            checked={values.isUnmarried === true}
            onChange={(e) => onChange('isUnmarried', e.target.checked)}
          />
          Unmarried
        </label>
      </div>
    </div>
  );
}

// Email reminder controls for one scheme card; shown only for logged-in users with an email.
function EmailReminderControls({ scheme, email }) {
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
        className="w-full cursor-not-allowed rounded-full bg-stone-200 px-4 py-2 text-sm font-medium text-ink/50"
      >
        Deadline Not Declared Yet
      </button>
    );
  }

  if (isDeadlinePassed(scheme.deadline_date)) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full bg-stone-200 px-4 py-2 text-sm font-medium text-ink/50 cursor-not-allowed"
      >
        Deadline Passed
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
          className="rounded-full bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Enable Email Reminders (30d / 7d / 1d)
        </button>
      )}
      {message && <p className="text-center text-xs text-ink/60">{message}</p>}
    </div>
  );
}

export default function ForYou() {
  const { t, lang } = useLang();
  const { user, updateProfile, openAuthModal } = useAuth();
  const location = useLocation();

  const isStudent = user?.role === 'student';
  const trackerKey = trackerKeyFor(user);
  const parsedFromRoute = location.state?.parsedProfile ?? null;

  const [skipParsed, setSkipParsed] = useState(false);
  const [quickValues, setQuickValues] = useState(() => prefillFromSource(parsedFromRoute));
  const [quickProfile, setQuickProfile] = useState(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editValues, setEditValues] = useState(EMPTY_PROFILE);
  const [editError, setEditError] = useState('');

  const [tracker, setTracker] = useState(() => readTracker(trackerKey));
  // Reload the tracker whenever the logged-in user changes or logs out.
  useEffect(() => {
    setTracker(readTracker(trackerKey));
  }, [trackerKey]);
  const [expandedId, setExpandedId] = useState(null);

  const [helpDistrict, setHelpDistrict] = useState('');

  const allSchemes = useMemo(() => getAllSchemes(), []);
  const partners = useMemo(() => loadPartners(), []);
  const districts = useMemo(
    () => [...new Set(partners.csc_centers.map((c) => c.district).filter(Boolean))].sort(),
    [partners],
  );

  // Priority: logged-in Student profile, then parsed search profile, then Quick Eligibility form.
  let activeProfile = null;
  let profileSource = null;
  if (isStudent) {
    activeProfile = normalizeProfile(user.profile);
    profileSource = 'student';
  } else if (!skipParsed && parsedFromRoute) {
    activeProfile = normalizeProfile(parsedFromRoute);
    profileSource = 'parsed';
  } else if (quickProfile) {
    activeProfile = quickProfile;
    profileSource = 'quick';
  }

  // Logged out: the Quick Eligibility form is always shown. Logged-in students never see it.
  const showQuickForm = !user || (!isStudent && !activeProfile);

  const results = activeProfile ? matchSchemes(allSchemes, activeProfile) : [];
  const groups = PROVIDER_ORDER.map((p) => ({
    ...p,
    items: results.filter((r) => r.provider_type === p.key),
  }));

  const handleQuickChange = (key, value) => setQuickValues((prev) => ({ ...prev, [key]: value }));

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    setQuickProfile(normalizeProfile(quickValues));
    setSkipParsed(true);
  };

  const resetToQuickForm = () => {
    setSkipParsed(true);
    setQuickProfile(null);
    setExpandedId(null);
  };

  const startEdit = () => {
    setEditName(user.name || '');
    setEditValues({ ...EMPTY_PROFILE, ...user.profile });
    setEditError('');
    setEditing(true);
  };

  const handleEditChange = (key, value) => setEditValues((prev) => ({ ...prev, [key]: value }));

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const result = updateProfile({ name: editName, ...normalizeProfile(editValues) });
    if (!result.ok) {
      setEditError(result.error);
      return;
    }
    setEditError('');
    setEditing(false);
  };

  const setStatus = (schemeId, status) => {
    const next = { ...tracker, [schemeId]: status };
    setTracker(next);
    writeTracker(trackerKey, next);
  };

  const verifiedCscs = partners.csc_centers.filter(
    (c) => c.verified_by_admin === true && (!helpDistrict || c.district === helpDistrict),
  );
  // Bank partners carry no district field, so all admin-verified banks are shown.
  const verifiedBanks = partners.bank_partners.filter((b) => b.verified_by_admin === true);

  const sourceNote =
    profileSource === 'student'
      ? `Using your saved profile, ${user.name}.`
      : profileSource === 'parsed'
        ? 'Using the profile from your search.'
        : 'Using your Quick Eligibility answers.';

  return (
    <div className="mx-auto w-[94%] max-w-[1400px] px-0 pb-16 pt-6 md:pt-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl">{t('nav_foryou')}</h1>
      </header>

      {isStudent && (
        <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Your Profile</h2>
              <p className="text-sm text-ink/70">Logged in as {user.email}</p>
            </div>
            <button
              type="button"
              onClick={editing ? () => setEditing(false) : startEdit}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
            >
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {editing && (
            <form onSubmit={handleSaveEdit} className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Name" htmlFor="edit-name">
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Email (read-only)" htmlFor="edit-email">
                  <input
                    id="edit-email"
                    type="email"
                    value={user.email}
                    disabled
                    readOnly
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>

              <ProfileFields
                values={editValues}
                onChange={handleEditChange}
                districts={districts}
                idPrefix="edit"
              />

              {editError && <p role="alert" className="text-sm text-red-600">{editError}</p>}

              <div>
                <button
                  type="submit"
                  className="rounded-full bg-[#D97706] px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Save Profile
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {showQuickForm && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Quick Eligibility</h2>
          <p className="mt-1 mb-5 text-sm text-ink/70">
            Answer a few questions to see schemes you may qualify for. Nothing is stored unless you log in.
          </p>
          <form onSubmit={handleQuickSubmit} className="flex flex-col gap-5">
            <ProfileFields
              values={quickValues}
              onChange={handleQuickChange}
              districts={districts}
              idPrefix="quick"
            />
            <div>
              <button
                type="submit"
                className="rounded-full bg-[#D97706] px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Show My Schemes
              </button>
            </div>
          </form>
        </section>
      )}

      {activeProfile && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink/70">
              {sourceNote}{' '}
              <span className="text-ink/60">
                ({labelOf(STAGE_OPTIONS, activeProfile.stage)}, {labelOf(STREAM_OPTIONS, activeProfile.stream)}
                {activeProfile.marks ? `, ${activeProfile.marks}%` : ''})
              </span>
            </p>
            {!user && (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="rounded-full bg-[#D97706] px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Sign In to Save Profile
              </button>
            )}
            {user && profileSource !== 'student' && (
              <button
                type="button"
                onClick={resetToQuickForm}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
              >
                Change profile
              </button>
            )}
          </div>

          <section aria-labelledby="likely-eligible-heading">
            <h2 id="likely-eligible-heading" className="font-display text-2xl font-semibold">
              {t('likely_eligible')}
            </h2>

            {results.length === 0 ? (
              <p className="mt-6 text-ink/70">
                No likely-eligible schemes found for this profile.
                {profileSource === 'student' ? ' Try updating your profile.' : ' Try changing your answers.'}
              </p>
            ) : (
              groups
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.key} className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
                      {group.label}
                    </h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((scheme) => {
                        const isOpen = expandedId === scheme.id;
                        const status = tracker[scheme.id] || 'Not Started';

                        return (
                          <article
                            key={scheme.id}
                            className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm"
                          >
                            <div>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${group.className}`}>
                                {group.label}
                              </span>
                              <h4 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">
                                {scheme.name}
                              </h4>
                              <p className="mt-1 text-sm text-ink/60">{scheme.nodal_agency}</p>
                              <p className="mt-2 flex items-center gap-2 text-sm text-ink/70">
                                <CalendarDays size={16} aria-hidden="true" />
                                <span>{deadlineText(scheme)}</span>
                              </p>
                              {isValidDateString(scheme.deadline_date) &&
                                (isDeadlinePassed(scheme.deadline_date) ? (
                                  <span className="inline-block rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                    {`${t('deadline_passed')} (${formatDeadlineDate(scheme.deadline_date)})`}
                                  </span>
                                ) : (
                                  <span className="inline-block rounded-md border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                                    {`${t('deadline_apply_before')}: ${formatDeadlineDate(scheme.deadline_date)}`}
                                  </span>
                                ))}

                              <ul className="mt-3 flex flex-col gap-1">
                                {scheme.reasons.map((reason) => (
                                  <li key={reason} className="flex gap-2 text-sm text-emerald-700">
                                    <span aria-hidden="true">✓</span>
                                    <span>{formatReason(reason)}</span>
                                  </li>
                                ))}
                              </ul>

                              {user ? (
                                <div className="mt-4">
                                  <label
                                    htmlFor={`status-${scheme.id}`}
                                    className="text-xs font-semibold uppercase tracking-wide text-ink/60"
                                  >
                                    {t('application_status')}
                                  </label>
                                  <select
                                    id={`status-${scheme.id}`}
                                    value={status}
                                    onChange={(e) => setStatus(scheme.id, e.target.value)}
                                    className={`mt-1 w-full ${INPUT_CLASS}`}
                                  >
                                    {TRACKER_STATUSES.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <p className="mt-4 text-sm text-ink/60">
                                  Sign in to track application status &amp; set deadline reminders.
                                </p>
                              )}

                              {isOpen && (
                                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-sm text-ink/80">
                                  <p>
                                    <span className="font-semibold">Benefit: </span>
                                    {scheme.matchedTier?.benefit_text}
                                  </p>
                                  <p className="mt-2">
                                    <span className="font-semibold">How to apply: </span>
                                    {scheme.apply_mode}
                                  </p>
                                  <p className="mt-2 font-semibold">Documents</p>
                                  <ul className="list-disc pl-5">
                                    {(scheme.documents || []).map((doc) => (
                                      <li key={doc}>{doc}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            <div className="mt-5 flex flex-col gap-2">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isOpen ? null : scheme.id)}
                                  className="flex-1 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
                                >
                                  {t('view_details_docs')}
                                </button>
                                <a
                                  href={scheme.official_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 rounded-full bg-[#D97706] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-amber-600"
                                >
                                  {`${t('official_portal')} ↗`}
                                </a>
                              </div>
                              {user?.email && <EmailReminderControls scheme={scheme} email={user.email} />}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
          </section>
        </>
      )}


      <section aria-labelledby="verified-help-heading" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="verified-help-heading" className="font-display text-2xl font-semibold">
            {t('verified_help_heading')}
          </h2>
          <Field label="District" htmlFor="help-district">
            <select
              id="help-district"
              value={helpDistrict}
              onChange={(e) => setHelpDistrict(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">All districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>{districtLabel(d, lang)}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">Cyber Centre (CSC)</h3>
            {verifiedCscs.length === 0 ? (
              <p className="text-sm text-ink/70">No admin-verified cyber centre in this district yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {verifiedCscs.map((c) => (
                  <article key={c.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                      <ShieldCheck size={14} aria-hidden="true" />
                      Admin-Verified
                    </span>
                    <h4 className="mt-3 font-display text-lg font-semibold text-ink">{c.name}</h4>
                    <p className="mt-1 text-sm text-ink/70">{c.address}</p>
                    <p className="mt-1 text-sm text-ink/70">PIN {c.pin} · {c.hours}</p>
                    <p className="mt-1 text-sm text-ink/70">Fee: {c.fixed_fee}</p>
                    <ul className="mt-2 list-disc pl-5 text-sm text-ink/80">
                      {(c.services || []).map((svc) => (
                        <li key={svc}>{svc}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
              DBT Zero-Balance Bank
            </h3>
            {verifiedBanks.length === 0 ? (
              <p className="text-sm text-ink/70">No admin-verified bank partner yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {verifiedBanks.map((b) => (
                  <article key={b.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                      <ShieldCheck size={14} aria-hidden="true" />
                      Admin-Verified
                    </span>
                    <h4 className="mt-3 font-display text-lg font-semibold text-ink">{b.name}</h4>
                    <p className="mt-1 text-sm text-ink/70">{b.tagline}</p>
                    <p className="mt-1 text-sm text-ink/70">Minimum balance: {b.min_balance}</p>
                    <p className="mt-2 text-sm font-semibold text-ink/80">Documents needed</p>
                    <ul className="list-disc pl-5 text-sm text-ink/80">
                      {(b.docs_needed || []).map((doc) => (
                        <li key={doc}>{doc}</li>
                      ))}
                    </ul>
                    <a
                      href={b.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm font-semibold text-[#D97706] hover:underline"
                    >
                      Official site ↗
                    </a>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
