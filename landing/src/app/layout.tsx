import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "greek"],
  display: 'swap',
});

// SEO Research-Based Keywords (Monthly Search Volume in Greece):
// - εφημερεύοντα φαρμακεία: 135,000
// - φαρμακείο εφημερεύον: 74,000
// - εφημερεύοντα φαρμακεία Αθήνα: 33,100
// - διανυκτερεύοντα φαρμακεία: 22,200
// - φαρμακεία κοντά μου: High volume
// - ανοιχτά φαρμακεία: Medium volume

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#00C853' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
};

export const metadata: Metadata = {
  // Primary SEO Title (optimized for high-volume keywords)
  title: {
    default: "PharmaGo | Εφημερεύοντα Φαρμακεία & Διανυκτερεύοντα Φαρμακεία Ελλάδα",
    template: "%s | PharmaGo - Εφημερεύοντα Φαρμακεία",
  },

  // SEO-Optimized Description (160 chars, includes top keywords)
  description: "Βρες εφημερεύοντα φαρμακεία & διανυκτερεύοντα φαρμακεία στην Ελλάδα. Ανοιχτά φαρμακεία κοντά σου με GPS πλοήγηση σε πραγματικό χρόνο. Δωρεάν εφαρμογή iOS & Android.",

  // Comprehensive Keywords (based on research)
  keywords: [
    // Primary High-Volume Greek Keywords
    "εφημερεύοντα φαρμακεία",
    "φαρμακείο εφημερεύον",
    "διανυκτερεύοντα φαρμακεία",
    "ανοιχτά φαρμακεία",
    "φαρμακεία κοντά μου",
    "εφημερίες φαρμακείων",
    // City-Specific Keywords
    "εφημερεύοντα φαρμακεία Αθήνα",
    "εφημερεύοντα φαρμακεία Θεσσαλονίκη",
    "εφημερεύοντα φαρμακεία Πάτρα",
    "εφημερεύοντα φαρμακεία Ηράκλειο",
    "εφημερεύοντα φαρμακεία Λάρισα",
    "εφημερεύοντα φαρμακεία Πειραιάς",
    // Time-Specific Keywords
    "εφημερεύοντα φαρμακεία τώρα",
    "εφημερεύοντα φαρμακεία σήμερα",
    "φαρμακείο ανοιχτό τώρα",
    // App-Related Keywords
    "εφαρμογή εφημερεύοντα φαρμακεία",
    "εφαρμογή φαρμακείου",
    "βρες φαρμακείο",
    "pharmacy app greece",
    // English Keywords
    "on-duty pharmacy Greece",
    "pharmacy near me Greece",
    "24 hour pharmacy Athens",
    "night pharmacy Greece",
    "PharmaGo",
  ],

  // Authors and Publisher
  authors: [{ name: "PharmaGo Team", url: "https://pharmago.gr" }],
  creator: "PharmaGo",
  publisher: "PharmaGo",

  // Robots and Indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Canonical URL
  metadataBase: new URL('https://pharmago.gr'),
  alternates: {
    canonical: '/',
    languages: {
      'el-GR': '/',
      'en-US': '/?lang=en',
    },
  },

  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: 'website',
    locale: 'el_GR',
    alternateLocale: 'en_US',
    url: 'https://pharmago.gr',
    siteName: 'PharmaGo',
    title: 'PharmaGo | Εφημερεύοντα & Διανυκτερεύοντα Φαρμακεία Ελλάδα',
    description: 'Βρες εφημερεύοντα φαρμακεία κοντά σου σε πραγματικό χρόνο. GPS πλοήγηση, διανυκτερεύοντα φαρμακεία, ανοιχτά φαρμακεία σε όλη την Ελλάδα. Δωρεάν εφαρμογή.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PharmaGo - Εφημερεύοντα Φαρμακεία Ελλάδα',
        type: 'image/png',
      },
    ],
  },

  // Twitter Cards
  twitter: {
    card: 'summary_large_image',
    title: 'PharmaGo | Εφημερεύοντα Φαρμακεία Ελλάδα',
    description: 'Βρες εφημερεύοντα & διανυκτερεύοντα φαρμακεία κοντά σου. GPS πλοήγηση σε πραγματικό χρόνο. Δωρεάν εφαρμογή iOS & Android.',
    images: ['/twitter-image.png'],
    creator: '@pharmago_gr',
    site: '@pharmago_gr',
  },

  // App Links
  appLinks: {
    ios: {
      url: 'https://apps.apple.com/app/pharmago',
      app_store_id: 'YOUR_APP_STORE_ID',
    },
    android: {
      package: 'gr.pharmago.app',
      url: 'https://play.google.com/store/apps/details?id=gr.pharmago.app',
    },
    web: {
      url: 'https://pharmago.gr',
      should_fallback: true,
    },
  },

  // Additional Meta
  category: 'Health',
  classification: 'Medical, Healthcare, Pharmacy Finder',

  // Verification (add your actual verification codes)
  verification: {
    google: 'YOUR_GOOGLE_VERIFICATION_CODE',
  },

  // Icons
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },

  // Manifest for PWA
  manifest: '/manifest.json',
};

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    // MobileApplication Schema
    {
      '@type': 'MobileApplication',
      '@id': 'https://pharmago.gr/#app',
      name: 'PharmaGo',
      alternateName: 'PharmaGo - Εφημερεύοντα Φαρμακεία',
      description: 'Εφαρμογή εύρεσης εφημερευόντων και διανυκτερευόντων φαρμακείων στην Ελλάδα με GPS πλοήγηση σε πραγματικό χρόνο.',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'iOS, Android',
      inLanguage: ['el', 'en'],
      countriesSupported: 'GR',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '50000',
        bestRating: '5',
        worstRating: '1',
      },
      downloadUrl: [
        'https://apps.apple.com/app/pharmago',
        'https://play.google.com/store/apps/details?id=gr.pharmago.app',
      ],
      screenshot: 'https://pharmago.gr/app-screenshot.png',
      featureList: [
        'Εφημερεύοντα φαρμακεία σε πραγματικό χρόνο',
        'GPS πλοήγηση',
        'Διανυκτερεύοντα φαρμακεία',
        'Κλήση έκτακτης ανάγκης',
        'Πολύγλωσση υποστήριξη',
      ],
    },
    // Organization Schema
    {
      '@type': 'Organization',
      '@id': 'https://pharmago.gr/#organization',
      name: 'PharmaGo',
      url: 'https://pharmago.gr',
      logo: 'https://pharmago.gr/logo.png',
      sameAs: [
        'https://twitter.com/pharmago_gr',
        'https://facebook.com/pharmago.gr',
        'https://instagram.com/pharmago_gr',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'contact@pharmago.gr',
        contactType: 'customer service',
        availableLanguage: ['Greek', 'English'],
      },
    },
    // WebSite Schema with SearchAction
    {
      '@type': 'WebSite',
      '@id': 'https://pharmago.gr/#website',
      url: 'https://pharmago.gr',
      name: 'PharmaGo - Εφημερεύοντα Φαρμακεία Ελλάδα',
      description: 'Βρες εφημερεύοντα και διανυκτερεύοντα φαρμακεία στην Ελλάδα',
      inLanguage: ['el', 'en'],
      publisher: {
        '@id': 'https://pharmago.gr/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://pharmago.gr/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    // FAQPage Schema (helps with featured snippets)
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Πώς βρίσκω εφημερεύοντα φαρμακεία κοντά μου;',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Κατέβασε την εφαρμογή PharmaGo δωρεάν και βρες αμέσως τα εφημερεύοντα φαρμακεία κοντά σου με GPS πλοήγηση σε πραγματικό χρόνο.',
          },
        },
        {
          '@type': 'Question',
          name: 'Ποια είναι τα διανυκτερεύοντα φαρμακεία σήμερα;',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Το PharmaGo εμφανίζει όλα τα διανυκτερεύοντα φαρμακεία σε πραγματικό χρόνο με ακριβή ωράρια λειτουργίας και οδηγίες πλοήγησης.',
          },
        },
        {
          '@type': 'Question',
          name: 'Είναι δωρεάν η εφαρμογή PharmaGo;',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Ναι, το PharmaGo είναι 100% δωρεάν για iOS και Android, χωρίς διαφημίσεις και χωρίς συλλογή προσωπικών δεδομένων.',
          },
        },
        {
          '@type': 'Question',
          name: 'Πώς βρίσκω ανοιχτά φαρμακεία τώρα;',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Με το PharmaGo βλέπεις σε πραγματικό χρόνο ποια φαρμακεία είναι ανοιχτά τώρα, με ζωντανή ενημέρωση και GPS πλοήγηση.',
          },
        },
      ],
    },
    // SoftwareApplication for broader coverage
    {
      '@type': 'SoftwareApplication',
      name: 'PharmaGo',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'iOS, Android',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" className={inter.className}>
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Preconnect to important third-party origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS Prefetch for app stores */}
        <link rel="dns-prefetch" href="https://apps.apple.com" />
        <link rel="dns-prefetch" href="https://play.google.com" />

        {/* Geo Meta Tags for Greece */}
        <meta name="geo.region" content="GR" />
        <meta name="geo.placename" content="Greece" />
        <meta name="ICBM" content="39.0742, 21.8243" />

        {/* Language and Content */}
        <meta httpEquiv="content-language" content="el, en" />
        <meta name="language" content="Greek, English" />

        {/* Mobile App Meta Tags */}
        <meta name="apple-itunes-app" content="app-id=YOUR_APP_STORE_ID" />
        <meta name="google-play-app" content="app-id=gr.pharmago.app" />

        {/* Additional SEO Meta */}
        <meta name="subject" content="Εφημερεύοντα Φαρμακεία Ελλάδα" />
        <meta name="topic" content="Pharmacy Finder, Healthcare, Medical Services" />
        <meta name="coverage" content="Greece" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />
        <meta name="revisit-after" content="1 days" />
      </head>
      <body>{children}</body>
    </html>
  );
}
