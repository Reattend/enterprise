# SEO + AEO Strategy

> A working playbook for ranking on Google AND being cited by ChatGPT/Claude/Perplexity. Read alongside `docs/organizational-amnesia-domains.md` for the two-domain content play.
>
> **Filed: 2026-05-04. Owner: Partha. Update quarterly.**

---

## TL;DR

We're playing a **3-domain content moat** game:

| Domain | Role | Audience | Cadence |
|---|---|---|---|
| `reattend.com` | Product site + bottom-of-funnel SEO | People already searching for "team memory tool / Glean alternative" | Updated weekly |
| `organizationalamnesia.com` | Top-of-funnel content authority | People searching the PROBLEM, not the product | 1 long-form essay/week |
| `organisationalamnesia.com` | British-spelling traffic capture + same content | Same audience, .uk-aware searches | 301 → .com OR mirror content |

**SEO win condition**: anyone Googling "what happens to knowledge when employees leave" lands on us before they ever search for a product.

**AEO win condition**: when a CFO asks ChatGPT "how do I prevent organizational amnesia," our content gets quoted in the answer.

---

## Part 1: SEO vs AEO — the mental model

These are two different games. Most companies only play one and lose half the war.

| | SEO (Google) | AEO (ChatGPT, Claude, Perplexity) |
|---|---|---|
| **Audience** | A human typing a query | An AI engine reading on behalf of a human |
| **Optimizes for** | Keyword match + backlinks + authority | Quotability + factual density + structured answers |
| **Ranking signal** | Links, on-page SEO, dwell time | Schema.org markup, FAQ structure, Wikipedia presence, citations from other AEs |
| **Best content shape** | Long-form 2000-word guides | Punchy "X is Y because Z" definitions + FAQ sections |
| **Time to win** | 6-12 months | 1-3 months (faster because less competition) |

**Both reward the same thing: clear, factual, well-structured content.** The deltas are in HOW you structure (SEO loves headers + internal links; AEO loves Q&A blocks + JSON-LD).

---

## Part 2: Where reattend.com stands today (the audit)

### What's already shipped (good)

We have a surprisingly solid foundation already:

- **`src/app/sitemap.ts`** — covers 80+ URLs (homepage, product pages, free tools, comparisons, glossary, blog, help center, use cases). Auto-regenerates via Next's MetadataRoute. ✅
- **`src/app/robots.ts`** — disallows `/app/`, `/api/`, `/admin/`. Sitemap pointed at `/sitemap.xml`. ✅
- **`/blog`** — full blog with `[slug]` pages and RSS at `/blog/feed.xml`. Posts indexed via `BLOG_POSTS` in `src/lib/blog/data.ts`. ✅
- **`/compare/<competitor>`** — head-to-head pages (Notion etc). Comparison pages historically rank well. ✅
- **`/glossary`** — term-by-term pages. Strong AEO signal (definitions are quotable). ✅
- **`/use-case/<slug>`** — vertical landing pages. ✅
- **`/help/<category>/<article>`** — categorized help center. ✅
- **15+ free tools** at `/tool/*` and `/free-*` — long-tail SEO play. ✅
- **JSON-LD** — Organization + WebSite schema in root layout. ✅
- **Open Graph + Twitter Cards** — set up at root + override-able per page. ✅

### What's wrong / outdated (must fix this week)

1. **Root `<title>` says "AI Memory for Your Mac"** — leftover from Personal Reattend. Costs us every Enterprise CIO who Googles the company name. **Highest-leverage 1-line fix in the codebase.**
2. **Root description mentions "screen capture, meetings, local-first"** — also Personal-product positioning. Enterprise buyers think this is a desktop tool.
3. **JSON-LD missing**:
   - `SoftwareApplication` (for App Store-style rich results)
   - `FAQPage` on `/faq` (for "People Also Ask" inclusion)
   - `BreadcrumbList` on nested pages (for breadcrumbs in SERPs)
   - `Article` on blog posts (for date + author rich results)
