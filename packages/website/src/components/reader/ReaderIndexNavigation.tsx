'use client';

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
  desktopClassName?: string;
  mobileClassName?: string;
};

const desktopClassNames =
  'hidden h-full min-h-0 xl:block';

const mobileClassNames =
  'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur xl:hidden';

export default function ReaderIndexNavigation({
  title,
  description,
  items,
  previous,
  next,
  currentLabel,
  desktopClassName,
  mobileClassName,
}: ReaderIndexNavigationProps) {
  return (
    <>
      <aside className={desktopClassName || desktopClassNames}>
        <div className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{description}</h2>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onSelect}
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

      {(previous || next || currentLabel) && (
        <div className={mobileClassName || mobileClassNames}>
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-5">
            <button
              type="button"
              onClick={() => previous?.onSelect()}
              disabled={!previous || previous.disabled}
              className="inline-flex min-w-[92px] items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previous?.label || 'Prev'}
            </button>
            <div className="min-w-0 text-center text-sm text-slate-600">
              <span className="font-medium text-slate-900">{currentLabel || ''}</span>
            </div>
            <button
              type="button"
              onClick={() => next?.onSelect()}
              disabled={!next || next.disabled}
              className="inline-flex min-w-[92px] items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {next?.label || 'Next'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}