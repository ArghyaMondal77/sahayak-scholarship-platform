/**
 * Matches schemes against a student profile.
 * A scheme matches when gender, caste, unmarried-only, disability, income and
 * a tier (stage + stream + marks range) all pass. Each match gets its first
 * qualifying tier as `matchedTier` and human-readable `reasons`.
 * Results are sorted by provider rank (state, central, private), then by the
 * tier's max_amount_inr descending.
 */

const PROVIDER_RANK = { state_govt: 1, central_govt: 2, private: 3 };

const fmtInr = (n) => Number(n).toLocaleString('en-IN');

export function matchSchemes(schemes, profile) {
  if (!Array.isArray(schemes) || !profile) return [];

  const results = [];

  for (const scheme of schemes) {
    const e = scheme.eligibility || {};
    const reasons = [];

    // a. genders
    if (Array.isArray(e.genders) && e.genders.length > 0) {
      if (!e.genders.includes(profile.gender)) continue;
      reasons.push(`Gender ${profile.gender} is eligible`);
    }

    // b. castes
    if (Array.isArray(e.castes) && e.castes.length > 0) {
      if (!e.castes.includes(profile.caste)) continue;
      reasons.push(`Category ${profile.caste} is eligible`);
    }

    // c. unmarried
    if (e.unmarried_only === true) {
      if (profile.isUnmarried !== true) continue;
      reasons.push('Unmarried students only — you qualify');
    }

    // d. disability
    const disabilityPct = profile.disabilityPct || 0;
    const minDisability = e.min_disability_pct || 0;
    if (disabilityPct < minDisability) continue;
    if (minDisability > 0) {
      reasons.push(`Disability ${disabilityPct}% meets ${minDisability}% minimum`);
    }

    // e. income
    const income = profile.income || 0;
    if (e.max_income !== null && e.max_income !== undefined) {
      if (income > e.max_income) continue;
      reasons.push(`Income ₹${fmtInr(income)} ≤ ₹${fmtInr(e.max_income)} limit`);
    } else {
      reasons.push('No income limit');
    }

    // f. tier
    const marks = profile.marks;
    const tier = (scheme.tiers || []).find((t) => {
      if (t.stage !== profile.stage) return false;
      const streams = Array.isArray(t.streams) ? t.streams : [];
      if (!(streams.includes('all') || streams.includes(profile.stream))) return false;
      if (marks < (t.min_marks || 0)) return false;
      if (t.max_marks !== null && t.max_marks !== undefined && marks > t.max_marks) return false;
      return true;
    });
    if (!tier) continue;

    if ((tier.min_marks || 0) > 0) {
      reasons.push(`Marks ${marks}% meets ${tier.min_marks}% minimum`);
    }
    reasons.push(`Stage ${profile.stage} and stream matched`);

    results.push({ ...scheme, matchedTier: tier, reasons });
  }

  const rank = (s) => PROVIDER_RANK[s.provider_type] ?? 4;

  results.sort((a, b) => {
    const byProvider = rank(a) - rank(b);
    if (byProvider !== 0) return byProvider;
    return (b.matchedTier.max_amount_inr || 0) - (a.matchedTier.max_amount_inr || 0);
  });

  return results;
}
