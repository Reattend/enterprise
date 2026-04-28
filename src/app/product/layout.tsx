import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Product · Reattend Enterprise',
  description: 'Everything Reattend does, in one page. Capture, Connect, Recall, Run, Govern, Deploy. Plus the Chrome extension, Memory Cockpit, Time Machine, and on-premise option.',
  alternates: {
    canonical: 'https://enterprise.reattend.com/product',
  },
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children
}
