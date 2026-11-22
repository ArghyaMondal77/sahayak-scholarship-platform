// Lightweight rule-based parser that turns a free-text student query
// (e.g. "Class 12 girl, 78%, 1.5 lakh income") into a profile-like object.
// Any field that cannot be detected is returned as null, except isUnmarried, which defaults to true.

const normalise = (text) =>
  String(text ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// Order matters: first match wins.
const STAGE_RULES = [
  [/class\s*(5|6|7|8)\b/, 'class_5_8'],
  // class_11_12 is checked before class_9_10 so 'baro-dosh' / 'dwadosh' resolve to 11-12, not 9-10.
  [/class\s*(11|12)\b|baro|dwadosh|দ্বাদশ|barahvin|बारहवीं/, 'class_11_12'],
  [/class\s*9\b|class\s*10\b|\bclass\s*(9|10)\b|dosh|doshom|দশম|madhyamik/, 'class_9_10'],
  [/\bdiploma\b/, 'diploma'],
  [/\bphd\b|\bph\.d\b/, 'phd'],
  [/\bpg\b|\bm\.?sc\b|\bm\.?a\b|\bm\.?com\b|\bpost\s*graduat/, 'pg'],
  [/\bug\b|\bb\.?tech\b|\bb\.?sc\b|\bb\.?a\b|\bb\.?com\b|\bbachelor|\bgraduat/, 'ug'],
  [/\bhs\b|higher\s*secondary/, 'class_11_12'],
];

const FEMALE_RE = /\b(girl|girls|female|woman|women|daughter|meye|ladki)\b|মেয়ে|लड़की/;
const MALE_RE = /\b(boy|boys|male|man|men|son|chele|ladka)\b|ছেলে|लड़का/;

// Not yet wired into parseStudentQuery (isUnmarried still defaults to true).
const UNMARRIED_RE = /obibahito|abibahito|অবিবাহিত|avivahit|अविवाहित/;

// Order matters: first match wins.
const CASTE_RULES = [
  [/\bsc\b/, 'sc'],
  [/\bst\b/, 'st'],
  [/\bobc\b/, 'obc'],
  [/\bminority\b|\bmuslim\b|\bchristian\b|\bsikh\b|\bbuddhist\b/, 'minority'],
  [/\bgeneral\b|\bgen\b/, 'general'],
];

function detectStage(t) {
  for (const [re, value] of STAGE_RULES) {
    if (re.test(t)) return value;
  }
  return null;
}

function detectGender(t) {
  const female = FEMALE_RE.test(t);
  const male = MALE_RE.test(t);
  if (female && male) return null;
  if (female) return 'female';
  if (male) return 'male';
  return null;
}

function detectCaste(t) {
  for (const [re, value] of CASTE_RULES) {
    if (re.test(t)) return value;
  }
  return null;
}

function detectMarks(t) {
  const m = t.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const value = Number(m[1]);
  return value > 100 ? null : value;
}

function detectIncome(t) {
  const lakh = t.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|l)\b/);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);

  if (/\bincome\b/.test(t)) {
    const plain = t.match(
      /(?:₹|rs\.?|inr)?\s*(\d{4,8})\s*(?:per year|\/year|annual|income)?/
    );
    if (plain) return Number(plain[1]);
  }
  return null;
}

export function parseStudentQuery(text) {
  const t = normalise(text);
  return {
    stage: detectStage(t),
    gender: detectGender(t),
    caste: detectCaste(t),
    marks: detectMarks(t),
    income: detectIncome(t),
    isUnmarried: UNMARRIED_RE.test(t) ? true : undefined,
  };
}

export const DEMO_CHIP_QUERIES = [
  'Class 12 Girl • 78% • ₹1.5L income',
  'B.Tech SC Student • 65%',
  'PhD Research Scholar',
];
