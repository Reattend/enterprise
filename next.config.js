/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'better-sqlite3',
      'sqlite-vec',
      'fastembed',
      'onnxruntime-node',
      '@anush008/tokenizers',
      // pdf-parse v2 wraps pdfjs-dist, which dynamically imports its worker
      // chunk at runtime. Bundling it via webpack rewrites the worker path
      // into .next/server/chunks where the .mjs file doesn't exist, so
      // every PDF upload throws "Setting up fake worker failed". Externalize
      // both packages so they resolve from node_modules at runtime.
      'pdf-parse',
      'pdfjs-dist',
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
