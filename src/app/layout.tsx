import type { Metadata, Viewport } from "next";
import "./globals.css";
import GoogleAnalytics from "./GoogleAnalytics";
import { absoluteUrl, siteConfig } from "./seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.koreanName,
  alternates: {
    canonical: "/",
  },
  robots: {
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
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteConfig.url,
    siteName: siteConfig.koreanName,
    title: siteConfig.koreanName,
    description: siteConfig.socialDescription,
    images: [
      {
        url: siteConfig.image,
        width: 200,
        height: 73,
        alt: siteConfig.koreanName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.koreanName,
    description: siteConfig.socialDescription,
    images: [siteConfig.image],
  },
  icons: {
    icon: siteConfig.image,
    apple: siteConfig.image,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: siteConfig.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "SoftwareApplication"],
    name: siteConfig.koreanName,
    alternateName: siteConfig.name,
    description: siteConfig.description,
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "Yoga training game",
    operatingSystem: "Any",
    url: siteConfig.url,
    image: absoluteUrl(siteConfig.image),
    inLanguage: ["ko", "en"],
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
    educationalUse: ["Practice", "Training", "Self-assessment"],
    learningResourceType: "Game",
    teaches: [
      "아쉬탕가 요가 프라이머리 시리즈 순서",
      "산스크리트 아사나 이름",
    ],
  };

  return (
    <html lang="ko">
      <body>
        {children}
        {process.env.NODE_ENV === "production" && <GoogleAnalytics />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
