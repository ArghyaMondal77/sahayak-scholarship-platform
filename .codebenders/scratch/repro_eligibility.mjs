// Repro: /for-you matcher verdict vs what /api/chat hands Gemini, same student profile.
import fs from 'fs';
import path from 'path';
import { matchSchemes } from '../../src/utils/matcher.js';
import handler from '../../api/chat.js';

const root = process.cwd();
const schemes = JSON.parse(fs.readFileSync(path.join(root, 'src/data/schemes.json'), 'utf8'));

// Raw student profile as stored on user.profile (assumed values: only class and income are from the bug report).
const rawProfile = {
  stage: 'class_11_12', stream: 'science', marks: 75, income: 180000,
  caste: 'general', gender: 'male', isUnmarried: true, disabilityPct: 0, district: 'Kolkata',
};

// ---- Path A: /for-you (ForYou.jsx normalizeProfile -> matchSchemes) ----
const forYouProfile = {
  stage: String(rawProfile.stage), stream: String(rawProfile.stream), marks: Number(rawProfile.marks) || 0,
  income: Number(rawProfile.income) || 0, caste: String(rawProfile.caste), gender: String(rawProfile.gender),
  isUnmarried: rawProfile.isUnmarried === true, disabilityPct: Number(rawProfile.disabilityPct) || 0,
  district: String(rawProfile.district),
};
const matched = matchSchemes(schemes, forYouProfile).map((s) => s.id);
console.log('=== PATH A: /for-you matcher verdicts ===');
for (const id of ['wb-jbnsts-senior', 'wb-nabanna']) {
  console.log(`${id}: ${matched.includes(id) ? 'MATCHED' : 'NOT MATCHED'}`);
}
console.log('all matched ids:', JSON.stringify(matched));

// ---- Path B: /api/chat handler, fetch mocked to capture the exact Gemini request ----
let captured = null;
globalThis.fetch = async (url, opts) => {
  captured = { url, body: JSON.parse(opts.body) };
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'STUB' }] } }] }), { status: 200 });
};
process.env.GEMINI_API_KEY = 'test-key-not-real';

const req = {
  method: 'POST',
  body: {
    message: 'Am I eligible for JBNSTS Senior and Nabanna?',
    lang: 'en',
    history: [],
    schemes, // ChatbotPill sends getAllSchemes(), which equals schemes.json with no localStorage
    userProfile: rawProfile, // ChatbotPill sends currentUser.profile when role === 'student'
  },
};
const res = {
  statusCode: 200, body: null,
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
};
await handler(req, res);
console.log('\n=== PATH B: /api/chat ===');
console.log('handler status:', res.statusCode, 'reply:', JSON.stringify(res.body));
const sys = captured.body.systemInstruction.parts[0].text;
console.log('gemini url:', captured.url);
console.log('--- rules sent in system prompt (eligibility-related) ---');
console.log(sys.split('\n').filter((l) => /eligib|Likely|Answer ONLY/.test(l)).join('\n'));
console.log('--- <student_profile> block ---');
console.log(sys.slice(sys.indexOf('<student_profile>')));
console.log('--- does the prompt contain any computed eligibility / matcher output? ---');
console.log('contains "computed" or "matched" or "eligible_for":',
  /computed|matchSchemes|eligible_for|matched_schemes/i.test(sys));
const nab = schemes.find((s) => s.id === 'wb-nabanna');
const jb = schemes.find((s) => s.id === 'wb-jbnsts-senior');
console.log('nabanna eligibility sent:', JSON.stringify(nab.eligibility.max_income), 'tiers stage:', nab.tiers.map((t) => t.stage).join(','));
console.log('jbnsts tiers sent:', JSON.stringify(jb.tiers.map((t) => ({ stage: t.stage, streams: t.streams }))));
console.log('system prompt contains JBNSTS entry:', sys.includes('wb-jbnsts-senior'), '| Nabanna entry:', sys.includes('wb-nabanna'));
