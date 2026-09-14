import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /admin/ is NOT disallowed on purpose: its pages carry noindex, and
        // Google can only honour noindex on pages it is allowed to crawl.
        disallow: ['/app/', '/api/'],
      },
    ],
    sitemap: 'https://reattend.com/sitemap.xml',
  }
}
