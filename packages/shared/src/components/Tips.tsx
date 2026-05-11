import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [isOpen, setIsOpen] = useState(false);
  const label = locale === 'zh' ? '默认发音' : 'Default Accent';
  const dialogTitle = locale === 'zh' ? '设置默认发音' : 'Set Default Accent';
  const dialogDescription = locale === 'zh'
    ? '选择你希望优先使用的发音。'
    : 'Choose which pronunciation should be used by default.';
  const cancelLabel = locale === 'zh' ? '取消' : 'Cancel';
  const baseTextClassName = textClassName || 'text-[11px] font-semibold uppercase text-black/48';
  const currentAccentLabel = getSpeechAccentLabel(locale, preferredPhonetic);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectAccent = (accent: YoudaoAccent) => {
    onChange(accent);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[980px] border border-black/10 bg-[#fafafc] px-2.5 py-1 text-left"
        title={label}
        type="button"
      >
        <span className={baseTextClassName}>{label}</span>
        <span className="rounded-[980px] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0066cc] shadow-sm">
          {currentAccentLabel}
        </span>
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4"
            onClick={() => setIsOpen(false)}
            role="presentation"
          >
            <div
              className="w-full max-w-[320px] rounded-[20px] bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="default-accent-dialog-title"
            >
              <div className="mb-3">
                <h4 id="default-accent-dialog-title" className="text-[16px] font-semibold text-[#1d1d1f]">
                  {dialogTitle}
                </h4>
                <p className="mt-1 text-[13px] leading-[1.45] text-black/56">
                  {dialogDescription}
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleSelectAccent('uk')}
                  className={`flex w-full items-center justify-between rounded-[14px] border px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${preferredPhonetic === 'uk' ? 'border-[#0066cc] bg-[#f0f7ff] text-[#0066cc]' : 'border-black/10 bg-[#fafafc] text-[#1d1d1f]'}`}
                  title={getDefaultSpeechAccentTitle(locale, 'uk')}
                  type="button"
                >
                  <span>{getSpeechAccentLabel(locale, 'uk')}</span>
                  {preferredPhonetic === 'uk' ? <span className="text-[12px]">✓</span> : null}
                </button>
                <button
                  onClick={() => handleSelectAccent('us')}
                  className={`flex w-full items-center justify-between rounded-[14px] border px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${preferredPhonetic === 'us' ? 'border-[#0066cc] bg-[#f0f7ff] text-[#0066cc]' : 'border-black/10 bg-[#fafafc] text-[#1d1d1f]'}`}
                  title={getDefaultSpeechAccentTitle(locale, 'us')}
                  type="button"
                >
                  <span>{getSpeechAccentLabel(locale, 'us')}</span>
                  {preferredPhonetic === 'us' ? <span className="text-[12px]">✓</span> : null}
                </button>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-[980px] border border-black/10 px-3 py-1.5 text-[12px] font-semibold text-black/60 transition-colors hover:bg-black/[0.03]"
                  type="button"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
        : null}
    </>
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
