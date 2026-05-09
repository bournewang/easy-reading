import React from 'react';
import { useLocaleContext } from '../contexts/LocaleContext';
import type { YoudaoAccent } from '../utils/helper';

interface DefaultSpeechSwitchProps {
  preferredPhonetic: YoudaoAccent;
  onChange: (accent: YoudaoAccent) => void;
  locale: string;
  textClassName?: string;
}

export function getSpeechAccentLabel(locale: string, accent: YoudaoAccent) {
  if (locale === 'zh') {
    return accent === 'uk' ? '英式' : '美式';
  }

  return accent === 'uk' ? 'UK' : 'US';
}

export function getSpeechAccentTitle(locale: string, accent: YoudaoAccent) {
  if (locale === 'zh') {
    return accent === 'uk' ? '播放英式发音' : '播放美式发音';
  }

  return accent === 'uk' ? 'Play British pronunciation' : 'Play American pronunciation';
}

export function getDefaultSpeechAccentTitle(locale: string, accent: YoudaoAccent) {
  if (locale === 'zh') {
    return accent === 'uk' ? '设置英式发音为默认发音' : '设置美式发音为默认发音';
  }

  return accent === 'uk'
    ? 'Set British pronunciation as the default'
    : 'Set American pronunciation as the default';
}

export const DefaultSpeechSwitch: React.FC<DefaultSpeechSwitchProps> = ({
  preferredPhonetic,
  onChange,
  locale,
  textClassName,
}) => {
  const label = locale === 'zh' ? '默认发音' : 'Default';
  const baseTextClassName = textClassName || 'text-[11px] font-semibold uppercase text-black/48';

  return (
    <div className="inline-flex items-center gap-2">
      <span className={baseTextClassName}>{label}</span>
      <div className="inline-flex rounded-[980px] border border-black/10 bg-[#fafafc] p-0.5">
        <button
          onClick={() => onChange('uk')}
          className={`rounded-[980px] px-2.5 py-1 text-[11px] font-semibold transition-colors ${preferredPhonetic === 'uk' ? 'bg-white text-[#0066cc] shadow-sm' : 'text-black/56'}`}
          title={getDefaultSpeechAccentTitle(locale, 'uk')}
          type="button"
        >
          {getSpeechAccentLabel(locale, 'uk')}
        </button>
        <button
          onClick={() => onChange('us')}
          className={`rounded-[980px] px-2.5 py-1 text-[11px] font-semibold transition-colors ${preferredPhonetic === 'us' ? 'bg-white text-[#0066cc] shadow-sm' : 'text-black/56'}`}
          title={getDefaultSpeechAccentTitle(locale, 'us')}
          type="button"
        >
          {getSpeechAccentLabel(locale, 'us')}
        </button>
      </div>
    </div>
  );
};

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
