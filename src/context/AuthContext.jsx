import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Client-side demo auth only. All data lives in localStorage.
// Passwords are stored as PLAIN TEXT on purpose for this demo.
// This is NOT acceptable for production; a real backend must hash passwords.

const USERS_KEY = 'sahayak_users';
const CURRENT_USER_KEY = 'sahayak_current_user';
const AADHAAR_PATTERN = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
const AADHAAR_ERROR = 'Please do not enter Aadhaar-like numbers.';

const ADMIN_SEED_USER = {
  id: 'admin-seed-001',
  name: 'Sahayak Admin',
  email: 'admin@sahayak.in',
  role: 'admin',
  password: 'admin123',
  profile: { stage: '', stream: '', marks: '', gender: '', caste: '', income: '', isUnmarried: true },
  provider: 'password',
};

const STUDENT_SEED_USER = {
  id: 'student-seed-001',
  name: 'Arghya Mondal',
  email: 'student@sahayak.in',
  role: 'student',
  password: 'student123',
  profile: {
    stage: 'ug',
    stream: 'engineering',
    marks: 78,
    income: 180000,
    caste: 'general',
    gender: 'male',
    isUnmarried: true,
    disabilityPct: 0,
    district: 'Nadia',
  },
  provider: 'password',
};

// Profile fields the app reads for eligibility. Anything else is ignored.
const PROFILE_FIELDS = [
  'stage',
  'stream',
  'marks',
  'income',
  'caste',
  'gender',
  'isUnmarried',
  'disabilityPct',
  'district',
  'whatsapp',
];

const AuthContext = createContext(null);

function emptyProfile() {
  return {
    stage: '',
    stream: '',
    marks: '',
    gender: '',
    caste: '',
    income: '',
    isUnmarried: true,
    disabilityPct: 0,
    district: '',
  };
}

function pickProfileFields(source) {
  const out = {};
  if (!source || typeof source !== 'object') return out;
  PROFILE_FIELDS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key];
  });
  return out;
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function hasAadhaarLike(...values) {
  return values.some((value) => AADHAAR_PATTERN.test(String(value ?? '')));
}

function generateId() {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Storage blocked or corrupt JSON: fall back to empty state.
    return null;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: keep working in memory.
  }
}

function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing to clear.
  }
}

function readUsers() {
  const value = readJson(USERS_KEY);
  return Array.isArray(value) ? value : [];
}

function readCurrentUser() {
  const value = readJson(CURRENT_USER_KEY);
  return value && typeof value === 'object' && value.email ? value : null;
}

function ensureAdminSeed(users) {
  const hasAdmin = users.some(
    (u) => normalizeEmail(u.email) === normalizeEmail(ADMIN_SEED_USER.email),
  );
  return hasAdmin ? users : [...users, ADMIN_SEED_USER];
}

