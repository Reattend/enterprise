import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// ─── Shared design tokens ──────────────────────────────────────────────
// Email clients are inconsistent on web fonts (Gmail web works, Outlook
// strips them, Apple Mail iOS only loads the system font). So we always
// declare Instrument Serif / Inter via <link> in the <head> for clients
// that respect it, AND set generic-system fallbacks in inline font-family
// so the layout doesn't collapse where the web font fails.
//
// Colors are hex (oklch is not supported in any major email client).
// Cream palette + violet accent matches the in-product design language.

const TOKENS = {
  bgPage: '#F7F4EC',     // outer cream wash
  bgCard: '#FBFAF6',     // card body
  ink: '#1A1A2E',        // primary text
  ink2: '#4B5563',       // secondary text
  ink3: '#9B9486',       // tertiary / footer text
  rule: '#E5E0D6',       // hairline rule
  accent: '#5B4FE5',     // violet (the in-product --accent)
  accentSoft: '#EDEBFA', // soft violet fill
  brand: '#0B0B0F',      // logo background plate
  fontSerif: "'Instrument Serif', 'Times New Roman', Georgia, serif",
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
} as const

// Reattend logo PNG hosted at reattend.com — image hotlinking is required
// because email clients almost never render SVG. Keep this URL stable; if
// it ever moves, every shipped email since 2026-05-03 still references it.
const LOGO_URL = 'https://reattend.com/icon-128.png'

interface EmailLayoutOpts {
  preheader?: string  // hidden one-line preview shown in inbox listings
  heading: string     // serif H1
  bodyHtml: string    // rendered body content (already-escaped)
  ctaLabel?: string
  ctaUrl?: string
  postCtaHtml?: string // optional small text below the CTA
  signOff?: string     // override default footer signoff
}

/**
 * Wraps content in the shared Reattend email shell. Returns full HTML
 * doc ready to pass to Resend. All callers should use this — never
 * write a one-off email layout.
 */
