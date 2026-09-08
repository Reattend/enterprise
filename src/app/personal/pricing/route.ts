import { serveLandingPage } from '@/lib/seo/landing-head'

// Pricing for individual accounts: Free on your own key, or Managed. Team and
// organization pricing stays at /pricing (sales-led).
export const dynamic = 'force-static'

export async function GET() {
  return serveLandingPage({ filename: 'personal-pricing.html', canonicalPath: '/personal/pricing' })
}
