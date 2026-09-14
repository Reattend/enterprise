#!/usr/bin/env node
// Submit every sitemap URL to IndexNow (Bing, Yandex, Seznam, Naver and other
// participating engines; Google does not use IndexNow). Run after a deploy
// that adds or changes public pages:
//
//   node scripts/indexnow-submit.mjs            # all sitemap URLs
//   node scripts/indexnow-submit.mjs /pricing   # just these paths
//
// The key is public by design: IndexNow verifies ownership by fetching
// https://reattend.com/<key>.txt and checking it contains the key.

const HOST = 'reattend.com'
const KEY = 'dc0ee4e77b13848f824629c41c75ffb8'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`

async function sitemapUrls() {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

const args = process.argv.slice(2)
const urlList = args.length ? args.map((p) => `https://${HOST}${p.startsWith('/') ? p : '/' + p}`) : await sitemapUrls()

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
})
// 200 = accepted, 202 = accepted pending key verification. 403 means the key
// file is not reachable yet (deploy first), 422 means a URL is off-host.
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URL(s)`)
if (res.status >= 400) process.exitCode = 1
