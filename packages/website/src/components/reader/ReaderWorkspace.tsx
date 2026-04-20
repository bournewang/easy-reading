'use client';

import { type ReactNode, type RefObject } from 'react';
import { Reader, type Article, type ReaderProps } from '@easy-reading/shared';
import ReaderIndexNavigation, { type ReaderIndexItem } from '@/components/reader/ReaderIndexNavigation';

type ReaderIndexAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

type ReaderNavigationConfig = {
  title: string;
  description: string;
  items: ReaderIndexItem[];
  previous?: ReaderIndexAction;
  next?: ReaderIndexAction;
  currentLabel?: string;
  desktopClassName?: string;
  mobileClassName?: string;
};

type ReaderWorkspaceProps = {
  article: Article | null;
  warning?: ReactNode;
  emptyState?: ReactNode;
  floatingAction?: ReactNode;
  outerClassName?: string;
  panelClassName?: string;
  readerContainerClassName?: string;
  containedScroll?: boolean;
  contentScrollRef?: RefObject<HTMLDivElement>;
  navigation?: ReaderNavigationConfig;
} & Pick<
  ReaderProps,
  'vocabularyHighlightColorByWord' | 'vocabularyBookIdsByWord' | 'vocabularyWordDetailsByWord'
>;

const joinClassNames = (...classNames: Array<string | undefined | false>) =>
  classNames.filter(Boolean).join(' ');

export default function ReaderWorkspace({
  article,
  warning,
  emptyState,
  floatingAction,
  outerClassName,
  panelClassName,
  readerContainerClassName,
  containedScroll = false,
  contentScrollRef,
  navigation,
  vocabularyHighlightColorByWord,
  vocabularyBookIdsByWord,
  vocabularyWordDetailsByWord,
}: ReaderWorkspaceProps) {
  const floatingActionOffsetClass = navigation ? 'bottom-[5.5rem] xl:bottom-6' : 'bottom-4 xl:bottom-6';
  const readerArea = (
    <div className="relative min-h-0 min-w-0 h-full">
      <div className={joinClassNames('min-h-0 h-full', panelClassName)}>
        {article ? (
          <>
            {warning ? <div className="shrink-0">{warning}</div> : null}
            <div className={joinClassNames('min-h-0 h-full', readerContainerClassName)}>
              <Reader
                article={article}
                containedScroll={containedScroll}
                contentScrollRef={contentScrollRef}
                vocabularyHighlightColorByWord={vocabularyHighlightColorByWord}
                vocabularyBookIdsByWord={vocabularyBookIdsByWord}
                vocabularyWordDetailsByWord={vocabularyWordDetailsByWord}
              />
            </div>
          </>
        ) : (
          emptyState || null
        )}
      </div>
      {floatingAction ? (
        <div className={joinClassNames('pointer-events-none absolute left-1/2 z-50 -translate-x-1/2', floatingActionOffsetClass)}>
          <div className="pointer-events-auto">{floatingAction}</div>
        </div>
      ) : null}
    </div>
  );

  if (!navigation) {
    return readerArea;
  }

  return (
    <>
      <div className={joinClassNames('min-h-0 h-full', outerClassName)}>
        <ReaderIndexNavigation
          title={navigation.title}
          description={navigation.description}
          items={navigation.items}
          previous={navigation.previous}
          next={navigation.next}
          currentLabel={navigation.currentLabel}
          desktopClassName={navigation.desktopClassName}
          mobileClassName={navigation.mobileClassName}
        />
        {readerArea}
      </div>
    </>
  );
}