import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAuth } from '@/lib/auth'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * POST /api/share/email
 * Send a shared memory via email.
 * Body: { to, title, summary?, shareUrl, senderName? }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const body = await req.json()
    const { to, title, summary, shareUrl, senderName } = body

    if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (!title || !shareUrl) {
      return NextResponse.json({ error: 'title and shareUrl required' }, { status: 400 })
    }

    const sender = senderName || 'Someone'
    const previewText = summary
      ? (summary.length > 200 ? summary.slice(0, 200) + '...' : summary)
      : 'Open to view the full memory.'

    const saveUrl = `${shareUrl}?save=1`

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #0B0B0F;">
        <div style="margin-bottom: 32px;">
          <img src="https://reattend.com/black_logo.svg" alt="Reattend" width="28" height="28" style="vertical-align: middle;" />
          <span style="font-size: 16px; font-weight: 700; margin-left: 8px; vertical-align: middle; color: #1a1a2e;">Reattend</span>
        </div>

        <p style="font-size: 14px; color: #666; margin: 0 0 24px;">
          ${escapeHtml(sender)} shared a memory with you:
        </p>

        <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f3f0ff 100%); border-radius: 16px; padding: 28px; margin-bottom: 28px; border: 1px solid #e8e5f0;">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #1a1a2e;">
            ${escapeHtml(title)}
          </h2>
          <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 0;">
            ${escapeHtml(previewText)}
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 16px;">
          <a href="${escapeHtml(shareUrl)}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 600;">
            View Memory &rarr;
          </a>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${escapeHtml(saveUrl)}" style="display: inline-block; background: #fff; color: #4F46E5; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 600; border: 1.5px solid #4F46E5;">
            Save to my Reattend
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

        <div style="text-align: center;">
          <p style="font-size: 13px; color: #999; margin: 0 0 12px;">
            Reattend is your AI-powered memory layer. Capture decisions, meetings, and insights — all in one place.
          </p>
          <a href="https://reattend.com" style="font-size: 13px; color: #4F46E5; text-decoration: none; font-weight: 500;">
            Try Reattend free &rarr;
          </a>
        </div>
      </div>
    `

    if (!resend) {
      return NextResponse.json({ error: 'Email sending is not configured' }, { status: 503 })
    }

    await resend.emails.send({
      from: 'Reattend <noreply@reattend.com>',
      to,
      subject: `${sender} shared a memory: ${title}`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[Share Email Error]', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
