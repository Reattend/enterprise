import { BLOG_POSTS } from '@/lib/blog/data'

export async function GET() {
  const baseUrl = 'https://reattend.com'

  const items = BLOG_POSTS.map(
    (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.date + 'T00:00:00Z').toUTCString()}</pubDate>
      <category>${post.category}</category>
      <author>team@reattend.com (${post.author})</author>
    </item>`
  ).join('\n')

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Reattend Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Insights on team knowledge management, decision intelligence, meeting productivity, and organizational memory.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/icon-192.png</url>
      <title>Reattend Blog</title>
      <link>${baseUrl}/blog</link>
    </image>
${items}
  </channel>
</rss>`

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
