# OrganizationalAmnesia.com + OrganisationalAmnesia.com — Playbook

> The two domains Partha acquired in May 2026. Read alongside `docs/seo-strategy.md` for the full SEO/AEO context.
>
> **Status: domains owned, not yet built.** This doc is the build plan + content strategy.

---

## Why this is genuinely smart (validating the bet)

When the user asked "not sure how smart this idea is" — here's the answer.

### 1. You own the EXACT problem term, not a product term

Most SaaS companies own a product name. You'd own a **problem name**. That changes the buyer journey:

| Buyer journey stage | Where they search | Who they find today |
|---|---|---|
| 1. _"My team keeps forgetting things"_ | Google "team forgets things" | Random listicles, no specific tool wins |
| 2. _"This must have a name"_ | Google "company keeps losing knowledge" | A few HBR articles, Glean ads |
| 3. _"organizational amnesia"_ | Google → **YOUR DOMAIN** | (today) Wikipedia stub + scattered articles |
| 4. _"how to fix it"_ | Read your essays, naturally discover Reattend | (today) competitor ads everywhere |

You'd intercept at stage 3, before they even know to search for a tool. **That's the wedge.**

### 2. The British/American spelling pair is a near-perfect SEO move

- US/CA market searches "organizational" (no s)
- UK/AU/IN/NZ/SG market searches "organisational" (with s)
- Owning both = 100% of English-speaking markets, no competitor split
- Cost: ~$30/year for both
- Defensive value: prevents anyone else from buying the British spelling and stealing 30% of your global traffic

### 3. SEO compounds; ads don't

- Google Ads: $X spend → $Y traffic, every month, until you stop
- A great essay published on a high-authority domain: published once, drives traffic for 5-10 years, costs $0/month after publication
- Every month you delay = 1 month of compounding lost

### 4. Authority transfer back to reattend.com

Internal linking from organizationalamnesia.com → reattend.com lifts reattend's domain authority because it's a brand-relevant link from a topically-authoritative domain. Free SEO juice.

### 5. The brand alignment is too good to ignore

Reattend's tagline could literally be _"We solve organizational amnesia."_ Owning the term as a domain locks that positioning in. Glean can't say this — their term is "enterprise search." Notion can't — their term is "all-in-one workspace." We get to define and own the category.

---

## What this is NOT

- ❌ A redirect to reattend.com (would waste the SEO value)
- ❌ A "buy now" landing page (would scare off researchers + journalists)
- ❌ A blog about Reattend with a different URL (Google figures this out, penalizes for duplicate intent)
- ❌ A clone of reattend.com with different colors

It IS:

- ✅ A content authority site that happens to be operated by the company that solves the problem
- ✅ The de facto online resource for the term "organizational amnesia"
- ✅ A site that links to Reattend conversationally + naturally + occasionally

Think: **Atlassian's `agile.coach`** (now `atlassian.com/agile`), **HubSpot's `inbound.org`**, **Stripe's `pressonly.com`** in their early days.

---

## The site architecture

Both domains run the same Next.js app (separate Vercel project; deploy from a separate small repo). Per-domain config picks the right spelling.

```
organizationalamnesia.com (canonical, en-US)
├── /                          # Hero: "What is organizational amnesia?" + 3-paragraph definition + featured essays
├── /what-is                   # Anchor essay: 3000-word definitive guide (the page that ranks)
├── /signs                     # "10 signs your company has organizational amnesia"
├── /cost                      # "The hidden cost of organizational amnesia ($31.5B/year — research breakdown)"
├── /vs-knowledge-debt         # "Organizational amnesia vs knowledge debt — what's the difference?"
├── /4-stages                  # "The 4 stages of organizational amnesia (the framework)"
├── /case-studies              # Real-world stories
│   ├── /apollo-hospitals
│   ├── /ge-aviation
│   └── /openai-departures-2024
├── /research                  # The annual State of Organizational Memory report
│   └── /2026                  # Full PDF + HTML version + key stats
├── /interviews                # Interviews with experts, ex-employees, researchers
├── /verticals                 # /healthcare, /finance, /government, /tech
├── /resources                 # Curated reading list of books, papers, podcasts
└── /about                     # Who we are, why this site exists. Mentions Reattend in the third paragraph.

organisationalamnesia.com (en-GB mirror)
└── (identical structure, British spellings, hreflang en-GB)
```

### Key design rules

- **Editorial aesthetic**, not product. Think NYT or HBR, not Stripe-marketing.
- **No nav-bar "Sign Up" button.** A small "Reattend" mention in the footer + contextual links inside essays.
- **Long-form is default.** Average essay 2000-4000 words. Listicles 1500. Definitions 800-1200.
- **Bylines.** Even if Partha writes everything in year 1, byline as "Partha Bhowmick" — humanizes + gives Wikipedia citation hooks.
- **Cite original research.** Every claim has a footnote. AEs love bibliographies.
- **Heavy internal linking.** Every essay links to 3-5 other essays. Builds topical authority.

---

## The technical setup

### Day 1 — DNS + skeleton

