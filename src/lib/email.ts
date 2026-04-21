import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendWelcomeEmail(email: string, name: string) {
  if (!resend) {
    console.log(`[Welcome email] (dev) → ${email}`)
    return
  }
  try {
    await resend.emails.send({
      from: 'Partha from Reattend <pb@reattend.com>',
      to: email,
      subject: 'Welcome to Reattend — you\'re all set',
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#fff;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#111;">

  <div style="margin-bottom:28px;">
    <span style="font-size:22px;font-weight:700;color:#4F46E5;">Reattend</span>
  </div>

  <h1 style="font-size:26px;font-weight:700;margin:0 0 12px;color:#111;line-height:1.2;">
    Welcome, ${name}. You're in.
  </h1>
  <p style="color:#6B7280;font-size:15px;line-height:1.65;margin:0 0 28px;">
    Reattend is your personal memory layer. It captures what you read, discuss, and decide — so you never lose context again.
  </p>

  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:22px 20px;margin-bottom:28px;">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#9CA3AF;margin:0 0 18px;">Get started in 3 steps</p>

    <div style="margin-bottom:16px;display:flex;gap:12px;">
      <div style="width:22px;height:22px;border-radius:50%;background:#EEF2FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:700;color:#4F46E5;padding-top:1px;">1</div>
      <div>
        <p style="font-weight:600;color:#111;font-size:14px;margin:0 0 3px;">Add the Chrome extension</p>
        <p style="color:#6B7280;font-size:13px;margin:0;line-height:1.5;">Captures context from Gmail, Slack, Calendar, and pages you visit.</p>
      </div>
    </div>

    <div style="margin-bottom:16px;display:flex;gap:12px;">
      <div style="width:22px;height:22px;border-radius:50%;background:#EEF2FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:700;color:#4F46E5;padding-top:1px;">2</div>
      <div>
        <p style="font-weight:600;color:#111;font-size:14px;margin:0 0 3px;">Connect an integration</p>
        <p style="color:#6B7280;font-size:13px;margin:0;line-height:1.5;">Sync Gmail, Google Calendar, Slack, or Google Meet — all in one place.</p>
      </div>
    </div>

    <div style="display:flex;gap:12px;">
      <div style="width:22px;height:22px;border-radius:50%;background:#EEF2FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:700;color:#4F46E5;padding-top:1px;">3</div>
      <div>
        <p style="font-weight:600;color:#111;font-size:14px;margin:0 0 3px;">Ask your first question</p>
        <p style="color:#6B7280;font-size:13px;margin:0;line-height:1.5;">Open the side panel and ask — "What did we decide about the launch?"</p>
      </div>
    </div>
  </div>

  <a href="https://reattend.com/app" style="display:inline-block;background:#4F46E5;color:#fff;font-weight:600;font-size:15px;padding:13px 28px;border-radius:999px;text-decoration:none;margin-bottom:32px;">
    Open your dashboard →
  </a>

  <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 20px;" />
  <p style="color:#9CA3AF;font-size:13px;margin:0;line-height:1.6;">
    Reply to this email with any questions — I read everything.<br />
    — Partha, founder &nbsp;·&nbsp; <a href="mailto:pb@reattend.ai" style="color:#4F46E5;text-decoration:none;">pb@reattend.ai</a>
  </p>

</div>
</body>
</html>`,
    })
  } catch (err) {
    // Fire-and-forget: don't fail registration if email fails
    console.error('[Welcome email] Failed to send:', err)
  }
}

// ─── Enterprise invite email ────────────────────────────────────────────────
// Sent when an org admin invites someone who doesn't yet have a Reattend
// Enterprise account. Contains the magic-link to accept + org context.
export async function sendEnterpriseInviteEmail(opts: {
  toEmail: string
  orgName: string
  inviterName: string
  inviterEmail: string
  role: 'super_admin' | 'admin' | 'member' | 'guest'
  acceptUrl: string
  expiresAt: string // ISO
  departmentName?: string | null
}) {
  const roleLabel = opts.role === 'super_admin' ? 'Super admin'
    : opts.role === 'admin' ? 'Admin'
    : opts.role === 'guest' ? 'Guest'
    : 'Member'

  const expiresOn = new Date(opts.expiresAt).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F9FAFB;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;color:#111;">

  <div style="margin-bottom:28px;">
    <span style="font-size:22px;font-weight:700;color:#4F46E5;">Reattend</span>
    <span style="font-size:10px;letter-spacing:0.08em;color:#6366F1;font-weight:600;text-transform:uppercase;margin-left:4px;">Enterprise</span>
  </div>

  <h1 style="font-size:24px;font-weight:700;margin:0 0 12px;color:#111;line-height:1.25;">
    You're invited to ${escapeHtml(opts.orgName)}.
  </h1>
  <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
    <strong>${escapeHtml(opts.inviterName)}</strong> (${escapeHtml(opts.inviterEmail)}) invited you to join <strong>${escapeHtml(opts.orgName)}</strong> on Reattend Enterprise as a <strong>${roleLabel}</strong>${opts.departmentName ? ` in ${escapeHtml(opts.departmentName)}` : ''}.
  </p>

  <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#9CA3AF;margin:0 0 12px;">What Reattend Enterprise does</p>
    <p style="color:#374151;font-size:14px;margin:0 0 8px;line-height:1.6;">
      Your organization's memory — every decision, every context, every piece of institutional knowledge preserved and searchable. Even when people leave.
    </p>
    <p style="color:#6B7280;font-size:13px;margin:0;line-height:1.6;">
      Self-healing detects stale policies and contradictions. Decisions are tracked with who, when, and why. When someone leaves, their knowledge stays with the role — never with the person.
    </p>
  </div>

  <a href="${opts.acceptUrl}" style="display:inline-block;background:#4F46E5;color:#fff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:999px;text-decoration:none;margin-bottom:16px;">
    Accept invitation →
  </a>
  <p style="color:#9CA3AF;font-size:12px;margin:0 0 24px;line-height:1.5;">
    This link expires ${expiresOn}. If it expires before you click it, ask ${escapeHtml(opts.inviterName)} to resend.
  </p>

  <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;margin-bottom:24px;">
    <p style="color:#78350F;font-size:13px;margin:0;line-height:1.5;">
      <strong>Use your work email.</strong> Reattend Enterprise is a separate product from personal Reattend. If you already have a personal Reattend account, you'll create a new account here using your organization email.
    </p>
  </div>

  <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 16px;" />
  <p style="color:#9CA3AF;font-size:12px;margin:0;line-height:1.6;">
    Didn't expect this invite? You can safely ignore this email — nothing will happen unless you click Accept.<br />
    Reattend Enterprise — organizational memory that never forgets.
  </p>

</div>
</body>
</html>`

  if (!resend) {
    console.log(`[Enterprise invite] (dev) → ${opts.toEmail} for ${opts.orgName}\n   Accept URL: ${opts.acceptUrl}`)
    return
  }
  try {
    await resend.emails.send({
      from: 'Reattend Enterprise <pb@reattend.com>',
      to: opts.toEmail,
      subject: `You're invited to ${opts.orgName} on Reattend Enterprise`,
      html,
      replyTo: opts.inviterEmail,
    })
  } catch (err) {
    console.error('[Enterprise invite email] Failed to send:', err)
    throw err // let caller decide whether to surface to UI
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
