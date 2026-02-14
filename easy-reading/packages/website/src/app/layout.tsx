import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Navigation from "../components/Navigation";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { WebsiteStructuredData, OrganizationStructuredData, SoftwareApplicationStructuredData } from './structured-data';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "English Reader - Make English Reading Natural and Effortless | Translate, Listen & Learn Vocabulary",
  description: "English Reader helps you read English naturally with instant translation, text-to-speech, and vocabulary saving. Perfect for English learners at all levels.",
  keywords: "English reader, English reading tool, learn English reading, translate English articles, English text to speech, vocabulary learning, Chrome extension for English learners",
  openGraph: {
    type: "website",
    url: "https://read.english-reader.com/",
    title: "English Reader - Make English Reading Natural and Effortless",
    description: "English Reader helps you read English naturally with instant translation, text-to-speech, and vocabulary saving.",
    images: [
      {
        url: "https://read.english-reader.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "English Reader - Interactive English Reading Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "English Reader - Make English Reading Natural and Effortless",
    description: "English Reader helps you read English naturally with instant translation, text-to-speech, and vocabulary saving.",
    images: ["https://read.english-reader.com/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="canonical" href="https://read.english-reader.com" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      </head>  
      <body className={inter.className}>
        {/* Structured Data for SEO */}
        <WebsiteStructuredData />
        <OrganizationStructuredData />
        <SoftwareApplicationStructuredData />
        <AuthProvider>
          <Navigation />
          <main className="min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}