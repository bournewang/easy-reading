import type { ReactNode } from 'react';

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export default function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={["mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8", className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}