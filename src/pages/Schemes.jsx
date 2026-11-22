import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import SchemeDrawer from '../components/SchemeDrawer.jsx';
import { getAllSchemes } from '../utils/schemeStorage.js';
import { useLang } from '../i18n/LanguageContext.jsx';
import { isValidDateString, formatDeadlineDate, isDeadlinePassed } from '../utils/deadline.js';

// URL stage param -> stage keys it selects. Shortcuts map to groups; single keys map to themselves.
const STAGE_GROUPS = {
  school: ['class_5_8', 'class_9_10'],
  hs: ['class_11_12', 'diploma'],
  ug: ['ug'],
  pg: ['pg', 'phd'],
  class_5_8: ['class_5_8'],
  class_9_10: ['class_9_10'],
  class_11_12: ['class_11_12'],
  diploma: ['diploma'],
  phd: ['phd'],
};

const STAGE_OPTIONS = [
  { labelKey: 'opt_all', value: '' },
  { labelKey: 'opt_class_5_8', value: 'class_5_8' },
  { labelKey: 'opt_class_9_10', value: 'class_9_10' },
  { labelKey: 'opt_class_11_12', value: 'class_11_12' },
  { labelKey: 'opt_diploma', value: 'diploma' },
  { labelKey: 'opt_ug', value: 'ug' },
  { labelKey: 'opt_pg', value: 'pg' },
  { labelKey: 'opt_phd', value: 'phd' },
];

const PROVIDER_OPTIONS = [
  { labelKey: 'opt_all', value: '' },
  { labelKey: 'prov_state_govt', value: 'state_govt' },
  { labelKey: 'prov_central_govt', value: 'central_govt' },
  { labelKey: 'prov_private', value: 'private' },
];

const CATEGORY_OPTIONS = [
  { labelKey: 'opt_all', value: '' },
  { labelKey: 'cat_general', value: 'general' },
  { labelKey: 'cat_sc', value: 'sc' },
  { labelKey: 'cat_st', value: 'st' },
  { labelKey: 'cat_obc', value: 'obc' },
  { labelKey: 'cat_minority', value: 'minority' },
];

const GENDER_OPTIONS = [
  { labelKey: 'opt_all', value: '' },
  { labelKey: 'gender_female', value: 'female' },
  { labelKey: 'gender_male', value: 'male' },
];

const INCOME_OPTIONS = [
  { labelKey: 'opt_any', value: 0 },
  { label: '≤ ₹1.2L', value: 120000 },
  { label: '≤ ₹2L', value: 200000 },
  { label: '≤ ₹2.5L', value: 250000 },
  { label: '≤ ₹8L', value: 800000 },
];

const PROVIDER_BADGE = {
  state_govt: { labelKey: 'prov_state_govt', className: 'bg-amber-100 text-amber-800' },
  central_govt: { labelKey: 'prov_central_govt', className: 'bg-slate-100 text-slate-700' },
  private: { labelKey: 'prov_private', className: 'bg-indigo-100 text-indigo-800' },
};

function formatLakh(amount) {
  return `₹${+(amount / 100000).toFixed(2)}L`;
}

function benefitAmount(scheme, tr) {
  if (scheme.benefit_type === 'in_kind') {
    const first = scheme.tiers[0];
    if (first && first.max_amount_inr === 0 && first.benefit_text?.includes('Bicycle')) {
      return tr('bike_free');
    }
    return tr('inkind_support');
  }
  const max = Math.max(0, ...scheme.tiers.map((t) => t.max_amount_inr || 0));
  return `₹${max.toLocaleString('en-IN')}`;
}

