import type { Metadata } from 'next'
import { DocsContent } from './docs-content'

export const metadata: Metadata = {
  title: 'API Docs — Reattend',
  description: 'REST API reference for Reattend. Capture, search, and query your memory programmatically.',
  openGraph: {
    title: 'Reattend API Docs',
    description: 'REST API reference for Reattend. Capture, search, and query your memory programmatically.',
  },
}

export default function DocsPage() {
  return <DocsContent />
}
