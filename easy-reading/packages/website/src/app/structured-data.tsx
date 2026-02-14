// Structured Data Components for SEO

export function WebsiteStructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "English Reader",
          "url": "https://read.english-reader.com",
          "description": "Make English reading natural and effortless with instant translation, text-to-speech, and vocabulary saving features.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://read.english-reader.com/search?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })
      }}
    />
  );
}

export function OrganizationStructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "English Reader",
          "url": "https://read.english-reader.com",
          "logo": "https://read.english-reader.com/logo.png",
          "sameAs": [
            "https://twitter.com/englishreader",
            "https://facebook.com/englishreader"
          ]
        })
      }}
    />
  );
}

export function SoftwareApplicationStructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "English Reader",
          "description": "Interactive platform that helps English learners read naturally with instant translation, text-to-speech, and vocabulary saving features.",
          "applicationCategory": "EducationalApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.7",
            "ratingCount": "1250"
          }
        })
      }}
    />
  );
}

export function FAQStructuredData(questions: Array<{question: string, answer: string}>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": questions.map(q => ({
            "@type": "Question",
            "name": q.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": q.answer
            }
          }))
        })
      }}
    />
  );
}