function FilterGroup({ label, options, value, onChange, isActive }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/60">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = isActive ? isActive(opt.value) : opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-[#D97706] bg-[#D97706] text-white'
                  : 'border-stone-300 bg-white text-ink/80 hover:bg-stone-50',
              ].join(' ')}
            >
              {opt.labelKey ? t(opt.labelKey) : opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Schemes() {
  const { t } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const stageParam = searchParams.get('stage') || '';
  const selectedStageKeys = STAGE_GROUPS[stageParam];

  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [income, setIncome] = useState(0);
  const [selected, setSelected] = useState(null);

  const schemes = useMemo(() => getAllSchemes(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schemes.filter((s) => {
      if (selectedStageKeys && !s.tiers.some((t) => selectedStageKeys.includes(t.stage))) {
        return false;
      }
      if (provider && s.provider_type !== provider) return false;
      if (category && !(s.eligibility.castes || []).includes(category)) return false;
      if (gender && !(s.eligibility.genders || []).includes(gender)) return false;
      if (income && s.eligibility.max_income !== null && s.eligibility.max_income < income) {
        return false;
      }
      if (q) {
        const haystack = [
          s.name,
          s.nodal_agency,
          ...s.tiers.map((t) => t.benefit_text || ''),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [schemes, selectedStageKeys, provider, category, gender, income, search]);

  const hasActiveFilters =
    Boolean(search.trim()) || Boolean(provider) || Boolean(category) || Boolean(gender) ||
    income !== 0 || Boolean(stageParam);

  const handleStageChange = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('stage', value);
    else next.delete('stage');
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearch('');
    setProvider('');
    setCategory('');
    setGender('');
    setIncome(0);
    const next = new URLSearchParams(searchParams);
    next.delete('stage');
    setSearchParams(next);
  };

  // Stage pill highlighting: a URL shortcut highlights every pill in its group.
  const isStageActive = (value) =>
    value ? Boolean(selectedStageKeys && selectedStageKeys.includes(value)) : !selectedStageKeys;

  return (
    <div className="mx-auto w-[94%] max-w-[1400px] px-0 pb-16 pt-6 md:pt-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl">{t('schemes_title')}</h1>
        <p className="mt-2 text-ink/70">
          {t('schemes_showing')} {filtered.length} {t('schemes_of')} {schemes.length} {t('schemes_verified_suffix')}
        </p>
      </header>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('schemes_search_placeholder')}
            aria-label={t('schemes_search_aria')}
            className="w-full rounded-full border border-stone-300 px-4 py-2 text-sm md:w-72"
          />
          <FilterGroup
            label={t('filter_stage')}
            options={STAGE_OPTIONS}
            isActive={isStageActive}
            onChange={handleStageChange}
          />
          <FilterGroup label={t('filter_provider')} options={PROVIDER_OPTIONS} value={provider} onChange={setProvider} />
          <FilterGroup label={t('filter_category')} options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          <FilterGroup label={t('filter_gender')} options={GENDER_OPTIONS} value={gender} onChange={setGender} />
          <FilterGroup label={t('filter_income')} options={INCOME_OPTIONS} value={income} onChange={setIncome} />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
            >
              {t('btn_reset_filters')}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-ink/70">
          {t('schemes_empty')}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((scheme) => {
            const badge = PROVIDER_BADGE[scheme.provider_type];
            const { eligibility } = scheme;
            const genders = eligibility.genders || [];
            return (
              <article
                key={scheme.id}
                className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition-all hover:border-amber-300/80 hover:shadow-md"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {badge && (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
                        {t(badge.labelKey)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                      <ShieldCheck size={14} aria-hidden="true" />
                      {t('verified_nov_2026')}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">
                    {scheme.name}
                  </h3>
                  <p className="mt-1 text-sm text-ink/60">{scheme.nodal_agency}</p>

                  <div className="my-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                    <p className="font-display text-xl font-semibold text-ink">{benefitAmount(scheme, t)}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink/80">
                      {scheme.tiers[0]?.benefit_text}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {eligibility.state === 'WB' && (
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-ink/80">{t('chip_wb_domicile')}</span>
                    )}
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-ink/80">
                      {eligibility.max_income === null
                        ? t('chip_no_income_limit')
                        : `${t('chip_income_le')} ${formatLakh(eligibility.max_income)}`}
                    </span>
                    {genders.length === 1 && genders[0] === 'female' && (
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-ink/80">{t('chip_women_only')}</span>
                    )}
                    {eligibility.exam_required && (
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-ink/80">{t('chip_exam_required')}</span>
                    )}
                    {eligibility.min_disability_pct > 0 && (
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-ink/80">
                        {eligibility.min_disability_pct}%+ {t('chip_disability')}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 flex items-center gap-2 text-sm text-ink/70">
                    <CalendarDays size={16} aria-hidden="true" />
                    <span>{scheme.deadline}</span>
                  </p>
                  {isValidDateString(scheme.deadline_date) && (
                    isDeadlinePassed(scheme.deadline_date) ? (
                      <span className="mt-1 inline-block rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        {`${t('deadline_passed')} (${formatDeadlineDate(scheme.deadline_date)})`}
                      </span>
                    ) : (
                      <span className="mt-1 inline-block rounded-md border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                        {`${t('deadline_apply_before')}: ${formatDeadlineDate(scheme.deadline_date)}`}
                      </span>
                    )
                  )}

                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(scheme)}
                    className="flex-1 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
                  >
                    {t('btn_details')}
                  </button>
                  <a
                    href={scheme.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-full bg-[#D97706] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    {t('btn_official_portal')}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <SchemeDrawer key={selected.id} scheme={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
