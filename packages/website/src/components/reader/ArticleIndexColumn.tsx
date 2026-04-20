'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { Article } from '@easy-reading/shared';

type ArticleIndexColumnProps = {
  article: Article;
  containerRef: RefObject<HTMLElement | null>;
  scrollRootRef?: RefObject<HTMLElement | null>;
  title?: string;
  description?: string;
  sticky?: boolean;
};

export default function ArticleIndexColumn({
  article,
  containerRef,
  scrollRootRef,
  title = 'Index',
  description = 'Jump to any paragraph in this article.',
  sticky = true,
}: ArticleIndexColumnProps) {
  const textParagraphEntries = useMemo(
    () =>
      Object.entries(article.paragraphs || {})
        .filter(([, paragraph]) => paragraph.type === 'text')
        .map(([id, paragraph]) => ({
          id,
          preview: paragraph.content.replace(/\s+/g, ' ').trim(),
        })),
    [article.paragraphs],
  );
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(
    textParagraphEntries[0]?.id || null,
  );

  useEffect(() => {
    setActiveParagraphId(textParagraphEntries[0]?.id || null);
  }, [textParagraphEntries]);

  const findParagraphElement = useCallback(
    (paragraphId: string) => {
      const container = containerRef.current;
      if (!container) {
        return null;
      }

      return Array.from(container.querySelectorAll<HTMLElement>('[data-paragraph-id]')).find(
        (element) => element.getAttribute('data-paragraph-id') === paragraphId,
      ) || null;
    },
    [containerRef],
  );

  useEffect(() => {
    if (textParagraphEntries.length === 0) {
      return;
    }

    const visibilityMap = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const paragraphId = entry.target.getAttribute('data-paragraph-id');
          if (paragraphId) {
            visibilityMap.set(paragraphId, entry.isIntersecting);
          }
        });

        const nextActiveParagraph = textParagraphEntries.find(({ id }) => visibilityMap.get(id));
        if (nextActiveParagraph) {
          setActiveParagraphId(nextActiveParagraph.id);
        }
      },
      {
        root: scrollRootRef?.current || null,
        rootMargin: '100px 0px -55% 0px',
        threshold: 0.15,
      },
    );

    const observedElements = textParagraphEntries
      .map(({ id }) => findParagraphElement(id))
      .filter((element): element is HTMLElement => Boolean(element));

    observedElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [findParagraphElement, scrollRootRef, textParagraphEntries]);

  const handleSelectParagraph = useCallback(
    (paragraphId: string) => {
      const element = findParagraphElement(paragraphId);
      if (!element) {
        return;
      }

      setActiveParagraphId(paragraphId);
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    },
    [findParagraphElement],
  );

  if (textParagraphEntries.length <= 1) {
    return null;
  }

  return (
    <aside className="hidden xl:block xl:w-[220px] xl:flex-none">
      <div
        className={sticky
          ? 'sticky top-6 rounded-[28px] border border-black/6 bg-[#fbfbfd] shadow-[0_16px_40px_rgba(0,0,0,0.08)]'
          : 'h-full min-h-0 overflow-hidden rounded-[28px] border border-black/6 bg-[#fbfbfd] shadow-[0_16px_40px_rgba(0,0,0,0.08)]'}
      >
        <div className="border-b border-black/6 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">{title}</p>
          <p className="mt-1 text-sm text-black/60">{description}</p>
        </div>
        <div className={sticky ? 'max-h-[calc(100vh-11rem)] overflow-y-auto px-2 py-3' : 'h-full min-h-0 overflow-y-auto px-2 py-3'}>
          <div className="space-y-1">
            {textParagraphEntries.map(({ id, preview }, index) => {
              const isActive = id === activeParagraphId;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectParagraph(id)}
                  className={`flex w-full items-start gap-3 rounded-[20px] px-3 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-[#e8f2ff] text-[#005bb5]'
                      : 'text-black/62 hover:bg-white hover:text-[#1d1d1f]'
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isActive ? 'bg-white text-[#005bb5]' : 'bg-black/6 text-black/56'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="line-clamp-3 text-[13px] leading-5 tracking-[-0.18px]">{preview}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}