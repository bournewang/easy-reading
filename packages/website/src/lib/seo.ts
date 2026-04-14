import type { Metadata } from "next";

const defaultSiteUrl = "https://english-reader.com";

export const siteConfig = {
  name: "English Reader",
  shortName: "English Reader",
  description:
    "English Reader helps non-native English speakers read with instant translation, text-to-speech, and a built-in dictionary.",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || defaultSiteUrl,
};

export function absoluteUrl(path = "/") {
  return path === "/"
    ? siteConfig.siteUrl
    : `${siteConfig.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

type CreatePageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  keywords = [],
  noIndex = false,
}: CreatePageMetadataOptions): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}