export function renderEmail(opts: EmailLayoutOpts): string {
  const preheader = opts.preheader || ''
  const cta = opts.ctaLabel && opts.ctaUrl
    ? `<a href="${opts.ctaUrl}" style="display:inline-block; background:${TOKENS.brand}; color:#fff; font-family:${TOKENS.fontSans}; font-weight:500; font-size:15px; padding:14px 28px; border-radius:999px; text-decoration:none; margin-top:12px;">${escapeHtml(opts.ctaLabel)}</a>`
    : ''
  const postCta = opts.postCtaHtml
    ? `<p style="font-family:${TOKENS.fontSans}; color:${TOKENS.ink3}; font-size:12.5px; margin:14px 0 0; line-height:1.5;">${opts.postCtaHtml}</p>`
    : ''
  const signOff = opts.signOff || `Reattend · <a href="https://reattend.com" style="color:${TOKENS.accent}; text-decoration:none;">reattend.com</a><br />Reply to this email any time — it goes to a human.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.heading)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</head>
<body style="margin:0; padding:0; background:${TOKENS.bgPage};">
<!-- preheader (hidden, shows in inbox preview) -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${TOKENS.bgPage};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">
        <tr>
          <td style="background:${TOKENS.bgCard}; border:1px solid ${TOKENS.rule}; border-radius:16px; padding:40px 36px;">
            <!-- Logo -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td>
                  <img src="${LOGO_URL}" alt="Reattend" width="36" height="36" style="display:block; border-radius:8px;" />
                </td>
                <td style="padding-left:10px; vertical-align:middle;">
                  <span style="font-family:${TOKENS.fontSerif}; font-size:20px; color:${TOKENS.ink}; letter-spacing:-0.01em;">Reattend</span>
                </td>
              </tr>
            </table>

            <!-- Heading -->
            <h1 style="font-family:${TOKENS.fontSerif}; font-size:34px; font-weight:400; line-height:1.1; letter-spacing:-0.02em; color:${TOKENS.ink}; margin:0 0 14px;">${opts.heading}</h1>

            <!-- Body -->
            <div style="font-family:${TOKENS.fontSans}; color:${TOKENS.ink2}; font-size:15.5px; line-height:1.6;">
              ${opts.bodyHtml}
            </div>

            ${cta ? `<div style="margin-top:24px;">${cta}${postCta}</div>` : ''}

            <!-- Footer -->
            <hr style="border:none; border-top:1px solid ${TOKENS.rule}; margin:32px 0 18px;" />
            <p style="font-family:${TOKENS.fontSans}; color:${TOKENS.ink3}; font-size:12px; margin:0; line-height:1.65;">${signOff}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 8px 0; text-align:center;">
            <p style="font-family:${TOKENS.fontSans}; color:${TOKENS.ink3}; font-size:11px; margin:0; letter-spacing:0.02em;">© ${new Date().getFullYear()} Reattend Technologies Private Limited</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// ─── OTP login code email ────────────────────────────────────────────────
export function renderOtpEmail(code: string): string {
  return renderEmail({
    preheader: `Your Reattend login code is ${code}`,
    heading: 'Your sign-in code.',
    bodyHtml: `
      <p style="margin:0 0 16px;">Enter this code on the Reattend sign-in page to finish logging in:</p>
      <div style="background:#fff; border:2px solid ${TOKENS.rule}; border-radius:12px; padding:22px; text-align:center; margin:8px 0 20px;">
        <span style="font-family:${TOKENS.fontMono}; font-size:34px; font-weight:600; letter-spacing:0.32em; color:${TOKENS.ink};">${escapeHtml(code)}</span>
      </div>
      <p style="margin:0; color:${TOKENS.ink3}; font-size:13.5px;">Expires in <b style="color:${TOKENS.ink2};">10 minutes</b>. If you didn't request this, ignore this email — your account is fine.</p>
    `,
  })
}

// ─── Welcome email ──────────────────────────────────────────────────────
export async function sendWelcomeEmail(email: string, name: string) {
  const html = renderEmail({
    preheader: `Welcome to Reattend, ${name}. Here's how to get started.`,
    heading: `Welcome, ${escapeHtml(name)}.`,
    bodyHtml: `
      <p style="margin:0 0 18px;">Reattend is the memory layer your team can't get from any other tool. It captures decisions, conversations, and context — so the next person to ask a question gets the answer instantly, with sources cited.</p>
      <div style="background:#fff; border:1px solid ${TOKENS.rule}; border-radius:12px; padding:22px; margin:8px 0 24px;">
        <p style="font-family:${TOKENS.fontMono}; font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.16em; color:${TOKENS.ink3}; margin:0 0 14px;">Get started in 3 steps</p>
        ${stepRow(1, 'Install the Chrome extension', 'Captures context from any whitelisted work app, with a one-click pin and (opt-in) auto-ingest.')}
        ${stepRow(2, 'Connect an integration', 'Slack, Notion, Gmail, Calendar, Linear — pick one. Reattend syncs in the background.')}
        ${stepRow(3, 'Ask your first question', 'Open the side panel: "What did we decide about X?" Cited answers in seconds.')}
      </div>
    `,
    ctaLabel: 'Open your dashboard →',
    ctaUrl: 'https://reattend.com/app',
    signOff: `— Partha, founder<br /><a href="mailto:pb@reattend.ai" style="color:${TOKENS.accent}; text-decoration:none;">pb@reattend.ai</a> · Reply to this email any time.`,
  })

  if (!resend) {
    console.log(`[Welcome email] (dev) → ${email}`)
    return
  }
  try {
    await resend.emails.send({
      from: 'Partha from Reattend <pb@reattend.com>',
      to: email,
      subject: `Welcome to Reattend — you're all set`,
      html,
    })
  } catch (err) {
    console.error('[Welcome email] Failed to send:', err)
  }
}

