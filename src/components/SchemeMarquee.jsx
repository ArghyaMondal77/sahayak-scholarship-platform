import { ShieldCheck } from 'lucide-react';
import { useUi } from '../context/UiContext.jsx';
import { useLang } from '../i18n/LanguageContext.jsx';

const SCHEMES = [
  { name: 'SVMCM', benefit: 'Up to ₹60,000/yr' },
  { name: 'Kanyaratna', benefit: '₹25,000' },
  { name: 'OASIS', benefit: 'Scholarship support' },
  { name: 'Aikyashree', benefit: 'Scholarship support' },
  { name: 'Nabanna', benefit: '₹10,000' },
  { name: 'Taruner Swapna', benefit: '₹10,000' },
  { name: 'AICTE Saksham', benefit: '₹50,000/yr' },
  { name: 'Reliance UG', benefit: 'Up to ₹2,00,000' },
];

const MASK = 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)';

export default function SchemeMarquee() {
  const { liteMode } = useUi();
  const { t } = useLang();

  const trackClass = liteMode
    ? 'flex w-max gap-4'
    : 'marquee-track flex w-max gap-4';

  const renderCards = (copy) =>
    SCHEMES.map((s) => (
      <div
        key={`${s.name}-${copy}`}
        className="min-w-[240px] rounded-2xl bg-white border border-stone-border shadow-sm p-5"
      >
        <h3 className="font-display text-lg font-semibold">{s.name}</h3>
        <p className="text-saffron font-semibold text-sm mt-1">{s.benefit}</p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald/10 text-emerald text-xs font-semibold px-2.5 py-1">
          <ShieldCheck size={14} />
          Verified Nov 2026
        </span>
      </div>
    ));

  return (
    <section>
      <h2 className="font-display text-2xl sm:text-3xl mb-6">{t('marquee_heading')}</h2>
      <div className="marquee-wrap overflow-hidden" style={{ maskImage: MASK, WebkitMaskImage: MASK }}>
        <div className={trackClass}>
          {renderCards('a')}
          {renderCards('b')}
        </div>
      </div>
    </section>
  );
}