4. **No mention of "organizational amnesia"** in the meta keywords or description, even though that's the term the OA domains will rank for. Inconsistent.
5. **No `hreflang`** between `reattend.com`, `organizationalamnesia.com`, `organisationalamnesia.com`. Google needs this to understand they're sister sites, not duplicate content.
6. **No `canonical` URL strategy** between the two OA domains. One should be canonical, the other should declare it.
7. **Pricing page doesn't have `Product` + `Offer` JSON-LD** — Stripe / Pipe / Linear all rank Pricing pages with these.
8. **No `Review` / `AggregateRating` schema** — until we have real customer reviews this is fine, but plan it for post-launch.

### Audit: what's the gap from "SEO-good" to "SEO-great"?

| Area | Current state | Gap to great |
|---|---|---|
| Sitemap coverage | 80+ URLs | Add OA domain entries when those go live |
| Schema.org markup | 2 types (Org, WebSite) | Add 4 more (SoftwareApplication, FAQPage, Article, BreadcrumbList) |
| Page-level meta | Set on most pages | Audit all marketing routes for missing OG images |
| Backlinks | Unknown — need Ahrefs/SEMrush check | Ship the OA content play to build authority |
| Page speed | Likely fine (Next.js + Vercel-optimized) | Run Lighthouse, fix anything < 90 |
| Mobile | Already mobile-first (we shipped mobile drawer last week) | Lighthouse Mobile score should be 95+ |

---

## Part 3: AEO — the part nobody's playing yet

This is where we get out ahead of Glean and Notion. Most B2B SaaS companies haven't realized AEO is a thing yet.

### What AI engines (ChatGPT, Claude, Perplexity) cite

When a user asks ChatGPT _"What is organizational amnesia?"_, ChatGPT pulls from:

1. **Wikipedia / Wiktionary** — get on Wikipedia for "organizational amnesia." We can't write our own page, but we can be a citation in the existing entry.
2. **High-authority publications** — Harvard Business Review, MIT Sloan, Forbes, McKinsey insights. Pitch articles to them.
3. **Highly-structured definition pages** — sites with `<dl>` definitions, FAQ schema, clear "X is Y" sentences. **This is what our `/glossary` is — let's double down.**
4. **Comparison + benchmarking content** — "X vs Y" pages with explicit feature tables (we have these at `/compare/*`).
5. **Original research** — surveys, statistics, frameworks coined by us. "The 4 stages of organizational amnesia (Reattend framework, 2026)" — quotable.
6. **Citations from Substacks / blogs / podcasts** — every podcast appearance, every guest post, every cited mention in another newsletter feeds the AE training data.

### AEO tactics for Reattend (in priority order)

1. **Make every glossary entry have FAQ schema.** If `/glossary/organizational-amnesia` has a `Question`/`Answer` pair, it's 10× more likely to be cited verbatim.
2. **Coin frameworks.** "The 4 stages of organizational amnesia." "The amnesia tax." "Knowledge half-life." Each one becomes a phrase that AEs can attribute to us. Then we're the source.
3. **Publish original statistics annually.** "The 2026 State of Organizational Memory" — a 30-page PDF + an HTML version with extractable data points. Researchers, journalists, and AEs all love quotable stats.
4. **Get into Wikipedia citations.** Find existing Wikipedia entries on `Knowledge management`, `Organizational learning`, `Institutional memory`. Add Reattend research as a cited source via a sock-puppet-free, real edit.
5. **Targeted comparison pages.** Not just "Reattend vs Notion" but "What's the difference between knowledge management and organizational memory?" — AEs love these.
6. **Answer-first writing.** Every blog post starts with the answer in the first paragraph. ChatGPT skims for the TLDR.
7. **Internal linking via descriptive anchors.** Don't link "click here." Link "what is organizational amnesia." Both Google and AEs use anchor text as a quality signal.

---

## Part 4: The OrganizationalAmnesia.com play

