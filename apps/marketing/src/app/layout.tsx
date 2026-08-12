import "./globals.css";
import type { ReactNode } from "react";
import { SITE_ORIGIN } from "../lib/site";

export const metadata = {
  "metadataBase": new URL(SITE_ORIGIN || "http://localhost:3000"),
  "title": "Webtify | Start sterk, blijf voorop",
  "description": "Ontdek de alles-in-één website abonnementen van Webtify. Maatwerk websites, inclusief support en updates. Ontdek Webtify!",
  "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  "alternates": {
    "canonical": "/"
  },
  "openGraph": {
    "title": "Webtify | Start sterk, blijf voorop",
    "description": "Ontdek de alles-in-één website abonnementen van Webtify. Maatwerk websites, inclusief support en updates. Ontdek Webtify!",
    "type": "website",
    "siteName": "Webtify",
    "url": "/",
    "images": [
      "https://webtify.nl/wp-content/uploads/2024/11/vierkant-logo-800.jpg"
    ]
  },
  "twitter": {
    "card": "summary_large_image"
  },
  "icons": {
    "icon": [
      {
        "url": "/assets/cloned/images/f5b870afd41f.jpg",
        "sizes": "32x32"
      },
      {
        "url": "/assets/cloned/images/aa41dab921f0.jpg",
        "sizes": "192x192"
      }
    ],
    "apple": [
      {
        "url": "/assets/cloned/images/58734efdc670.jpg"
      }
    ]
  }
};
export const viewport = {
  "width": "device-width",
  "initialScale": 1
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={"nl-NL"}>
      <head>
        <script
          key="ditto-json-ld-0"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ["{\"@context\":\"https:\\/\\/schema.org\",\"@graph\":[{\"@type\":\"WebPage\",\"@id\":\"", "\\/\",\"url\":\"", "\\/\",\"name\":\"Webtify | Start sterk, blijf voorop\",\"isPartOf\":{\"@id\":\"", "\\/#website\"},\"about\":{\"@id\":\"", "\\/#organization\"},\"primaryImageOfPage\":{\"@id\":\"", "\\/#primaryimage\"},\"image\":{\"@id\":\"", "\\/#primaryimage\"},\"thumbnailUrl\":\"", "\\/wp-content\\/uploads\\/2024\\/11\\/vierkant-logo-800.jpg\",\"datePublished\":\"2022-10-19T11:56:57+00:00\",\"dateModified\":\"2026-08-10T13:01:29+00:00\",\"description\":\"Ontdek de alles-in-één website abonnementen van Webtify. Maatwerk websites, inclusief support en updates. Ontdek Webtify!\",\"breadcrumb\":{\"@id\":\"", "\\/#breadcrumb\"},\"inLanguage\":\"nl-NL\",\"potentialAction\":[{\"@type\":\"ReadAction\",\"target\":[\"", "\\/\"]}]},{\"@type\":\"ImageObject\",\"inLanguage\":\"nl-NL\",\"@id\":\"", "\\/#primaryimage\",\"url\":\"", "\\/wp-content\\/uploads\\/2024\\/11\\/vierkant-logo-800.jpg\",\"contentUrl\":\"", "\\/wp-content\\/uploads\\/2024\\/11\\/vierkant-logo-800.jpg\",\"width\":800,\"height\":800,\"caption\":\"Webtify logo\"},{\"@type\":\"BreadcrumbList\",\"@id\":\"", "\\/#breadcrumb\",\"itemListElement\":[{\"@type\":\"ListItem\",\"position\":1,\"name\":\"Home\"}]},{\"@type\":\"WebSite\",\"@id\":\"", "\\/#website\",\"url\":\"", "\\/\",\"name\":\"Webtify\",\"description\":\"Start sterk, blijf voorop\",\"publisher\":{\"@id\":\"", "\\/#organization\"},\"potentialAction\":[{\"@type\":\"SearchAction\",\"target\":{\"@type\":\"EntryPoint\",\"urlTemplate\":\"", "\\/?s={search_term_string}\"},\"query-input\":{\"@type\":\"PropertyValueSpecification\",\"valueRequired\":true,\"valueName\":\"search_term_string\"}}],\"inLanguage\":\"nl-NL\"},{\"@type\":\"Organization\",\"@id\":\"", "\\/#organization\",\"name\":\"Webtify\",\"url\":\"", "\\/\",\"logo\":{\"@type\":\"ImageObject\",\"inLanguage\":\"nl-NL\",\"@id\":\"", "\\/#\\/schema\\/logo\\/image\\/\",\"url\":\"", "\\/wp-content\\/uploads\\/2024\\/11\\/vierkant-logo-800.jpg\",\"contentUrl\":\"", "\\/wp-content\\/uploads\\/2024\\/11\\/vierkant-logo-800.jpg\",\"width\":800,\"height\":800,\"caption\":\"Webtify\"},\"image\":{\"@id\":\"", "\\/#\\/schema\\/logo\\/image\\/\"},\"sameAs\":[\"http:\\/\\/facebook.com\\/webtifyhq\",\"https:\\/\\/nl.linkedin.com\\/company\\/webtifynl\",\"https:\\/\\/www.instagram.com\\/webtify\\/\",\"https:\\/\\/www.tiktok.com\\/@webtify\"]}]}"].join(SITE_ORIGIN) }}
        />
      </head>
      <body className="cn0" data-cid="n0">
        {children}
      </body>
    </html>
  );
}
