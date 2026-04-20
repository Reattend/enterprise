import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: NextRequest) {
  try {
    const { email, title, date, duration, participants, notes } = await req.json()

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const dateStr = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #0B0B0F;">
        <div style="margin-bottom: 32px;">
          <img src="https://reattend.com/black_logo.svg" alt="Reattend" width="28" height="28" style="vertical-align: middle;" />
          <span style="font-size: 16px; font-weight: 600; margin-left: 8px; vertical-align: middle;">Reattend</span>
        </div>

        <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 4px;">Meeting Record</h1>
        <p style="font-size: 13px; color: #888; margin: 0 0 24px;">Here&rsquo;s your meeting record from the Reattend Meeting Recorder.</p>

        <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">${escapeHtml(title)}</h2>

          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #888; width: 100px;">Date</td>
              <td style="padding: 6px 0; font-weight: 500;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #888;">Duration</td>
              <td style="padding: 6px 0; font-weight: 500;">${escapeHtml(duration)}</td>
            </tr>
            ${participants ? `
            <tr>
              <td style="padding: 6px 0; color: #888;">Participants</td>
              <td style="padding: 6px 0; font-weight: 500;">${escapeHtml(participants)}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${notes ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px; color: #888;">Notes</h3>
          <div style="font-size: 14px; line-height: 1.7; white-space: pre-wrap; background: #f9fafb; border-radius: 12px; padding: 20px;">${escapeHtml(notes)}</div>
        </div>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

        <div style="text-align: center; margin-bottom: 24px;">
          <p style="font-size: 14px; color: #888; margin: 0 0 12px;">Want automatic meeting intelligence for your team?</p>
          <a href="https://reattend.com/register" style="display: inline-block; background: #FF3B30; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Try Reattend free &rarr;</a>
        </div>

        <p style="font-size: 11px; color: #bbb; text-align: center; margin: 0;">
          Recorded with <a href="https://reattend.com/record" style="color: #bbb;">Reattend Meeting Recorder</a>
        </p>
      </div>
    `

    if (!resend) {
      console.log('[Meeting Record] Email would be sent to:', email)
      console.log('[Meeting Record] Title:', title, '| Date:', dateStr, '| Duration:', duration)
      return NextResponse.json({ ok: true })
    }

    await resend.emails.send({
      from: 'Reattend <noreply@reattend.com>',
      to: email,
      subject: `Meeting Record: ${title}`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[Meeting Record Email Error]', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
