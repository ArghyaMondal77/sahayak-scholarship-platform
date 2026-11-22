import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_ADMIN = { email: 'admin@sahayak.in', password: 'admin123' };
const DEMO_STUDENT_LOGIN = { email: 'student@sahayak.in', password: 'student123' };


const STAGE_OPTIONS = [
  { value: 'class_5_8', label: 'Class 5–8' },
  { value: 'class_9_10', label: 'Class 9–10' },
  { value: 'class_11_12', label: 'Class 11–12' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'ug', label: 'UG' },
  { value: 'pg', label: 'PG' },
  { value: 'phd', label: 'PhD' },
];


const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'sc', label: 'SC' },
  { value: 'st', label: 'ST' },
  { value: 'obc', label: 'OBC' },
  { value: 'minority', label: 'Minority' },
];

const EMPTY_SIGNUP = {
  name: '',
  email: '',
  password: '',
  stage: '',
  stream: '',
  marks: '',
  income: '',
  caste: '',
  gender: '',
  district: '',
};

// Inline, client-side checks. Returns { field: message }; empty object means valid.
function validateSignup(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  if (
    form.marks !== '' &&
    (Number.isNaN(Number(form.marks)) || Number(form.marks) < 0 || Number(form.marks) > 100)
  ) {
    errors.marks = 'Marks must be between 0 and 100.';
  }
  if (form.income !== '' && (Number.isNaN(Number(form.income)) || Number(form.income) < 0)) {
    errors.income = 'Income must be a positive number.';
  }
  return errors;
}

const INPUT_CLASS =
  'w-full min-h-[40px] rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#D97706]/40';