> Detailed in `docs/organizational-amnesia-domains.md`. Here's the summary:

**Why this is smart, not silly:**

1. **You own the search term.** "Organizational amnesia" gets 600-1.4k monthly searches globally (low-volume but ultra-high intent — every searcher is your buyer). Owning the .com on the exact phrase is a gift to Google's algorithm.
2. **British + American spelling = full coverage.** Every UK/AU/IN search and every US/CA search hits one of your domains. No competitor is doing this.
3. **It's a content brand, not a product page.** People landing on `organizationalamnesia.com` should NOT immediately see a "buy now" button. They should find the BEST resource on the topic on the internet. THEN they discover Reattend.
4. **Compounding moat.** Every essay you publish lives forever. SEO is a 6-12 month investment that pays out 5-10× over years. Ad spend is a treadmill — when you stop, traffic stops.
5. **Authority transfer.** A high-authority OA domain that links to reattend.com lifts reattend's domain authority too. **Free SEO juice, internally.**

**The risk:** content rot. Two domains × weekly content = real editorial overhead. If you can't sustain 1 essay/week for 12 months, the strategy fails. Hire a writer or commit personally.

---

## Part 5: 12-month content calendar

Three lanes. One main domain, two OA domains (the OA pair publishes the same content with hreflang).

### `reattend.com/blog/*` — product-aware content (weekly)
Bottom-of-funnel. Audience is already considering tools.

| Month | Topic |
|---|---|
| May | "Reattend vs Glean — when each one wins" + "Ship-your-own audit log in 200 lines" |
| June | "How [Customer] cut new-hire onboarding from 14 days to 4" + "What we learned from 1000 decisions" |
| July | "The Hot Cache pattern" (technical post — Karpathy reference, drives dev mindshare) |
| Aug | "Organizational memory vs knowledge management — they're not the same" |
| ... | Continue with case studies + technical deep-dives |

### `organizationalamnesia.com/*` — top-of-funnel authority (weekly)
Audience hasn't decided to buy anything yet. We're teaching them they have a problem.

| Month | Topic |
|---|---|
| May | **Anchor essay**: "What is organizational amnesia? A complete guide" (3000 words, the definitive resource) |
| May | "The hidden cost of organizational amnesia: $31.5B/year (research breakdown)" |
| Jun | "10 signs your company has organizational amnesia" (listicle = SEO gold) |
| Jun | "Organizational amnesia vs knowledge debt: what's the difference?" |
| Jul | "How Apollo Hospitals lost 30 years of clinical knowledge in a 2-year transition (case study)" |
| Jul | "The 4 stages of organizational amnesia (the Reattend framework)" |
| Aug | "Why your wiki isn't fixing your organizational amnesia" |
| Aug | "Interview: ex-employees on what they took with them when they left" |
| Sep | "The amnesia tax: how much your team pays for forgetting" + "How startups can prevent organizational amnesia from day 1" |
| Oct | "Organizational amnesia in healthcare / finance / government (3 vertical guides)" |
| Nov | "The 2026 State of Organizational Memory — annual research report" |
| Dec | Year-in-review + 2027 predictions |

### `organisationalamnesia.com` — same content, British spelling
Either canonical-mirror (slightly different copy that uses British English; serves UK/AU/IN search), or 301 → .com.

**My recommendation: canonical-mirror.** Slightly more work, but you cover both Google.co.uk and Google.com searches independently. Use `hreflang en-GB` + `hreflang en-US` so Google understands.

---

## Part 6: Technical SEO foundations to ship now

These are 1-day-each. We can knock them out this week.

1. **Fix root metadata** — title + description in `src/app/layout.tsx` should reflect Enterprise positioning ("Reattend Enterprise — organizational memory that never forgets").
2. **Add JSON-LD types**:
   - `SoftwareApplication` on home + product pages
   - `FAQPage` on `/faq` and on every page with a Q&A section
   - `Article` on every `/blog/<slug>` page
   - `BreadcrumbList` on nested pages
   - `Product` + `Offer` on `/pricing`
