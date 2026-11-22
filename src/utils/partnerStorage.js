import partnersData from '../data/partners.json';

const BUNDLED_KEY_CSC = 'csc_centers';
const CUSTOM_KEY = 'sahayak_partners_custom';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readCustom() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CUSTOM_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function mergeList(bundled, custom) {
  const seen = new Set(bundled.map((item) => item?.id));
  const extras = [];
  for (const item of asArray(custom)) {
    if (!item || typeof item !== 'object') continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    extras.push(item);
  }
  return [...bundled, ...extras];
}

export function loadPartners() {
  const bundledCsc = asArray(partnersData?.[BUNDLED_KEY_CSC]);
  const bundledBanks = asArray(partnersData?.bank_partners);
  const custom = readCustom();

  return {
    csc_centers: mergeList(bundledCsc, custom[BUNDLED_KEY_CSC]),
    bank_partners: mergeList(bundledBanks, custom.bank_partners),
  };
}

export function loadCscsByDistrict(district) {
  const { csc_centers } = loadPartners();
  if (!district) return csc_centers;
  return csc_centers.filter((item) => item.district === district);
}

export function loadBankPartners() {
  return loadPartners().bank_partners;
}
