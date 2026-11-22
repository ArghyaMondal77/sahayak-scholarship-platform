import { useState } from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../i18n/LanguageContext.jsx';
import { isValidDateString, formatDeadlineDate, isDeadlinePassed } from '../utils/deadline.js';
import {
  deleteCustomScheme,
  getAllSchemes,
  saveCustomScheme,
  updateSchemeOverride,
} from '../utils/schemeStorage';

// Key read by partnerStorage.js (loadPartners). Scheme data goes through schemeStorage.js.
const PARTNERS_CUSTOM_KEY = 'sahayak_partners_custom';

const STAGE_OPTIONS = [
  { value: 'class_5_8', label: 'Class 5–8' },
  { value: 'class_9_10', label: 'Class 9–10' },
  { value: 'class_11_12', label: 'Class 11–12' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'ug', label: 'UG' },
  { value: 'pg', label: 'PG' },
  { value: 'phd', label: 'PhD' },
];

const PROVIDER_OPTIONS = [
  { value: 'state_govt', label: 'State Govt' },
  { value: 'central_govt', label: 'Central Govt' },
  { value: 'private', label: 'Private' },
];

const INPUT_CLASS =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink focus:border-[#D97706] focus:outline-none';

const SCHEME_FIELDS = [
  { key: 'name', label: 'Scheme Name', required: true, wide: true },
  { key: 'provider', label: 'Provider', type: 'select', options: PROVIDER_OPTIONS, required: true },
  { key: 'nodalAgency', label: 'Nodal Agency', required: true },
  { key: 'stage', label: 'Stage', type: 'select', options: STAGE_OPTIONS, required: true },
  { key: 'minMarks', label: 'Min Marks %', type: 'number', min: 0, max: 100, required: true },
  { key: 'maxIncome', label: 'Max Income (₹)', type: 'number', min: 0 },
  { key: 'deadlineDate', label: 'Deadline Date', type: 'date' },
  { key: 'benefitText', label: 'Yearly Benefit Text', required: true, wide: true },
  { key: 'deadline', label: 'Deadline', required: true },
  { key: 'officialUrl', label: 'Official URL', type: 'url', required: true },
  { key: 'documents', label: 'Required Documents (comma-separated)', type: 'list', required: true, wide: true },
];

const CENTRE_FIELDS = [
  { key: 'name', label: 'Centre Name', required: true, wide: true },
  { key: 'district', label: 'District', required: true },
  { key: 'pin', label: 'PIN', required: true, pattern: /^\d{6}$/, patternMessage: 'PIN must be 6 digits.' },
  { key: 'address', label: 'Address', required: true, wide: true },
  { key: 'fixedFee', label: 'Fixed Fee', placeholder: '₹30 – ₹50 (Govt Approved)', required: true },
  { key: 'hours', label: 'Hours', placeholder: '10:00 – 18:00, Mon–Sat', required: true },
];

const BANK_FIELDS = [
  { key: 'name', label: 'Bank Name', required: true, wide: true },
  { key: 'tagline', label: 'Tagline', required: true, wide: true },
  { key: 'minBalance', label: 'Min Balance', required: true },
  { key: 'docsNeeded', label: 'Docs Needed (comma-separated)', type: 'list', required: true, wide: true },
  { key: 'officialUrl', label: 'Official URL', type: 'url', required: true, wide: true },
];

const EMPTY_SCHEME = {
  name: '', provider: '', nodalAgency: '', stage: '', minMarks: '', maxIncome: '',
  deadlineDate: '', benefitText: '', deadline: '', officialUrl: '', documents: '',
};
const EMPTY_CENTRE = { name: '', district: '', address: '', pin: '', fixedFee: '', hours: '' };
const EMPTY_BANK = { name: '', tagline: '', minBalance: '₹0', docsNeeded: '', officialUrl: '' };

const ADMIN_TABS = [
  { id: 'scheme', label: 'Add Scholarship' },
  { id: 'centre', label: 'Add Verified Cyber Centre' },
  { id: 'bank', label: 'Add Verified DBT Bank' },
];

function readJson(key, fallback) {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}


// Appends a verified partner record to the custom list that partnerStorage merges in.
function savePartner(listKey, record) {
  const custom = readJson(PARTNERS_CUSTOM_KEY, {});
  const base = custom && typeof custom === 'object' && !Array.isArray(custom) ? custom : {};
  const list = Array.isArray(base[listKey]) ? base[listKey] : [];
  return writeJson(PARTNERS_CUSTOM_KEY, { ...base, [listKey]: [...list, record] });
}

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}`;
}

// Returns { fieldKey: message } for every invalid field; an empty object means valid.
function validateFields(fields, values) {
  const errors = {};
  for (const field of fields) {
    const value = String(values[field.key] ?? '').trim();
    if (field.type === 'list' ? splitList(value).length === 0 : field.required && !value) {
      errors[field.key] = `${field.label} is required.`;
      continue;
    }
    if (!value) continue;
    if (field.type === 'number') {
      const n = Number(value);
      if (Number.isNaN(n) || n < field.min || (field.max != null && n > field.max)) {
        errors[field.key] =
          field.max != null ? `Enter a number from ${field.min} to ${field.max}.` : `Enter a number of ${field.min} or more.`;
      }
    } else if (field.type === 'url' && !isHttpUrl(value)) {
      errors[field.key] = 'Enter a valid http:// or https:// URL.';
    } else if (field.pattern && !field.pattern.test(value)) {
      errors[field.key] = field.patternMessage;
    }
  }
  return errors;
}

function AdminForm({ idPrefix, fields, values, errors, onChange, onSubmit, submitLabel }) {
  return (
    <form noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const errorId = `${id}-error`;
        const error = errors[field.key];
        const common = {
          id,
          value: values[field.key],
          onChange: (e) => onChange(field.key, e.target.value),
          'aria-invalid': error ? true : undefined,
          'aria-describedby': error ? errorId : undefined,
          className: INPUT_CLASS,
        };

        let control;
        if (field.type === 'select') {
          control = (
            <select {...common}>
              <option value="">Select</option>
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          );
        } else if (field.type === 'list') {
          control = <textarea rows={3} {...common} />;
        } else {
          control = (
            <input
              type={field.type === 'number' || field.type === 'url' || field.type === 'date' ? field.type : 'text'}
              min={field.min}
              max={field.max}
              placeholder={field.placeholder}
              {...common}
            />
          );
        }

        return (
          <div key={field.key} className={`flex flex-col gap-1 ${field.wide ? 'sm:col-span-2' : ''}`}>
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-ink/60">
              {field.label}
            </label>
            {control}
            {error && (
              <p id={errorId} role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
          </div>
        );
      })}
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="rounded-full bg-[#D97706] px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Notice({ message }) {
  if (!message) return null;
  return (
    <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {message}
    </p>
  );
}

// Inline editor for an existing scheme's overridable fields. Saves a patch shaped like
// the overrides that schemeStorage.getAllSchemes() merges back in.
function SchemeEditForm({ scheme, onSave, onCancel }) {
  const [deadlineDate, setDeadlineDate] = useState(scheme.deadline_date || '');
  const [deadline, setDeadline] = useState(scheme.deadline || '');
  const [maxIncome, setMaxIncome] = useState(scheme.eligibility?.max_income ?? '');
  const [officialUrl, setOfficialUrl] = useState(scheme.official_url || '');
  const idPrefix = `edit-${scheme.id}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      deadline_date: deadlineDate || null,
      deadline: deadline.trim(),
      eligibility: { max_income: String(maxIncome).trim() ? Number(maxIncome) : null },
      official_url: officialUrl.trim(),
      last_verified: todayIso(),
    });
  };

  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-ink/60';

  return (
    <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded-lg bg-stone-50 p-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-deadline-date`} className={labelClass}>Deadline Date</label>
        <div className="flex gap-2">
          <input
            id={`${idPrefix}-deadline-date`}
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            className={INPUT_CLASS}
          />
          <button
            type="button"
            onClick={() => setDeadlineDate('')}
            className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-ink hover:bg-stone-100"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-deadline`} className={labelClass}>Deadline (text)</label>
        <input
          id={`${idPrefix}-deadline`}
          type="text"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-max-income`} className={labelClass}>Max Income (₹)</label>
        <input
          id={`${idPrefix}-max-income`}
          type="number"
          min={0}
          value={maxIncome}
          onChange={(e) => setMaxIncome(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-official-url`} className={labelClass}>Official URL</label>
        <input
          id={`${idPrefix}-official-url`}
          type="text"
          value={officialUrl}
          onChange={(e) => setOfficialUrl(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          className="rounded-full bg-[#D97706] px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-stone-300 px-5 py-2 text-sm text-ink hover:bg-stone-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ScholarshipTab() {
  const { t } = useLang();
  const [values, setValues] = useState(EMPTY_SCHEME);
  const [errors, setErrors] = useState({});
  const [schemes, setSchemes] = useState(getAllSchemes);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validateFields(SCHEME_FIELDS, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice('');
      return;
    }

    const record = {
      id: makeId('custom-scheme'),
      name: values.name.trim(),
      provider_type: values.provider,
      nodal_agency: values.nodalAgency.trim(),
      benefit_type: 'cash',
      eligibility: {
        state: 'WB',
        genders: ['female', 'male', 'other'],
        castes: ['general', 'sc', 'st', 'obc', 'minority'],
        max_income: values.maxIncome.trim() ? Number(values.maxIncome) : null,
        income_note: '',
        min_disability_pct: 0,
        unmarried_only: false,
        govt_institute_only: false,
        exam_required: false,
        first_year_only: false,
      },
      tiers: [
        {
          stage: values.stage,
          streams: ['all'],
          min_marks: Number(values.minMarks),
          max_marks: null,
          max_amount_inr: 0,
          benefit_text: values.benefitText.trim(),
        },
      ],
      exclusivity_note: '',
      documents: splitList(values.documents),
      apply_mode: 'See the official portal for application steps.',
      deadline_date: values.deadlineDate || null,
      deadline: values.deadline.trim(),
      official_url: values.officialUrl.trim(),
      last_verified: todayIso(),
    };

    saveCustomScheme(record);
    setSchemes(getAllSchemes());
    setValues(EMPTY_SCHEME);
    setErrors({});
    setNotice(`Saved "${record.name}". It now appears on /schemes and /for-you.`);
  };

  const handleDelete = (id) => {
    deleteCustomScheme(id);
    setSchemes(getAllSchemes());
    setEditingId(null);
  };

  const handleSaveOverride = (scheme, patch) => {
    updateSchemeOverride(scheme.id, patch);
    setSchemes(getAllSchemes());
    setEditingId(null);
    setNotice(`Updated "${scheme.name}".`);
  };

  return (
    <div className="flex flex-col gap-8">
      <AdminForm
        idPrefix="scheme"
        fields={SCHEME_FIELDS}
        values={values}
        errors={errors}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel="Save Scholarship"
      />
      <Notice message={notice} />

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">All schemes</h3>
        {schemes.length === 0 ? (
          <p className="text-sm text-ink/70">No schemes available yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {schemes.map((s) => {
              const isCustom = String(s.id).startsWith('custom-scheme-');
              const editing = editingId === s.id;
              return (
                <li key={s.id} className="flex flex-col gap-4 rounded-xl border border-stone-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{s.name}</p>
                      <p className="text-sm text-ink/60">
                        {s.nodal_agency} · Deadline: {s.deadline_date || 'Not Declared'}
                      </p>
                      {isValidDateString(s.deadline_date) && (
                        isDeadlinePassed(s.deadline_date) ? (
                          <span className="mt-1 inline-block rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            {`${t('deadline_passed')} (${formatDeadlineDate(s.deadline_date)})`}
                          </span>
                        ) : (
                          <span className="mt-1 inline-block rounded-md border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                            {`${t('deadline_apply_before')}: ${formatDeadlineDate(s.deadline_date)}`}
                          </span>
                        )
                      )}

                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(s.id)}
                        aria-label={`Edit ${s.name}`}
                        aria-expanded={editing}
                        className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-ink hover:bg-stone-50"
                      >
                        Edit
                      </button>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          aria-label={`Delete ${s.name}`}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {editing && (
                    <SchemeEditForm
                      key={s.id}
                      scheme={s}
                      onSave={(patch) => handleSaveOverride(s, patch)}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function CentreTab() {
  const [values, setValues] = useState(EMPTY_CENTRE);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validateFields(CENTRE_FIELDS, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice('');
      return;
    }

    const record = {
      id: makeId('csc-custom'),
      name: values.name.trim(),
      district: values.district.trim(),
      address: values.address.trim(),
      pin: values.pin.trim(),
      fixed_fee: values.fixedFee.trim(),
      services: [],
      verified_by_admin: true,
      hours: values.hours.trim(),
    };

    if (!savePartner('csc_centers', record)) {
      setNotice('Could not save: browser storage is unavailable.');
      return;
    }
    setValues(EMPTY_CENTRE);
    setErrors({});
    setNotice(`Saved "${record.name}" as a verified cyber centre.`);
  };

  return (
    <div>
      <AdminForm
        idPrefix="centre"
        fields={CENTRE_FIELDS}
        values={values}
        errors={errors}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel="Save Cyber Centre"
      />
      <Notice message={notice} />
    </div>
  );
}

function BankTab() {
  const [values, setValues] = useState(EMPTY_BANK);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validateFields(BANK_FIELDS, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice('');
      return;
    }

    const record = {
      id: makeId('bank-custom'),
      name: values.name.trim(),
      tagline: values.tagline.trim(),
      min_balance: values.minBalance.trim(),
      dbt_ready: true,
      docs_needed: splitList(values.docsNeeded),
      verified_by_admin: true,
      official_url: values.officialUrl.trim(),
    };

    if (!savePartner('bank_partners', record)) {
      setNotice('Could not save: browser storage is unavailable.');
      return;
    }
    setValues(EMPTY_BANK);
    setErrors({});
    setNotice(`Saved "${record.name}" as a verified DBT bank.`);
  };

  return (
    <div>
      <AdminForm
        idPrefix="bank"
        fields={BANK_FIELDS}
        values={values}
        errors={errors}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel="Save DBT Bank"
      />
      <Notice message={notice} />
    </div>
  );
}

function AdminPanel() {
  const [tab, setTab] = useState('scheme');

  return (
    <section aria-labelledby="admin-panel-heading" className="mt-14 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-8">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-emerald-700" aria-hidden="true" />
        <h2 id="admin-panel-heading" className="font-display text-2xl font-semibold">
          Admin Control Panel
        </h2>
      </div>

      <div role="tablist" aria-label="Admin sections" className="mt-5 flex flex-wrap gap-2">
        {ADMIN_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`admin-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`admin-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                active
                  ? 'bg-[#111827] text-white'
                  : 'border border-stone-300 text-ink hover:bg-stone-50'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`admin-panel-${tab}`}
        aria-labelledby={`admin-tab-${tab}`}
        className="mt-6"
      >
        {tab === 'scheme' && <ScholarshipTab />}
        {tab === 'centre' && <CentreTab />}
        {tab === 'bank' && <BankTab />}
      </div>
    </section>
  );
}

export default function Admin() {
  const { user: currentUser, openAuthModal } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="mx-auto flex w-[94%] max-w-[1100px] flex-col items-center justify-center pb-16 pt-6 text-center md:pt-10">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-700" aria-hidden="true" />
          <h1 className="font-display text-3xl sm:text-4xl">Admin Access Required</h1>
        </div>
        <p className="mt-3 max-w-md text-sm text-ink/70">
          This page is for verified scheme verifiers and administrators. Sign in with an admin account to add scholarships, cyber centres and DBT banks.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal()}
          className="mt-6 rounded-full bg-[#111827] px-5 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Sign In as Admin
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[94%] max-w-[1100px] pb-16 pt-6 md:pt-10">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl">Admin Panel</h1>
        <p className="mt-2 max-w-2xl text-ink/70">
          Add verified scholarships, cyber centres and DBT banks. Entries appear on /schemes, /for-you and the partner listings.
        </p>
      </header>
      <AdminPanel />
    </div>
  );
}