const PRIMARY_BUTTON =
  'w-full min-h-[40px] rounded-xl bg-[#111827] py-2.5 text-sm font-medium text-white hover:bg-stone-800';

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-600">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function SelectField({ label, name, value, options, onChange }) {
  return (
    <Field label={label}>
      <select name={name} value={value} onChange={onChange} className={INPUT_CLASS}>
        <option value="">Not specified</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default function AuthModal({ open, onClose }) {
  const { login, loginAsAdmin, signUp } = useAuth();
  const [roleView, setRoleView] = useState('student');
  const [studentTab, setStudentTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP);
  const [signupErrors, setSignupErrors] = useState({});
  const [error, setError] = useState('');

  const resetAll = () => {
    setError('');
    setLoginForm({ email: '', password: '' });
    setAdminForm({ email: '', password: '' });
    setSignupForm(EMPTY_SIGNUP);
    setSignupErrors({});
    setStudentTab('login');
    setRoleView('student');
  };

  const handleClose = () => {
    resetAll();
    if (onClose) onClose();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  if (!open) return null;

  const finish = (result) => {
    if (result.ok) {
      handleClose();
    } else {
      setError(result.error);
    }
  };

  const onChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const switchRole = (view) => {
    setRoleView(view);
    setError('');
  };

  const switchStudentTab = (tab) => {
    setStudentTab(tab);
    setError('');
  };

  const submitLogin = (e) => {
    e.preventDefault();
    finish(login(loginForm.email, loginForm.password));
  };

  const submitAdmin = (e) => {
    e.preventDefault();
    finish(loginAsAdmin(adminForm.email, adminForm.password));
  };

  const fillDemoAdmin = () => {
    setAdminForm({ ...DEMO_ADMIN });
    setError('');
  };

  const fillDemoStudent = () => {
    setLoginForm({ ...DEMO_STUDENT_LOGIN });
    setError('');
  };

  // Login mode button: the admin account lives in the Admin view, so switch there and fill it.
  const fillDemoAdminFromLogin = () => {
    setRoleView('admin');
    fillDemoAdmin();
  };

  const submitSignup = (e) => {
    e.preventDefault();
    const errors = validateSignup(signupForm);
    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('');
      return;
    }
    const { marks, income } = signupForm;
    finish(
      signUp({
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        password: signupForm.password,
        profile: {
          stage: signupForm.stage,
          stream: signupForm.stream.trim(),
          marks: marks === '' ? '' : Number(marks),
          income: income === '' ? '' : Number(income),
          caste: signupForm.caste,
          gender: signupForm.gender,
          district: signupForm.district.trim(),
        },
      }),
    );
  };

  const segmentBase =
    'flex-1 min-h-[40px] rounded-full px-4 py-1.5 text-sm font-medium transition-colors';
  const segmentActive = 'bg-[#111827] text-white';
  const segmentInactive = 'text-stone-600 hover:text-[#111827]';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-2xl border border-stone-200"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="auth-modal-title" className="text-xl font-semibold text-[#111827]">
            Welcome to Sahayak
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex w-full rounded-full border border-stone-200 bg-stone-50 p-1">
          <button
            type="button"
            aria-pressed={roleView === 'student'}
            onClick={() => switchRole('student')}
            className={`${segmentBase} ${roleView === 'student' ? segmentActive : segmentInactive}`}
          >
            Student
          </button>
          <button
            type="button"
            aria-pressed={roleView === 'admin'}
            onClick={() => switchRole('admin')}
            className={`${segmentBase} ${roleView === 'admin' ? segmentActive : segmentInactive}`}
          >
            Admin
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        {roleView === 'student' && (
          <div className="mt-4 space-y-4">
            <div className="flex w-full rounded-full border border-stone-200 p-1">
              <button
                type="button"
                aria-pressed={studentTab === 'login'}
                onClick={() => switchStudentTab('login')}
                className={`${segmentBase} ${studentTab === 'login' ? segmentActive : segmentInactive}`}
              >
                Log In
              </button>
              <button
                type="button"
                aria-pressed={studentTab === 'signup'}
                onClick={() => switchStudentTab('signup')}
                className={`${segmentBase} ${studentTab === 'signup' ? segmentActive : segmentInactive}`}
              >
                Sign Up
              </button>
            </div>


            {studentTab === 'login' && (
              <form onSubmit={submitLogin} className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={fillDemoStudent}
                    className="w-full min-h-[40px] rounded-xl border border-[#D97706]/40 bg-[#D97706]/10 py-2 text-sm font-medium text-amber-800 hover:bg-[#D97706]/20"
                  >
                    Fill Demo Student
                  </button>
                  <button
                    type="button"
                    onClick={fillDemoAdminFromLogin}
                    className="w-full min-h-[40px] rounded-xl border border-[#D97706]/40 bg-[#D97706]/10 py-2 text-sm font-medium text-amber-800 hover:bg-[#D97706]/20"
                  >
                    Fill Demo Admin
                  </button>
                </div>

                <Field label="Email">
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={loginForm.email}
                    onChange={onChange(setLoginForm)}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={onChange(setLoginForm)}
                    className={INPUT_CLASS}
                  />
                </Field>
                <button type="submit" className={PRIMARY_BUTTON}>
                  Log In
                </button>
              </form>
            )}

            {studentTab === 'signup' && (
              <form onSubmit={submitSignup} noValidate className="space-y-3">
                <Field label="Name" error={signupErrors.name}>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={signupForm.name}
                    onChange={onChange(setSignupForm)}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Email" error={signupErrors.email}>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={signupForm.email}
                    onChange={onChange(setSignupForm)}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Password (min 6 characters)" error={signupErrors.password}>
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={signupForm.password}
                    onChange={onChange(setSignupForm)}
                    className={INPUT_CLASS}
                  />
                </Field>

                <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Profile (used to match schemes)
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Education Stage"
                    name="stage"
                    value={signupForm.stage}
                    options={STAGE_OPTIONS}
                    onChange={onChange(setSignupForm)}
                  />
                  <Field label="Stream">
                    <input
                      type="text"
                      name="stream"
                      value={signupForm.stream}
                      onChange={onChange(setSignupForm)}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Marks (%)" error={signupErrors.marks}>
                    <input
                      type="number"
                      name="marks"
                      min={0}
                      max={100}
                      step="any"
                      value={signupForm.marks}
                      onChange={onChange(setSignupForm)}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Annual Family Income (₹/year)" error={signupErrors.income}>
                    <input
                      type="number"
                      name="income"
                      min={0}
                      step="any"
                      value={signupForm.income}
                      onChange={onChange(setSignupForm)}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <SelectField
                    label="Caste"
                    name="caste"
                    value={signupForm.caste}
                    options={CATEGORY_OPTIONS}
                    onChange={onChange(setSignupForm)}
                  />
                  <SelectField
                    label="Gender"
                    name="gender"
                    value={signupForm.gender}
                    options={GENDER_OPTIONS}
                    onChange={onChange(setSignupForm)}
                  />
                  <Field label="District">
                    <input
                      type="text"
                      name="district"
                      value={signupForm.district}
                      onChange={onChange(setSignupForm)}
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>

                <p className="text-xs text-emerald-700">
                  We never ask for Aadhaar, PAN, or bank numbers.
                </p>
                <button type="submit" className={PRIMARY_BUTTON}>
                  Create Account
                </button>
              </form>
            )}

          </div>
        )}

        {roleView === 'admin' && (
          <div className="mt-4 space-y-3">
            <form onSubmit={submitAdmin} className="space-y-3">
              <Field label="Admin email">
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="username"
                  value={adminForm.email}
                  onChange={onChange(setAdminForm)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  value={adminForm.password}
                  onChange={onChange(setAdminForm)}
                  className={INPUT_CLASS}
                />
              </Field>
              <button type="submit" className={PRIMARY_BUTTON}>
                Log In as Admin
              </button>
            </form>
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="w-full min-h-[40px] rounded-xl border border-[#D97706]/40 bg-[#D97706]/10 py-2 text-sm font-medium text-amber-800 hover:bg-[#D97706]/20"
            >
              Fill Demo Admin Credentials
            </button>
            <p className="text-xs text-stone-500">Demo admin for judges.</p>
          </div>
        )}
      </div>
    </div>
  );
}
