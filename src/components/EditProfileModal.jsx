import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { loadPartners } from '../utils/partnerStorage.js';

// Opened by AuthButton via window.dispatchEvent(new Event('sahayak:open-edit-profile')).

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

const INPUT_CLASS =
  'rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100 disabled:text-[#111827]/50';

function Field({ label, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-[#111827]/60">
        {label}
      </label>
      {children}
    </div>
  );
}

// Mounted fresh each time the modal opens, so its state starts from the current user.
function EditProfileForm({ user, onClose }) {
  const { updateProfile } = useAuth();
  const profile = user.profile || {};
  const [name, setName] = useState(user.name ?? '');
  const [stage, setStage] = useState(profile.stage ?? '');
  const [stream, setStream] = useState(profile.stream ?? '');
  const [marks, setMarks] = useState(profile.marks ?? '');
  const [income, setIncome] = useState(profile.income ?? '');
  const [caste, setCaste] = useState(profile.caste ?? '');
  const [gender, setGender] = useState(profile.gender ?? '');
  const [isUnmarried, setIsUnmarried] = useState(profile.isUnmarried !== false);
  const [disabilityPct, setDisabilityPct] = useState(profile.disabilityPct ?? '');
  const [district, setDistrict] = useState(profile.district ?? '');
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? '');
  const [error, setError] = useState('');

  const partners = useMemo(() => loadPartners(), []);
  const districts = useMemo(
    () => [...new Set(partners.csc_centers.map((c) => c.district).filter(Boolean))].sort(),
    [partners],
  );
  const districtOptions =
    district && !districts.includes(district) ? [...districts, district] : districts;

  // Classes 5–10 have no stream split, so the general option applies automatically.
  const handleStageChange = (e) => {
    const next = e.target.value;
    setStage(next);
    if (next === 'class_5_8' || next === 'class_9_10') setStream('all');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const result = updateProfile({
      name,
      profile: {
        stage,
        stream,
        marks,
        income,
        caste,
        gender,
        isUnmarried,
        disabilityPct,
        district,
        whatsapp,
      },
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#F9F8F4] p-6 shadow-xl"
      >
        <h2 id="edit-profile-title" className="mb-4 text-xl font-semibold text-[#111827]">
          Edit Profile
        </h2>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" htmlFor="edit-profile-name">
              <input
                id="edit-profile-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Email" htmlFor="edit-profile-email">
              <input
                id="edit-profile-email"
                type="email"
                value={user.email ?? ''}
                disabled
                readOnly
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Stage" htmlFor="edit-profile-stage">
              <select id="edit-profile-stage" value={stage} onChange={handleStageChange} className={INPUT_CLASS}>
                <option value="">Select stage</option>
                {STAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Stream" htmlFor="edit-profile-stream">
              <select id="edit-profile-stream" value={stream} onChange={(e) => setStream(e.target.value)} className={INPUT_CLASS}>
                <option value="">Select stream</option>
                {STREAM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Marks %" htmlFor="edit-profile-marks">
              <input
                id="edit-profile-marks"
                type="number"
                min="0"
                max="100"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Annual family income (₹)" htmlFor="edit-profile-income">
              <input
                id="edit-profile-income"
                type="number"
                min="0"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Category" htmlFor="edit-profile-caste">
              <select id="edit-profile-caste" value={caste} onChange={(e) => setCaste(e.target.value)} className={INPUT_CLASS}>
                <option value="">Select category</option>
                {CASTE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Gender" htmlFor="edit-profile-gender">
              <select id="edit-profile-gender" value={gender} onChange={(e) => setGender(e.target.value)} className={INPUT_CLASS}>
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Disability %" htmlFor="edit-profile-disability">
              <input
                id="edit-profile-disability"
                type="number"
                min="0"
                max="100"
                value={disabilityPct}
                onChange={(e) => setDisabilityPct(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="District" htmlFor="edit-profile-district">
              <select id="edit-profile-district" value={district} onChange={(e) => setDistrict(e.target.value)} className={INPUT_CLASS}>
                <option value="">Select district</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>

            <Field label="WhatsApp Number" htmlFor="edit-profile-whatsapp">
              <input
                id="edit-profile-whatsapp"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-[#111827]/80">
                <input
                  id="edit-profile-unmarried"
                  type="checkbox"
                  checked={isUnmarried}
                  onChange={(e) => setIsUnmarried(e.target.checked)}
                />
                Unmarried
              </label>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#111827] px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditProfileModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('sahayak:open-edit-profile', handleOpen);
    return () => window.removeEventListener('sahayak:open-edit-profile', handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!open || !user || user.role !== 'student') return null;

  return <EditProfileForm user={user} onClose={() => setOpen(false)} />;
}
