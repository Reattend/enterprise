/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'better-sqlite3',
      'sqlite-vec',
      'fastembed',
      'onnxruntime-node',
      '@anush008/tokenizers',
    ],
  },
  // Strip Next.js font preload Link headers from API routes.
  // Chrome extension popups receive these headers and emit "preloaded but not used" warnings.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Link', value: '' }],
      },
    ]
  },
}

module.exports = nextConfig
