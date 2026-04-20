import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { resolveAuth } from '@/lib/metering'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Id',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * POST /api/tray/proxy/share/email
 * Send a shared memory/transcript via email using Resend.
 * Body: { to, title, summary?, shareUrl, senderName? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuth(req.headers)
    if (!auth.deviceId && !auth.userId) {
      return Response.json({ error: 'Auth required' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json()
    const { to, title, summary, shareUrl, senderName } = body

    if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400, headers: corsHeaders })
    }
    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400, headers: corsHeaders })
    }
    if (!shareUrl) {
      return Response.json({ error: 'Share URL is required' }, { status: 400, headers: corsHeaders })
    }

    const sender = senderName || 'Someone'
    const previewText = summary
      ? (summary.length > 200 ? summary.slice(0, 200) + '...' : summary)
      : 'Open to view the full notes.'

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #0B0B0F;">
        <div style="margin-bottom: 32px;">
          <img src="https://www.reattend.com/black_logo.svg" alt="Reattend" width="28" height="28" style="vertical-align: middle;" />
          <span style="font-size: 16px; font-weight: 700; margin-left: 8px; vertical-align: middle; color: #1a1a2e;">Reattend</span>
        </div>

        <p style="font-size: 14px; color: #666; margin: 0 0 24px;">
          ${escapeHtml(sender)} shared meeting notes with you:
        </p>

        <div style="background: linear-gradient(135deg, #f8f9ff 0%, #f3f0ff 100%); border-radius: 16px; padding: 28px; margin-bottom: 28px; border: 1px solid #e8e5f0;">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #1a1a2e;">
            ${escapeHtml(title)}
          </h2>
          <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 0;">
            ${escapeHtml(previewText)}
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${escapeHtml(shareUrl)}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 600;">
            Open in Reattend &rarr;
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

        <div style="text-align: center;">
          <p style="font-size: 13px; color: #999; margin: 0 0 12px;">
            Reattend automatically records, transcribes, and extracts action items from your meetings.
          </p>
          <a href="https://www.reattend.com" style="font-size: 13px; color: #4F46E5; text-decoration: none; font-weight: 500;">
            Try Reattend free &rarr;
          </a>
        </div>
      </div>
    `

    if (!resend) {
      console.log('[Share Email] Would send to:', to, '| Title:', title)
      return Response.json({ ok: true }, { headers: corsHeaders })
    }

    await resend.emails.send({
      from: 'Reattend <noreply@reattend.com>',
      to,
      subject: `${sender} shared notes: ${title}`,
      html,
    })

    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('[Share Email Error]', error)
    return Response.json({ error: 'Failed to send email' }, { status: 500, headers: corsHeaders })
  }
}
