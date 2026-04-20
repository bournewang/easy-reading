import type { PropsWithChildren } from 'react';

type ReaderShellProps = PropsWithChildren<{
  className?: string;
}>;

export default function ReaderShell({ children, className }: ReaderShellProps) {
  return (
    <div className={["mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-5", className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}