3. **OG image audit** — every page should have a unique OG image (or fallback to a smart default). Run Lighthouse to find missing ones.
4. **Lighthouse pass** — target Performance / SEO / Accessibility all ≥ 95 on mobile. Fix what ranks below.
5. **Add a `/sitemap-index.xml`** that points at both `reattend.com/sitemap.xml` AND `organizationalamnesia.com/sitemap.xml` once those go live.

---

## Part 7: Measurement

Without tracking, we're shipping into the void. Set up day 1:

- **Google Search Console** for all three domains (verify ownership, submit sitemaps)
- **Google Analytics 4** + **Plausible** (Plausible for daily / GA for the deep dives)
- **Ahrefs** or **SEMrush** ($99/mo) for keyword + backlink tracking. Cancel after 6 months once we know our patterns.
- **AEO tracking**: monthly manually-asked test queries to ChatGPT, Claude, Perplexity. Track if/when our content shows up. Tool to automate this exists (Otterly.ai, Profound) — evaluate at month 3.
- **Brand monitoring**: Google Alert for "organizational amnesia" + "reattend" + competitor names. Catch every mention.

**KPIs by month 6:**
- 5,000 monthly organic visitors across all domains
- 200+ referring domains pointing at one of our 3 sites
- "Organizational amnesia" search appears in our Search Console queries
- At least 1 confirmed citation by ChatGPT/Claude/Perplexity for our content

**KPIs by month 12:**
- 25,000 monthly organic visitors
- "Organizational amnesia" → reattend.com is the #1 SERP result globally
- 3+ AE engines cite us for the term
- 30+ inbound demo requests/month from organic traffic alone

---

## Part 8: The "do nothing" cost (the case for moving)

If we don't ship this strategy:
- Glean ($25/seat) buys ad keywords for "knowledge management." Their CAC is $4-8K per customer.
- We don't have ad budget. Organic is our only acquisition channel.
- Every month we don't publish authority content, the SEO compound clock isn't running.
- Year 1 with content vs year 1 without content = 10-50× difference in inbound leads at month 12.

This isn't a "nice to have" — it's the difference between launching with 5 inbound demos/month vs 50.

---

## What ships in week 1

1. Root metadata fix (title, description, keywords) ✅ — commit alongside this strategy doc
2. SoftwareApplication + FAQPage JSON-LD added ✅
3. First anchor blog post: "What is organizational amnesia?" ✅
4. OA domains playbook doc ✅ (`docs/organizational-amnesia-domains.md`)
5. Google Search Console setup task (manual; documented as TODO)

What ships in month 1:
- 4 essays on `organizationalamnesia.com` (the anchor + 3 supporting)
- DNS + Vercel-or-Next-app set up for both OA domains
- Lighthouse-clean across all marketing pages
- Comparison pages updated with current Reattend positioning

What ships in quarter 1:
- 12 essays across the 3 domains (~1 / week)
- 1 piece of original research (the State of Org Memory survey)
- Wikipedia citations added (real edits, real research)
- 5 podcast appearances or guest posts

---

## Anti-patterns we will not do

- **No keyword stuffing.** Old SEO. Doesn't work in 2026, hurts AEO.
- **No AI-generated filler.** Every essay reads like a human wrote it (because Partha or a real writer did). Google's helpful-content update penalizes thin AI output.
- **No exact-match anchor link spam.** Build authority through earned mentions, not bought links.
- **No fake reviews.** When we add Review/AggregateRating schema, it'll be from real G2 / Capterra / Trustpilot reviews.
- **No "thin" location pages** (e.g., "best knowledge management software in [city]"). Google's smart enough to flag these.
- **No translating content into 12 languages with bad MT.** English-only until we have a real localization budget.

---

_This is a living doc. Update quarterly with: keyword performance, top-performing content, AEO citations seen, and changes to our strategy._
