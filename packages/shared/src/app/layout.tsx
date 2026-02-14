// import '../styles/tailwind.css';

export const metadata = {
  title: 'English Reader',
  description: 'A tool for reading English articles and learning vocabulary',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { LocaleProvider } from "../contexts/LocaleContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
        <LocaleProvider>
          {children}
        </LocaleProvider>
        </body>
    </html>
  );
}
