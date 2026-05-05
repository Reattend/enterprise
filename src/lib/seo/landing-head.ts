import { JSON_LD_GRAPH } from './json-ld'

// The static HTML pages under /public/landing-design/ are served directly
// by route.ts handlers that bypass the React <RootLayout>. That means the
// JSON-LD, og:tags, twitter:card, GA snippet, and canonical link in
// app/layout.tsx never reach those pages — including the homepage.
// Crawlers see a stripped-down <head> and we lose every signal that drives
// rich results / sitelinks eligibility.
//
// injectSeoIntoHead() rewrites the static HTML response server-side,
// inserting the same SEO block before </head> on every static page. The
// per-page <title> and <meta name="description"> already living in the
// static HTML stay intact — we only add what was missing.

const SITE_URL = 'https://reattend.com'
const DEFAULT_OG_IMAGE = `${SITE_URL}/black_logo.svg`
const GA_ID = 'G-0J0Y3SL5CY'

interface InjectOpts {
  /** Path beginning with `/`. Becomes the canonical URL + og:url. */
  canonicalPath: string
  /** Override og:title. Defaults to the page's existing <title>. */
  ogTitle?: string
  /** Override og:description. Defaults to the page's <meta name="description">. */
  ogDescription?: string
  /** Defaults to the Reattend logo. Use a route-specific OG image when one exists. */
  ogImage?: string
}

export function injectSeoIntoHead(html: string, opts: InjectOpts): string {
  // If we've already injected (e.g. dev hot-reload re-running the handler
  // on a cached HTML string), don't double-add.
  if (html.includes('data-reattend-seo="1"')) return html

  const title = opts.ogTitle ?? extractTag(html, /<title>([^<]*)<\/title>/i) ?? 'Reattend'
  const description =
    opts.ogDescription ??
    extractTag(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ??
    ''
  const canonical = `${SITE_URL}${opts.canonicalPath}`
  const image = opts.ogImage ?? DEFAULT_OG_IMAGE

  // JSON.stringify is safe inside <script type="application/ld+json"> as long
  // as we close the script tag with `<\/script>` in any string content. The
  // shared graph is static + author-controlled, so we don't need to escape
  // here, but we still defensively replace `</` to avoid any future surprise.
  const ldJson = JSON.stringify(JSON_LD_GRAPH).replace(/<\//g, '<\\/')

  const block = `
<!-- SEO injected by src/lib/seo/landing-head.ts -->
<link data-reattend-seo="1" rel="canonical" href="${escapeAttr(canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Reattend" />
<meta property="og:url" content="${escapeAttr(canonical)}" />
<meta property="og:title" content="${escapeAttr(title)}" />
<meta property="og:description" content="${escapeAttr(description)}" />
<meta property="og:image" content="${escapeAttr(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeAttr(title)}" />
<meta name="twitter:description" content="${escapeAttr(description)}" />
<meta name="twitter:image" content="${escapeAttr(image)}" />
<script type="application/ld+json">${ldJson}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
`.trim()

  // Insert immediately before </head>. Falls back to prepending in <html>
  // if no </head> is found, which would only happen on a malformed page.
  if (html.includes('</head>')) {
    return html.replace('</head>', `${block}\n</head>`)
  }
  return html.replace('<html', `${block}\n<html`)
}

// Convenience: load a static HTML file from /public/landing-design, inject
// SEO, cache the rewritten string, return a Response. Every route.ts that
// serves a landing page collapses to a 3-line `export async function GET`.
const responseCache = new Map<string, string>()

export async function serveLandingPage(opts: {
  filename: string  // e.g. 'landing.html', 'compliance.html'
  canonicalPath: string  // e.g. '/', '/compliance'
  ogImage?: string
  /** Override Cache-Control. Defaults to a 5-min public cache. Pass
   *  'no-store, must-revalidate' for pages that ship interactive logic
   *  we update often (e.g. /login). */
  cacheControl?: string
}): Promise<Response> {
  const cacheKey = `${opts.filename}::${opts.canonicalPath}`
  let html = responseCache.get(cacheKey) ?? null
  if (!html) {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const filePath = path.join(process.cwd(), 'public', 'landing-design', opts.filename)
    const raw = await fs.readFile(filePath, 'utf-8')
    html = injectSeoIntoHead(raw, {
      canonicalPath: opts.canonicalPath,
      ogImage: opts.ogImage,
    })
    responseCache.set(cacheKey, html)
  }
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': opts.cacheControl ?? 'public, max-age=300, s-maxage=300',
    },
  })
}

function extractTag(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern)
  return m ? m[1].trim() : null
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