// Adds each demo account only when its email is not already stored (idempotent).
function ensureDemoSeeds(users) {
  const withAdmin = ensureAdminSeed(users);
  const hasStudent = withAdmin.some(
    (u) => normalizeEmail(u.email) === normalizeEmail(STUDENT_SEED_USER.email),
  );
  return hasStudent ? withAdmin : [...withAdmin, STUDENT_SEED_USER];
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => ensureDemoSeeds(readUsers()));
  const [user, setUser] = useState(() => readCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  useEffect(() => {
    writeJson(USERS_KEY, users);
  }, [users]);

  useEffect(() => {
    if (user) {
      writeJson(CURRENT_USER_KEY, user);
    } else {
      removeKey(CURRENT_USER_KEY);
    }
  }, [user]);

  const login = useCallback(
    (email, password) => {
      if (hasAadhaarLike(email)) return { ok: false, error: AADHAAR_ERROR };
      const cleanEmail = normalizeEmail(email);
      const match = users.find(
        (u) =>
          u.role === 'student' &&
          normalizeEmail(u.email) === cleanEmail &&
          Boolean(password) &&
          u.password === password,
      );
      if (!match) return { ok: false, error: 'Email or password is incorrect.' };
      setUser(match);
      return { ok: true, error: '' };
    },
    [users],
  );

  const loginAsAdmin = useCallback(
    (email, password) => {
      if (hasAadhaarLike(email)) return { ok: false, error: AADHAAR_ERROR };
      const cleanEmail = normalizeEmail(email);
      const match = users.find(
        (u) =>
          u.role === 'admin' &&
          normalizeEmail(u.email) === cleanEmail &&
          Boolean(password) &&
          u.password === password,
      );
      if (!match) return { ok: false, error: 'Admin credentials are incorrect.' };
      setUser(match);
      return { ok: true, error: '' };
    },
    [users],
  );

  const signUp = useCallback(
    ({ name, email, password, profile } = {}) => {
      const cleanName = String(name ?? '').trim();
      const cleanEmail = normalizeEmail(email);
      if (hasAadhaarLike(cleanName, cleanEmail, profile?.stream, profile?.district)) {
        return { ok: false, error: AADHAAR_ERROR };
      }
      if (!cleanName || !cleanEmail) {
        return { ok: false, error: 'Name and email are required.' };
      }
      if (String(password ?? '').length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters.' };
      }
      if (users.some((u) => normalizeEmail(u.email) === cleanEmail)) {
        return { ok: false, error: 'An account with this email already exists.' };
      }
      const newUser = {
        id: generateId(),
        name: cleanName,
        email: cleanEmail,
        role: 'student',
        password: String(password),
        profile: { ...emptyProfile(), ...pickProfileFields(profile) },
        provider: 'password',
      };
      setUsers((prev) => [...prev, newUser]);
      setUser(newUser);
      return { ok: true, error: '' };
    },
    [users],
  );

  const loginWithGoogleDemo = useCallback(
    ({ name, email } = {}) => {
      const cleanName = String(name ?? '').trim();
      const cleanEmail = normalizeEmail(email);
      if (hasAadhaarLike(cleanName, cleanEmail)) {
        return { ok: false, error: AADHAAR_ERROR };
      }
      if (!cleanEmail) return { ok: false, error: 'Email is required.' };

      const existing = users.find((u) => normalizeEmail(u.email) === cleanEmail);
      if (existing) {
        if (existing.role !== 'student') {
          return { ok: false, error: 'This email belongs to an admin account. Use Admin login.' };
        }
        setUser(existing);
        return { ok: true, error: '' };
      }

      const newUser = {
        id: generateId(),
        name: cleanName || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'student',
        password: '',
        profile: emptyProfile(),
        provider: 'google-demo',
      };
      setUsers((prev) => [...prev, newUser]);
      setUser(newUser);
      return { ok: true, error: '' };
    },
    [users],
  );

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  // Accepts { name, profile: {...} } and/or flat eligibility fields.
  // Email is never read here, so it cannot be changed.
  const updateProfile = useCallback(
    (updatedFields) => {
      if (!user) return { ok: false, error: 'Please log in first.' };
      const source = updatedFields && typeof updatedFields === 'object' ? updatedFields : {};
      const profilePatch = { ...pickProfileFields(source.profile), ...pickProfileFields(source) };
      const hasName = Object.prototype.hasOwnProperty.call(source, 'name');
      const cleanName = hasName ? String(source.name ?? '').trim() : user.name;
      if (hasName && !cleanName) return { ok: false, error: 'Name cannot be empty.' };
      if (hasAadhaarLike(cleanName, profilePatch.stream, profilePatch.district)) {
        return { ok: false, error: AADHAAR_ERROR };
      }
      const nextUser = {
        ...user,
        name: cleanName,
        profile: { ...user.profile, ...profilePatch },
      };
      setUser(nextUser);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? nextUser : u)));
      return { ok: true, error: '' };
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      login,
      loginAsAdmin,
      signUp,
      loginWithGoogleDemo,
      logout,
      updateProfile,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
    }),
    [
      user,
      login,
      loginAsAdmin,
      signUp,
      loginWithGoogleDemo,
      logout,
      updateProfile,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}
