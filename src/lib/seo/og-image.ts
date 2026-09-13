// The site-wide link-preview image. Next.js REPLACES a parent's openGraph /
// twitter metadata when a page declares its own block, so every page that
// sets openGraph or twitter must also include these images or it ships with
// no preview image at all. Keep this the single source.
export const OG_IMAGE = {
  url: 'https://reattend.com/og-image.png',
  width: 1200,
  height: 630,
  alt: 'Reattend: a little less remembering, a lot more possibility.',
}
