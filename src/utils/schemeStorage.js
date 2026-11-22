import schemesData from '../data/schemes.json';

const STORAGE_KEY = 'sahayak.schemes';

export function loadSchemes() {
  const bundled = Array.isArray(schemesData)
    ? schemesData
    : Array.isArray(schemesData?.schemes)
      ? schemesData.schemes
      : [];

  let saved = [];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      saved = Array.isArray(parsed) ? parsed : [];
    } catch {
      saved = [];
    }
  }

  const bundledIds = new Set(bundled.map((s) => s.id));
  const extra = saved.filter((s) => !bundledIds.has(s.id));

  return [...bundled, ...extra];
}


const CHECKLIST_KEY = 'sahayak.checklist';

function readChecklistMap() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getChecklist(schemeId) {
  const value = readChecklistMap()[schemeId];
  return Array.isArray(value) ? value : [];
}

export function setChecklist(schemeId, value) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const map = readChecklistMap();
  map[schemeId] = Array.isArray(value) ? value : [];
  try {
    window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(map));
  } catch {
    // storage full or unavailable; keep in-memory state only
  }
}


const CUSTOM_KEY = 'sahayak_schemes_custom';
const OVERRIDES_KEY = 'sahayak_schemes_overrides';

function readJsonArray(key) {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readOverrideMap() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OVERRIDES_KEY));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable; keep in-memory state only
  }
}

export function getAllSchemes() {
  const bundled = Array.isArray(schemesData)
    ? schemesData
    : Array.isArray(schemesData?.schemes)
      ? schemesData.schemes
      : [];

  const custom = readJsonArray(CUSTOM_KEY);
  const overrides = readOverrideMap();

  const bundledIds = new Set(bundled.map((s) => s.id));
  const merged = [...bundled, ...custom.filter((s) => s && !bundledIds.has(s.id))];

  return merged.map((s) => {
    const next = { ...s };
    const o = overrides[s.id];
    if (!o || typeof o !== 'object') return next;

    if ('deadline_date' in o) next.deadline_date = o.deadline_date;
    if ('deadline' in o) next.deadline = o.deadline;
    if ('official_url' in o) next.official_url = o.official_url;
    if ('last_verified' in o) next.last_verified = o.last_verified;
    if (o.eligibility && typeof o.eligibility === 'object' && 'max_income' in o.eligibility) {
      next.eligibility = { ...(s.eligibility || {}), max_income: o.eligibility.max_income };
    }
    return next;
  });
}

export function updateSchemeOverride(id, patch) {
  const overrides = readOverrideMap();
  overrides[id] = { ...(overrides[id] && typeof overrides[id] === 'object' ? overrides[id] : {}), ...patch };
  writeJson(OVERRIDES_KEY, overrides);
  return overrides[id];
}

export function saveCustomScheme(scheme) {
  const list = readJsonArray(CUSTOM_KEY);
  const idx = list.findIndex((s) => s && s.id === scheme.id);
  if (idx >= 0) {
    list[idx] = scheme;
  } else {
    list.push(scheme);
  }
  writeJson(CUSTOM_KEY, list);
  return list;
}

export function deleteCustomScheme(id) {
  const list = readJsonArray(CUSTOM_KEY).filter((s) => !(s && s.id === id));
  writeJson(CUSTOM_KEY, list);
  return list;
}

