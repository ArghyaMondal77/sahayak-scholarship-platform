import { useLang } from '../i18n/LanguageContext.jsx';

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="mt-16 border-t border-stone-border bg-white">
      <div className="mx-auto w-[94%] max-w-[1400px] px-4 py-10 text-sm text-ink/70 sm:px-6 lg:px-8">
        <p className="max-w-3xl text-base font-medium leading-relaxed text-ink">
          {t('footer_disclaimer')}
        </p>
        <div className="mt-6 flex flex-col gap-2 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display font-semibold text-ink">{t('brand')} · {t('brandSub')}</p>
          <p>© 2026 {t('brand')}</p>
        </div>
      </div>
    </footer>
  );
}