1. Point `organizationalamnesia.com` and `organisationalamnesia.com` A records to a new Vercel project (NOT the reattend droplet — keep them isolated so a Reattend outage doesn't tank the SEO sites).
2. Vercel project: a small Next.js app, separate repo (`Reattend/organizationalamnesia`).
3. Both domains point at the same Vercel deployment. Site code reads `request.headers.host` and serves the right spelling per domain.
4. Set `hreflang` per page: `en-US` → organizationalamnesia.com, `en-GB` → organisationalamnesia.com.
5. **Canonical strategy**: organizationalamnesia.com is canonical for ALL pages. organisationalamnesia.com mirrors with its own hreflang but declares organizationalamnesia.com as canonical for any page where the British spelling doesn't make a content difference. _Exception_: pages explicitly written for the British market keep their own canonical.

### Day 1 — Essential pages

Ship these 4 on day 1, even if they're not perfect:
1. `/` — homepage with definition + 3 featured essays
2. `/what-is` — the anchor essay
3. `/about` — who we are, mentions Reattend naturally
4. `/contact` — for journalists, researchers, partnerships

### Week 1 — Add 3 more

5. `/signs` — listicle
6. `/cost` — research breakdown
7. `/4-stages` — original framework

### Month 1 — fill out the research and verticals sections

### Month 3 — first State of Organizational Memory report (the linkable asset)

---

## Content stack

```
src/lib/content/         # MDX files for every essay
src/lib/data/            # Stats + research the essays cite
src/components/          # Essay layout, table of contents, footnote system, byline
public/research/         # Downloadable PDFs
```

Editorial workflow: draft in Notion or Google Docs → final in MDX → PR → review → merge → deploy. **Never publish without a 24-hour cool-off draft review** — typos in essays kill credibility.

---

## How essays should be structured (the template)

Every essay follows this shape so AEs can extract from any of them:

```markdown
---
title: "What is organizational amnesia? A complete guide"
description: "Organizational amnesia is when a company loses institutional knowledge..."
date: "2026-05-15"
author: "Partha Bhowmick"
---

## TLDR
[Single paragraph that answers the question. AE engines often quote this verbatim.]

## What is organizational amnesia? (definition)
[2-3 paragraphs. First sentence: "Organizational amnesia is X." Direct, declarative.]

## Why does it happen?
[3-5 reasons with sub-headings. Each with examples.]

## Common signs
[Listicle inside the article. Each sign as a `<h3>`.]

## How to measure it
[Methodologies. Frameworks. Citations to research.]

## How to prevent it
[Action-oriented. Tools mentioned (including Reattend, conversationally — not as an ad).]

## FAQ
[6-10 questions, each as `<h3>`. JSON-LD FAQ schema embedded. Designed for "People Also Ask" + ChatGPT extraction.]

## Further reading
[Links to other essays on this site + 2-3 outbound links to Wikipedia / HBR / academic papers.]
```

---

## The "natural Reattend mention" strategy

Reattend gets mentioned in essays, but ONLY where it earns its place. Examples:

- ❌ Bad: _"Sign up for Reattend free →"_ at the top of every page
- ❌ Bad: Pop-up after 30 seconds asking for an email
- ✅ Good: In the "How to prevent" section: _"This is exactly why we built Reattend — but you can also build something internally if you have engineers to spare. Here's a [post on doing it yourself]."_
- ✅ Good: Footer of every page: small "Operated by Reattend" with link
- ✅ Good: An "Author" page where Partha's bio mentions he's Reattend's founder
- ✅ Good: An honest "Why this site exists" paragraph on About page

The unwritten rule: **a researcher would link to this site without hesitation, knowing they're not being marketed to.** That's how you build a moat.

---

## What we measure

Per domain, monthly:

- Organic search traffic (Google Search Console)
- Top 20 ranking keywords (Ahrefs)
- Backlinks acquired
- Time on page (Plausible)
- Reattend referral traffic (link clicks back to reattend.com)
- AE citation count (manual ChatGPT/Claude/Perplexity test queries — track which essays get quoted)

**Year 1 target:**
- 50K monthly organic visitors across both domains
- "Organizational amnesia" → organizationalamnesia.com is #1 globally on Google
- 5+ AE engines cite us regularly for the term
- 200+ referring domains
- 30%+ of essay readers click through to reattend.com once they've read 2+ essays

---

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Content rot — we can't sustain weekly | Hire a part-time writer at month 3. Budget $3-5K/month. ROI shows up at month 12. |
| Looks like SEO spam | The editorial aesthetic + bylines + cited research save us. Never publish thin content. |
| Google merges the two domains | hreflang + distinct canonicals + slight content variations between US/UK essays prevent this. |
| Competitors buy "organisationalamnesia.co.uk" or similar | Buy them ourselves now ($30 each is nothing). Add `.co.uk`, `.io`, `.net`, `.org`. |
| The term doesn't take off | The "amnesia" frame is sticky enough that even partial uptake is valuable. We're not betting the company on it. |

---

## Domain hygiene to do this week

Buy the protective domains while they're cheap:

- `organizationalamnesia.org`
- `organizationalamnesia.io`
- `organizationalamnesia.co`
- `organisationalamnesia.org`
- `organisationalamnesia.io`
- `organisationalamnesia.co.uk`

Total cost: ~$200/year. Defensive moat against future copycats.

---

## When to start

**Not before launch.** The reattend.com product needs to be rock-solid first, because every essay drives traffic back. If they land on a broken product, we lose the trust forever.

**Suggested timeline:**
- Now → end of test week: keep building product
- After test week + during initial customer onboarding: write the first anchor essay (`/what-is`) on reattend.com/blog as a proof. Move it to the OA domain when it goes live.
- Month 1 post-launch: spin up the OA domains site (this playbook)
- Month 2: hire a writer
- Month 3: first State of Org Memory research
- Month 6: Wikipedia mentions, podcast circuit, content compounding visible in traffic

---

_The strategy is sound. The execution is the only question. Start small, ship weekly, hire help by month 3._