function stepRow(n: number, title: string, blurb: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
      <tr>
        <td valign="top" style="padding-right:14px; padding-top:1px;">
          <div style="width:24px; height:24px; border-radius:50%; background:${TOKENS.accentSoft}; color:${TOKENS.accent}; font-family:${TOKENS.fontSans}; font-size:13px; font-weight:600; line-height:24px; text-align:center;">${n}</div>
        </td>
        <td valign="top">
          <div style="font-family:${TOKENS.fontSans}; font-weight:600; color:${TOKENS.ink}; font-size:14.5px; margin:0 0 3px;">${title}</div>
          <div style="font-family:${TOKENS.fontSans}; color:${TOKENS.ink2}; font-size:13.5px; line-height:1.55;">${blurb}</div>
        </td>
      </tr>
    </table>
  `
}

// ─── Enterprise invite email ────────────────────────────────────────────
export async function sendEnterpriseInviteEmail(opts: {
  toEmail: string
  orgName: string
  inviterName: string
  inviterEmail: string
  role: 'super_admin' | 'admin' | 'member' | 'guest'
  acceptUrl: string
  expiresAt: string
  departmentName?: string | null
}) {
  const roleLabel = opts.role === 'super_admin' ? 'Super admin'
    : opts.role === 'admin' ? 'Admin'
    : opts.role === 'guest' ? 'Guest'
    : 'Member'
  const expiresOn = new Date(opts.expiresAt).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  const html = renderEmail({
    preheader: `${opts.inviterName} invited you to join ${opts.orgName} on Reattend`,
    heading: `Join ${escapeHtml(opts.orgName)}.`,
    bodyHtml: `
      <p style="margin:0 0 18px;"><strong style="color:${TOKENS.ink};">${escapeHtml(opts.inviterName)}</strong> (${escapeHtml(opts.inviterEmail)}) invited you to <strong style="color:${TOKENS.ink};">${escapeHtml(opts.orgName)}</strong> as a <strong style="color:${TOKENS.ink};">${roleLabel}</strong>${opts.departmentName ? ` in ${escapeHtml(opts.departmentName)}` : ''}.</p>
      <div style="background:#fff; border:1px solid ${TOKENS.rule}; border-radius:12px; padding:18px 20px; margin:8px 0 16px;">
        <p style="font-family:${TOKENS.fontMono}; font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.16em; color:${TOKENS.ink3}; margin:0 0 8px;">What Reattend does</p>
        <p style="margin:0; font-size:14px; line-height:1.6;">Your organization's memory — every decision, every conversation, every piece of institutional knowledge preserved and searchable. Even when people leave, transfer, or retire.</p>
      </div>
    `,
    ctaLabel: 'Accept invitation →',
    ctaUrl: opts.acceptUrl,
    postCtaHtml: `Link expires ${expiresOn}. Use your work email — Reattend is org-only.`,
  })

  if (!resend) {
    console.log(`[Enterprise invite] (dev) → ${opts.toEmail} for ${opts.orgName}\n   Accept URL: ${opts.acceptUrl}`)
    return
  }
  try {
    await resend.emails.send({
      from: 'Reattend <pb@reattend.com>',
      to: opts.toEmail,
      subject: `You're invited to ${opts.orgName} on Reattend`,
      html,
      replyTo: opts.inviterEmail,
    })
  } catch (err) {
    console.error('[Enterprise invite email] Failed to send:', err)
    throw err
  }
}

// ─── Trial-end follow-up emails (cron-driven) ───────────────────────────
// One per cadence stage. Day-30 = 15 days left, day-38 = 7, day-44 = 1,
// day-46 = downgraded. Subject lines are tuned to inbox glance value.

