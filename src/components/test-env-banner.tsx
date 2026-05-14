// Persistent red banner at the top of every page when this build is
// running on the test droplet (NEXT_PUBLIC_ENV=test, injected per
// droplet at build time).
//
// Prod stays untouched: when the env var isn't set or is anything other
// than "test", the component renders null. Zero overhead, no client JS
// (this is a server component with a fixed runtime check).
//
// Mounted at the top of <body> in the root layout so it covers public
// pages, /login, the dashboard — everywhere.

export function TestEnvBanner() {
  if (process.env.NEXT_PUBLIC_ENV !== 'test') return null

  return (
    <div
      className="sticky top-0 z-[100] w-full bg-rose-600 text-white text-[12px] font-medium py-1.5 px-3 text-center"
      role="alert"
    >
      <span className="font-bold tracking-wide uppercase mr-2">Test environment</span>
      Data is fake. Never paste real secrets, customer info, or production tokens.
      <span className="ml-2 opacity-80">test.reattend.com</span>
    </div>
  )
}
