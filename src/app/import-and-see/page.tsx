import { Metadata } from 'next'
import { Suspense } from 'react'
import { Importer } from './importer'

export const metadata: Metadata = {
  title: 'Import and See | Watch AI Analyze Your Notes | Reattend',
  description:
    'Paste any note, meeting summary, or decision and watch our AI extract entities, classify the type, identify dates, and suggest connections, all in real time. No signup required.',
  openGraph: {
    title: 'Import and See | Watch AI Analyze Your Notes',
    description:
      'Paste a note and watch AI extract entities, classify the type, and find patterns in seconds. No signup required.',
    url: 'https://reattend.com/import-and-see',
    siteName: 'Reattend',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Import and See | Watch AI Analyze Your Notes',
    description:
      'Paste a note and watch AI analyze it in real time. No signup needed.',
  },
  alternates: { canonical: 'https://reattend.com/import-and-see' },
}

const faqItems = [
  {
    q: 'What kind of notes can I analyze?',
    a: 'Any text works: meeting notes, decisions, brainstorm sessions, project updates, daily standups, or even random thoughts. The AI adapts to whatever you paste.',
  },
  {
    q: 'Is my data stored or shared?',
    a: 'No. Your note is sent to our AI for analysis and the result is returned to your browser. We do not save, log, or share your text.',
  },
  {
    q: 'How many notes can I analyze for free?',
    a: 'You can analyze up to 5 notes per hour, completely free. Sign up for unlimited analyses with your full memory graph.',
  },
  {
    q: 'What does the AI actually extract?',
    a: 'The AI identifies the type of note (decision, meeting, insight, etc.), extracts people, organizations, and topics, finds dates and deadlines, suggests project groupings, and explains why the note is worth remembering.',
  },
  {
    q: 'How is this different from the interactive demo?',
    a: 'The interactive demo at /demo uses sample data to walk you through Reattend\'s features. Import and See uses real AI to analyze YOUR actual notes. You see exactly what Reattend would do with your content.',
  },
]

export default function Page() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Suspense>
        <Importer faqItems={faqItems} />
      </Suspense>
    </>
  )
}
