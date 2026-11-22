import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { useLang } from '../i18n/LanguageContext.jsx';
import AuthButton from './AuthButton.jsx';

const LINKS = [
  { to: '/', key: 'nav_home' },
  { to: '/schemes', key: 'nav_schemes' },
  { to: '/for-you', key: 'nav_foryou' },
  { to: '/about', key: 'nav_about' },
];

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'hi', label: 'हिन्दी' },
];

function LanguagePill({ lang, setLang }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1">
      {LANGS.map((l) => {
        const active = lang === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active ? 'bg-ink text-white' : 'text-ink/70 hover:bg-stone-100'
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

function LiteToggle({ liteMode, autoDetected, toggleLiteMode, label }) {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={toggleLiteMode}
      aria-pressed={liteMode}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        liteMode
          ? 'bg-[#D97706] text-white font-semibold shadow-sm'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
    >
      <Zap size={14} aria-hidden="true" />
      {label}
      {liteMode && autoDetected && <span className="opacity-90">({t('auto_tag')})</span>}
    </button>
  );
}

export default function Navbar() {
  const { liteMode, autoDetected, toggleLiteMode } = useUi();
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const visibleLinks = isAdmin
    ? LINKS.map((l) => (l.to === '/for-you' ? { ...l, to: '/admin', key: null, label: 'Admin Panel' } : l))
    : LINKS;

  const linkClass = ({ isActive }) =>
    `rounded-full px-3 py-1.5 text-sm transition-colors ${
      isActive ? 'bg-ink text-white' : 'text-ink/80 hover:bg-stone-100'
    }`;

  return (
    <nav className="sticky top-4 z-50 mx-auto w-[94%] max-w-[1400px]">
      <div className="backdrop-blur-md bg-white/80 border border-stone-200/80 rounded-full shadow-sm">
        <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-2">
          <NavLink to="/" className="flex min-w-0 flex-col leading-tight">
            <span className="font-display text-base font-bold text-ink md:text-lg">
              {t('brand')}
            </span>
            <span className="font-calligraphy text-xs text-saffron">{t('brandSub')}</span>
          </NavLink>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-1">
              {visibleLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass} end={link.to === '/'}>
                  {link.label || t(link.key)}
                </NavLink>
              ))}
            </div>
            <LanguagePill lang={lang} setLang={setLang} />
            <LiteToggle
              liteMode={liteMode}
              autoDetected={autoDetected}
              toggleLiteMode={toggleLiteMode}
              label={t('lite_mode')}
            />
            <AuthButton />
          </div>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? t('menu_close') : t('menu_open')}
            className="rounded-full p-2 text-ink transition-colors hover:bg-stone-100 md:hidden"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/90 p-3 shadow-sm backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                {link.label || t(link.key)}
              </NavLink>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguagePill lang={lang} setLang={setLang} />
            <LiteToggle
              liteMode={liteMode}
              autoDetected={autoDetected}
              toggleLiteMode={toggleLiteMode}
              label={t('lite_mode')}
            />
            <AuthButton />
          </div>
        </div>
      )}
    </nav>
  );
}


