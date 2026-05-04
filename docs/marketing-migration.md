# Marketing surface migration

> A short playbook for migrating any tool / game / free-utility / comparison /
> use-case page onto the canonical `<MarketingShell>` + `<MarketingHero>`
> components. Run it page-by-page. Each migration is ~5-10 minutes.
>
> Goal: every marketing surface inherits the design language of the static
> landing (`/public/landing-design/landing.html`) — warm cream background,
> Instrument Serif headings with italic emphasis, JetBrains Mono eyebrows,
> violet accent. So the whole site reads as one product.

---

## Reference implementations

Look at these two pages to see the pattern in code form:

| Page | What it shows |
|---|---|
| `src/app/tool/tool-content.tsx` | Tool-index style: hero + categorized card grid |
| `src/app/tool/memory-debt-calculator/calculator.tsx` | Individual tool style: hero + multi-phase tool body |

If you're migrating a new page, copy the closest reference and tweak.

---

## The 4-step migration recipe

For any individual tool/game/free-utility page:

### Step 1 — Swap the imports

**Before:**
```tsx
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
```

**After:**
```tsx
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { MarketingHero } from '@/components/marketing/marketing-hero'
// Plus, on tool pages where you want the cream "Try Reattend Enterprise free" CTA
// card before the Footer (most tools should have this):
import { ToolFooterCta } from '@/components/landing/tool-footer-cta'
```

### Step 2 — Replace the outer wrapper

**Before:**
```tsx
return (
  <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
    <Navbar />
    {/* gradient blobs */}
    {/* page content */}
    <Footer />
  </div>
)
```

**After:**
```tsx
return (
  <MarketingShell>
    {/* page content */}
    <ToolFooterCta />  {/* optional — for pages with their own end CTA, skip this */}
  </MarketingShell>
)
```

`MarketingShell` provides: cream background, paper-grain texture, the canonical
Navbar at the top, and the canonical Footer at the bottom. You no longer need
to think about chrome.

### Step 3 — Replace the hero

**Before:** ~30 lines of hero JSX with custom eyebrow pill, custom H1 with
`<span className="text-[#4F46E5]">word</span>` for the accent, custom lede,
custom button.

**After:**
```tsx
<MarketingHero
  eyebrow="Free assessment"
  title="Memory Debt"
  emphasis="Calculator"
  emphasisJoiner=" "
  lede="Find out how much knowledge your team is silently losing. Answer 10 quick questions and get your Memory Debt Score with a personalized breakdown."
  primaryCta={{ label: 'Try Reattend Enterprise free', href: '/sandbox' }}
  secondaryCta={{ label: 'See how it works', href: '/how-it-works' }}
  trustChips={['Takes about 2 minutes', 'No signup required', 'Anonymous']}
/>
```

Props:
- `eyebrow` — mono uppercase label (e.g., "Free tool", "Free team game", "Comparison")
- `title` — first part of the headline
- `emphasis` — optional italic-serif word (the closer that lands the message)
- `emphasisJoiner` — defaults to ` ` (space). Use `' — '` or `, ` if your title needs a comma.
- `lede` — 1-2 sentence subhead, ~52ch read width
- `primaryCta` — defaults to `Try Reattend Enterprise free → /sandbox`. Pass `null` to skip (e.g., when the page needs an `onClick` button below the hero).
- `secondaryCta` — optional second pill button
- `trustChips` — optional small bottom row (e.g., compliance badges, "no signup")
- `align` — `'center'` (default) for index pages, `'left'` for split-screen heroes
- `children` — render extra UI (form, screenshot) inside the hero

### Step 4 — Verify

Run `npx tsc --noEmit`. Then `npm run dev` and eyeball the page. The page should:
- Have the cream warm background instead of the old `#F5F5FF` cool tint
- Show the Instrument Serif headline with italic emphasis word in violet
- Show the mono eyebrow with pulsing dot
- Use the canonical pill buttons (dark filled primary, outline secondary)
- Cards on the page should drop their old `bg-white/60 backdrop-blur-xl` style
  in favor of `bg-[oklch(0.992_0.004_80)]` with `border border-[oklch(0.88_0.008_270)]`
  for editorial cleanliness

---

## When the page has multiple phases (intro / quiz / results)

Like `memory-debt-calculator`, where the hero only shows during the intro phase:

```tsx
<MarketingShell>
  <AnimatePresence mode="wait">
    {phase === 'intro' && (
      <motion.div key="intro" /* ...transitions... */>
        <MarketingHero
          eyebrow="Free assessment"
          title="Memory Debt"
          emphasis="Calculator"
          lede="..."
          primaryCta={null}   // hero has no CTA — see button below
        />
        <button onClick={() => setPhase('quiz')}>Start →</button>
      </motion.div>
    )}
    {phase === 'quiz' && (/* quiz UI without a hero */)}
    {phase === 'results' && (/* results UI */)}
  </AnimatePresence>
</MarketingShell>
```

---

## Card / form styling reference

When you have inline cards (e.g., a tool form, a results card), use these
tokens so the page reads as one piece with the rest of the site:

```tsx
<div
  style={{
    background: 'oklch(0.992 0.004 80)',         // paper white
    border: '1px solid oklch(0.88 0.008 270)',   // soft warm border
    borderRadius: '16px',
    boxShadow: '0 1px 2px oklch(0.4 0.01 270 / 0.04)',
  }}
>
  ...
</div>
```

Headlines inside cards: `font-family: 'var(--font-display), serif'` for
20-24px size, `font-family: 'var(--font-inter), sans-serif'` for body.

---

## Pages still pending migration

Run this script to see the current state:

```bash
grep -rL 'MarketingShell' src/app/tool src/app/game src/app/free-* 2>/dev/null \
  | xargs grep -l '<Navbar' 2>/dev/null
```

Each match is a page still on the old chrome. Migrate one at a time. After
each one, type-check, eyeball in dev, commit. Don't try to do them all in one
PR — they vary in tool body complexity and you want each to be reviewable.

---

## What this migration is NOT

- ❌ A redesign — the tool LOGIC stays exactly the same. We're just changing
  the visual chrome and hero.
- ❌ A URL change — paths stay the same. SEO equity intact.
- ❌ A content change — the words on the page stay the same except for the
  hero title (which gets reformatted into title + emphasis).
- ❌ A change to the static landing — `landing.html` is the source of truth
  for design tokens. Don't touch it.

---

## When in doubt

Open `/tool/memory-debt-calculator` (the reference) and any other tool side
by side. The reference should look more "Reattend Enterprise" — warmer
background, serif headline, italic emphasis. If the new tool looks different,
it's not finished.
