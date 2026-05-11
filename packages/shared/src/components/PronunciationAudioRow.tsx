import type { CSSProperties } from 'react';
import type { YoudaoAccent } from '../utils/helper';
import { getSpeechAccentTitle } from './Tips';

interface PronunciationEntry {
  accent: YoudaoAccent;
  phonetic?: string | null;
}

interface PronunciationAudioRowProps {
  word: string;
  locale: string;
  entries: PronunciationEntry[];
  onPlay: (word: string, accent: YoudaoAccent) => void;
  className?: string;
  style?: CSSProperties;
}

function getInlineAccentLabel(locale: string, accent: YoudaoAccent) {
  if (locale === 'zh') {
    return accent === 'uk' ? '英式' : '美式';
  }

  return accent;
}

function normalizePhonetic(phonetic?: string | null) {
  const value = phonetic?.trim();

  if (!value) {
    return null;
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default function PronunciationAudioRow({
  word,
  locale,
  entries,
  onPlay,
  className,
  style,
}: PronunciationAudioRowProps) {
  return (
    <div
      className={[
        'flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-black/72',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {entries.map((entry) => {
        const normalizedPhonetic = normalizePhonetic(entry.phonetic);

        return (
        <span key={entry.accent} className="inline-flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-[-0.12px] text-black/52">
            {getInlineAccentLabel(locale, entry.accent)}
          </span>
          {/* <button
            type="button"
            onClick={() => onPlay(word, entry.accent)}
            className="inline-flex h-10 w-10 items-center justify-center text-[#0066cc] transition-colors hover:text-[#005bb5] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2"
            title={getSpeechAccentTitle(locale, entry.accent)}
            aria-label={getSpeechAccentTitle(locale, entry.accent)}
          > */}
            <span aria-hidden="true" className="text-[17px] leading-none cursor-pointer" onClick={() => onPlay(word, entry.accent)}>🔊</span>
          {/* </button> */}
          {normalizedPhonetic ? (
            <span className="text-[15px] tracking-[-0.24px] text-black/72">{normalizedPhonetic}</span>
          ) : null}
        </span>
      )})}
    </div>
  );
}
