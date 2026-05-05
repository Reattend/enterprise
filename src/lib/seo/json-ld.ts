// Shared structured-data graph for the marketing surface.
//
// Both layout.tsx (React-rendered routes) and lib/seo/landing-head.ts
// (static HTML routes injected server-side) emit this exact graph, so
// crawlers see consistent metadata regardless of which Next handler
// served the page.
//
// Honesty rules — same as the marketing copy. This block lands in
// Google's index verbatim; if it claims something we don't ship, we
// teach the crawler the wrong story. Anything load-bearing here
// should match what /compliance, /pricing, /product actually say.

export const JSON_LD_GRAPH = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://reattend.com/#organization',
      name: 'Reattend',
      url: 'https://reattend.com',
      logo: 'https://reattend.com/black_logo.svg',
      sameAs: [
        // Sister content domains — same brand, separate authority play.
        // See docs/organizational-amnesia-domains.md.
        'https://organizationalamnesia.com',
        'https://organisationalamnesia.com',
      ],
      description:
        'Reattend is the organizational memory layer for fast-moving teams. Decisions, context, and the why behind them — captured, linked, and recalled even when people leave, transfer, or change roles.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://reattend.com/#website',
      url: 'https://reattend.com',
      name: 'Reattend',
      publisher: { '@id': 'https://reattend.com/#organization' },
      description:
        'Organizational memory that never forgets — the memory layer your wiki can\'t give you.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://reattend.com/app/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    { '@type': 'SiteNavigationElement', name: 'Product', url: 'https://reattend.com/product' },
    { '@type': 'SiteNavigationElement', name: 'Pricing', url: 'https://reattend.com/pricing' },
    { '@type': 'SiteNavigationElement', name: 'Integrations', url: 'https://reattend.com/integrations' },
    { '@type': 'SiteNavigationElement', name: 'Compliance', url: 'https://reattend.com/compliance' },
    { '@type': 'SiteNavigationElement', name: 'Sandbox', url: 'https://reattend.com/sandbox' },
    { '@type': 'SiteNavigationElement', name: 'About', url: 'https://reattend.com/about' },
    { '@type': 'SiteNavigationElement', name: 'Free Tools', url: 'https://reattend.com/tool' },
    { '@type': 'SiteNavigationElement', name: 'Free Team Games', url: 'https://reattend.com/game' },
    { '@type': 'SiteNavigationElement', name: 'Glossary', url: 'https://reattend.com/glossary' },
    { '@type': 'SiteNavigationElement', name: 'Blog', url: 'https://reattend.com/blog' },
    { '@type': 'SiteNavigationElement', name: 'Sign in', url: 'https://reattend.com/login' },
    {
      '@type': 'SoftwareApplication',
      name: 'Reattend',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://reattend.com',
      description:
        'Organizational memory platform for fast-moving teams. Captures decisions with rationale, runs structured exit interviews, transfers knowledge to roles instead of people, and surfaces what is going stale in your knowledge base.',
      offers: [
        {
          '@type': 'Offer',
          name: 'Free',
          price: '0',
          priceCurrency: 'USD',
          description: 'Try Reattend with the public sandbox — no card, no signup.',
        },
        {
          '@type': 'Offer',
          name: 'Team',
          price: '19',
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '19',
            priceCurrency: 'USD',
            unitText: 'user/month',
            referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
          },
          description:
            'Unlimited AI questions, full memory retention, all connectors, decision log, exit interviews, time machine. $19 per user per month.',
        },
        {
          '@type': 'Offer',
          name: 'Enterprise',
          price: '29',
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '29',
            priceCurrency: 'USD',
            unitText: 'user/month',
            referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
          },
          description:
            'Team plan + SSO (SAML/OIDC), hash-chained WORM audit log, two-tier RBAC with per-user overrides, EU data residency. $29 per user per month, 5-seat minimum.',
        },
      ],
      featureList: [
        'Organizational memory: knowledge stays when employees leave',
        'Decision log with rationale, reversal tracking, and Blast Radius dependency view',
        'Structured exit interviews that capture institutional knowledge',
        'Knowledge transfer to roles, not individuals',
        'Time Machine: point-in-time queries — see what the org knew on any date',
        'Weekly Audit: tells you what is rotting in your knowledge base',
        'Self-healing contradiction detection',
        'Hash-chained WORM audit log',
        'Two-tier RBAC with per-user permission overrides',
        'EU or US data residency',
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is organizational amnesia?',
          acceptedAnswer: {
            '@type': 'Answer',
            // First sentence is the AEO-quotable definition. Keep it tight.
            text: 'Organizational amnesia is the loss of institutional knowledge that occurs when employees leave, transfer, or retire — taking their context, decisions, relationships, and unwritten know-how with them. It is one of the leading causes of repeated mistakes, slow new-hire ramp-up, and re-debated decisions inside fast-moving teams.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is Reattend different from Glean or Notion?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Glean is enterprise search — it tells you which documents mention a topic. Notion is a wiki — it stores what you write. Reattend is organizational memory — it captures decisions, the rationale behind them, who decided, when, and whether they were reversed. When someone leaves, their knowledge stays as institutional memory rather than walking out the door.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does Reattend cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reattend has three tiers. Team is $19 per user per month with unlimited AI questions, full retention, and all connectors. Enterprise is $29 per user per month with SSO/SAML, hash-chained audit log, two-tier RBAC, and EU data residency — minimum 5 seats. Government / on-premise is custom-quoted. Anyone can try the live product without an account at reattend.com/sandbox.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does Reattend prevent organizational amnesia?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reattend captures decisions with their full rationale, runs structured exit interviews when employees offboard, transfers knowledge to organizational roles rather than individuals, and uses a time-machine view to let you see exactly what the organization knew at any point in the past. The Weekly Audit feature scores your knowledge health and tells you exactly what is going stale.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is Reattend\'s compliance posture?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reattend ships with a hash-chained WORM audit log, record-level RBAC enforced before retrieval, GDPR self-export and erasure built in, and EU or US data residency. SOC 2 is on the roadmap and will be pursued alongside the first regulated customer engagement that requires it. The Compliance page on reattend.com lists every control with its current status — shipped, in progress, or roadmap.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can Reattend run on-premise or air-gapped?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'On the roadmap. The cloud product runs in EU or US tenancy today; on-premise and air-gapped deployment ship alongside the first government engagement that requires it. Contact us if that is your deployment model.',
          },
        },
      ],
    },
  ],
} as const