export async function sendTrialReminder(opts: {
  toEmail: string
  name: string
  tier: 'professional' | 'enterprise'
  daysLeft: number  // 15, 7, 1
}) {
  const tierName = opts.tier === 'professional' ? 'Professional' : 'Enterprise'
  const urgency = opts.daysLeft === 1 ? 'Tomorrow' : opts.daysLeft <= 7 ? 'This week' : 'In two weeks'
  const subject = opts.daysLeft === 1
    ? `Your Reattend trial ends tomorrow`
    : `${opts.daysLeft} days left in your Reattend ${tierName} trial`

  const html = renderEmail({
    preheader: `${urgency}: add a card to keep your ${tierName} plan, or auto-downgrade to Free with all data intact.`,
    heading: opts.daysLeft === 1 ? 'Trial ends tomorrow.' : `${opts.daysLeft} days left.`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hey ${escapeHtml(opts.name)} — quick heads-up: your <strong style="color:${TOKENS.ink};">Reattend ${tierName}</strong> trial ${opts.daysLeft === 1 ? 'ends tomorrow' : `wraps in ${opts.daysLeft} days`}.</p>
      <p style="margin:0 0 16px;">If you add a card before then, you continue uninterrupted. <strong style="color:${TOKENS.ink};">No card?</strong> No problem — your account quietly drops to Free with limits on AI questions and retention. <strong style="color:${TOKENS.ink};">Your data stays exactly as it is.</strong> You can re-upgrade anytime.</p>
      ${opts.daysLeft === 1 ? `<p style="margin:0 0 16px; padding:12px 14px; background:#FFF7E6; border-left:3px solid #E0A33C; border-radius:6px; color:${TOKENS.ink}; font-size:14px;">After tomorrow, free-tier limits kick in: 100 AI questions/month and 90-day rolling retention.</p>` : ''}
    `,
    ctaLabel: 'Add a card →',
    ctaUrl: 'https://reattend.com/app/settings/billing',
    postCtaHtml: `Or reply to this email if you have questions — I read everything. — Partha`,
  })

  if (!resend) {
    console.log(`[Trial reminder ${opts.daysLeft}d] (dev) → ${opts.toEmail}`)
    return
  }
  try {
    await resend.emails.send({
      from: 'Partha from Reattend <pb@reattend.com>',
      to: opts.toEmail,
      subject,
      html,
    })
  } catch (err) {
    console.error(`[Trial reminder ${opts.daysLeft}d] Failed to send:`, err)
  }
}

export async function sendTrialEndedEmail(opts: {
  toEmail: string
  name: string
  tier: 'professional' | 'enterprise'
}) {
  const tierName = opts.tier === 'professional' ? 'Professional' : 'Enterprise'
  const html = renderEmail({
    preheader: `Your trial ended. You're on Free now — all your data is safe.`,
    heading: `You're on Free now.`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hey ${escapeHtml(opts.name)} — your Reattend ${tierName} trial ended. As promised, your account moved to <strong style="color:${TOKENS.ink};">Free</strong> automatically. <strong style="color:${TOKENS.ink};">Every memory, decision, and connection is intact.</strong></p>
      <p style="margin:0 0 16px;">From here on out, free-tier limits apply: 100 AI questions per month, 90-day rolling retention. Your records older than 90 days will gradually fade off (we soft-delete with a recovery window).</p>
      <p style="margin:0 0 16px;">Want to come back to ${tierName}? One click — your old plan, your old data, no migration.</p>
    `,
    ctaLabel: 'Re-upgrade to ' + tierName + ' →',
    ctaUrl: 'https://reattend.com/app/settings/billing',
    postCtaHtml: `If Reattend wasn't the right fit, reply and tell me what didn't work — I'd genuinely like to know. — Partha`,
  })

  if (!resend) {
    console.log(`[Trial ended] (dev) → ${opts.toEmail}`)
    return
  }
  try {
    await resend.emails.send({
      from: 'Partha from Reattend <pb@reattend.com>',
      to: opts.toEmail,
      subject: `Your Reattend trial ended — you're on Free, your data is safe`,
      html,
    })
  } catch (err) {
    console.error('[Trial ended email] Failed to send:', err)
  }
}

// ─── Admin-granted trial / comp email ────────────────────────────────────
// Sent when a super-admin manually extends a trial via the admin dashboard.
// "Comped X for Y days." — no card needed, no Paddle interaction.
export async function sendTrialGrantedEmail(opts: {
  toEmail: string
  name: string
  tier: 'professional' | 'enterprise'
  daysGranted: number
  trialEndsAt: string  // ISO
}) {
  const tierName = opts.tier === 'professional' ? 'Professional' : 'Enterprise'
  const expiresOn = new Date(opts.trialEndsAt).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  const html = renderEmail({
    preheader: `${opts.daysGranted} days of Reattend ${tierName} on the house — no card required.`,
    heading: `${opts.daysGranted} days on us.`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hey ${escapeHtml(opts.name)} — we've extended your <strong style="color:${TOKENS.ink};">Reattend ${tierName}</strong> trial by <strong style="color:${TOKENS.ink};">${opts.daysGranted} day${opts.daysGranted === 1 ? '' : 's'}</strong>. No card needed.</p>
      <div style="background:#fff; border:1px solid ${TOKENS.rule}; border-radius:12px; padding:16px 18px; margin:8px 0 16px;">
        <p style="margin:0; font-size:14px;"><strong style="color:${TOKENS.ink};">Plan:</strong> ${tierName}</p>
        <p style="margin:6px 0 0; font-size:14px;"><strong style="color:${TOKENS.ink};">Trial ends:</strong> ${expiresOn}</p>
      </div>
      <p style="margin:0 0 16px;">Use the time to push the limits — pull more memory in, ask harder questions, share with the team. We'll send a heads-up before the trial wraps so nothing surprises you.</p>
    `,
    ctaLabel: 'Open Reattend →',
    ctaUrl: 'https://reattend.com/app',
    postCtaHtml: `Reply to this email if you want more time, want to chat, or hit a snag. — Partha`,
  })

  if (!resend) {
    console.log(`[Trial granted ${opts.daysGranted}d] (dev) → ${opts.toEmail}`)
    return
  }
  try {
    await resend.emails.send({
      from: 'Partha from Reattend <pb@reattend.com>',
      to: opts.toEmail,
      subject: `${opts.daysGranted} more day${opts.daysGranted === 1 ? '' : 's'} of Reattend ${tierName} — on us`,
      html,
    })
  } catch (err) {
    console.error('[Trial granted email] Failed to send:', err)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
