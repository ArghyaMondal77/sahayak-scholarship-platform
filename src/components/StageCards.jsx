import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useUi } from '../context/UiContext.jsx';
import { useLang } from '../i18n/LanguageContext.jsx';

const STAGES = [
  {
    title: 'School',
    to: '/schemes?stage=school',
    subtitle: 'Class 5–10',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'HS & Diploma',
    to: '/schemes?stage=hs',
    subtitle: 'Class 11–12 and diploma',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Undergraduate',
    to: '/schemes?stage=ug',
    subtitle: 'UG degree and college',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Postgraduate & PhD',
    to: '/schemes?stage=pg',
    subtitle: 'PG, research and PhD',
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=600&q=80',
  },
];

export default function StageCards() {
  const { liteMode } = useUi();
  const { t } = useLang();

  const cardClass = [
    'group min-h-[260px] flex flex-col justify-between rounded-3xl bg-white border border-stone-border shadow-sm p-6 transition',
    liteMode ? '' : 'hover:-translate-y-1 hover:shadow-md',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section>
      <h2 className="font-display text-2xl sm:text-3xl mb-6">{t('stage_heading')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {STAGES.map((s, i) => (
          <Link key={s.title} to={s.to} className={cardClass}>
            {!liteMode && (
              <div className="group overflow-hidden rounded-xl">
                <img
                  src={s.image}
                  alt=""
                  loading="lazy"
                  className="h-36 w-full rounded-xl object-cover mb-4 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
            <div className="flex items-start justify-between">
              <span className="font-display text-saffron text-sm font-semibold">
                {String(i + 1).padStart(2, '0')}
              </span>
              <ArrowUpRight size={20} className="text-stone-600" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{s.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
