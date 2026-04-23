import React from 'react';
import { useLocaleContext } from '../contexts/LocaleContext';

const Tips: React.FC = () => {
  const { t } = useLocaleContext();

  return (
    <div>
      <div className="border-b border-black/6 px-5 py-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0071e3]">{t('website.dictionaryTips.eyebrow')}</p>
        <h3 className="mt-1 text-[21px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{t('website.dictionaryTips.title')}</h3>
      </div>

      <div className="space-y-3 px-5 py-5 text-[14px] leading-[1.5] tracking-[-0.22px] text-black/64">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            👆
          </span>
          <p>{t('website.dictionaryTips.tip1')}</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            🔍
          </span>
          <p>{t('website.dictionaryTips.tip2')}</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            🌟
          </span>
          <p>{t('website.dictionaryTips.tip3')}</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            🔊
          </span>
          <p>{t('website.dictionaryTips.tip4')}</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            🌐
          </span>
          <p>{t('website.dictionaryTips.tip5')}</p>
        </div>
      </div>
    </div>
  );
};

export default Tips;
