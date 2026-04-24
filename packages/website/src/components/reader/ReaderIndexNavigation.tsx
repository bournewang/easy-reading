'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

type ReaderIndexAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

export type ReaderIndexItem = {
  id: string;
  overline?: string;
  title: string;
  meta?: string;
  active?: boolean;
  onSelect: () => void;
};

type ReaderIndexNavigationProps = {
  title: string;
  description: string;
  items: ReaderIndexItem[];
  previous?: ReaderIndexAction;
  next?: ReaderIndexAction;
  currentLabel?: string;
  persistScrollKey?: string;
  desktopClassName?: string;
  mobileClassName?: string;
};

const desktopClassNames =
  'hidden h-full min-h-0 xl:block';

const mobileClassNames =
  'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur xl:hidden';

type NavigationDirection = 'previous' | 'next';

const navigationButtonBaseClassName =
  'inline-flex items-center justify-center rounded-full bg-white font-medium text-slate-700 shadow-sm transition-colors hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none';

function renderNavigationButton(
  action: ReaderIndexAction | undefined,
  direction: NavigationDirection,
  className: string,
  onBeforeSelect?: () => void,
) {
  const symbol = direction === 'previous' ? '⬅️' : '➡️';
  const fallbackLabel = direction === 'previous' ? 'Previous' : 'Next';

  return (
    <button
      type="button"
      onClick={() => {
        onBeforeSelect?.();
        action?.onSelect();
      }}
      disabled={!action || action.disabled}
      aria-label={action?.label || fallbackLabel}
      className={`${navigationButtonBaseClassName} ${className}`}
    >
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

export default function ReaderIndexNavigation({
  title,
  description,
  items,
  previous,
  next,
  currentLabel,
  persistScrollKey,
  desktopClassName,
  mobileClassName,
}: ReaderIndexNavigationProps) {
  const activeItemIndex = items.findIndex((item) => item.active);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const storageKey = useMemo(
    () => (persistScrollKey ? `reader-index-scroll:${persistScrollKey}` : null),
    [persistScrollKey],
  );

  const persistScrollPosition = useCallback(() => {
    if (!storageKey || !listContainerRef.current) {
      return;
    }

    try {
      window.sessionStorage.setItem(storageKey, String(listContainerRef.current.scrollTop));
    } catch {
      // Ignore storage failures (e.g. privacy mode).
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !listContainerRef.current) {
      return;
    }

    try {
      const savedScrollTop = window.sessionStorage.getItem(storageKey);
      if (savedScrollTop === null) {
        return;
      }

      const nextScrollTop = Number(savedScrollTop);
      if (Number.isFinite(nextScrollTop)) {
        listContainerRef.current.scrollTop = Math.max(0, nextScrollTop);
      }
    } catch {
      // Ignore storage failures (e.g. privacy mode).
    }
  }, [storageKey, items.length]);

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container || activeItemIndex < 0) {
      return;
    }

    const activeElement = container.querySelector<HTMLButtonElement>(
      `[data-reader-index-item-index="${activeItemIndex}"]`,
    );
    if (!activeElement) {
      return;
    }

    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const itemTop = activeElement.offsetTop;
    const itemBottom = itemTop + activeElement.offsetHeight;
    const isOutOfView = itemTop < containerTop || itemBottom > containerBottom;

    if (isOutOfView) {
      activeElement.scrollIntoView({ block: 'nearest' });
      persistScrollPosition();
    }
  }, [activeItemIndex, items.length, persistScrollPosition]);
  const fallbackPrevious =
    activeItemIndex > 0
      ? {
          label: '⬅️',
          onSelect: items[activeItemIndex - 1].onSelect,
          disabled: false,
        }
      : undefined;
  const fallbackNext =
    activeItemIndex >= 0 && activeItemIndex < items.length - 1
      ? {
          label: '➡️',
          onSelect: items[activeItemIndex + 1].onSelect,
          disabled: false,
        }
      : undefined;
  const effectivePrevious = previous || fallbackPrevious;
  const effectiveNext = next || fallbackNext;
  const effectiveCurrentLabel =
    currentLabel || (activeItemIndex >= 0 ? items[activeItemIndex].title : '');

  return (
    <>
      <aside className={desktopClassName || desktopClassNames}>
        <div className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{description}</h2>
          </div>

          {(effectivePrevious || effectiveNext || effectiveCurrentLabel) ? (
            <div className="mb-3 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <div className="flex items-center gap-2">
                {renderNavigationButton(effectivePrevious, 'previous', 'h-10 min-w-[64px] px-3 text-xl', persistScrollPosition)}
                <div className="min-w-0 flex-1 truncate text-center text-xs text-slate-600" title={effectiveCurrentLabel}>
                  <span className="font-medium text-slate-900">{effectiveCurrentLabel}</span>
                </div>
                {renderNavigationButton(effectiveNext, 'next', 'h-10 min-w-[64px] px-3 text-xl', persistScrollPosition)}
              </div>
            </div>
          ) : null}

          <div
            ref={listContainerRef}
            onScroll={persistScrollPosition}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
          >
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-reader-index-item-index={index}
                onClick={() => {
                  persistScrollPosition();
                  item.onSelect();
                }}
                className={`w-full rounded-2xl border p-3 text-left transition-all ${
                  item.active
                    ? 'border-sky-200 bg-sky-50 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:border-sky-100 hover:bg-white'
                }`}
              >
                {(item.overline || item.meta) && (
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    {item.overline ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                        {item.overline}
                      </span>
                    ) : <span />}
                    {item.meta ? <span className="text-xs text-slate-500">{item.meta}</span> : null}
                  </div>
                )}
                <h3 className="text-sm font-semibold leading-6 text-slate-900">{item.title}</h3>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {(effectivePrevious || effectiveNext || effectiveCurrentLabel) && (
        <div className={mobileClassName || mobileClassNames}>
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-5">
            {renderNavigationButton(effectivePrevious, 'previous', 'h-11 min-w-[96px] px-4 text-2xl', persistScrollPosition)}
            <div className="min-w-0 text-center text-sm text-slate-600">
              <span className="font-medium text-slate-900">{effectiveCurrentLabel}</span>
            </div>
            {renderNavigationButton(effectiveNext, 'next', 'h-11 min-w-[96px] px-4 text-2xl', persistScrollPosition)}
          </div>
        </div>
      )}
    </>
  );
}