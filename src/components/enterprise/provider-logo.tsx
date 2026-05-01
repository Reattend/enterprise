// Real brand-color SVG logos for the integrations grid. Inline so we
// don't depend on @react-icons or fetch CDNs at runtime, and so the
// fills match the official brand guidelines.
//
// `hint` matches the `iconHint` field returned by /api/integrations/nango/status
// (gmail, drive, slack, notion, confluence, calendar, github, jira, linear).
// Falls back to a generic Plug glyph if hint isn't recognized.

import { Plug } from 'lucide-react'

export function ProviderLogo({ hint, className = 'h-5 w-5' }: { hint: string; className?: string }) {
  switch (hint) {
    case 'gmail':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M22 6L12 13L2 6V4l10 7L22 4v2z" fill="#EA4335" />
          <path d="M2 6v12a2 2 0 002 2h2V8.5L12 13l6-4.5V20h2a2 2 0 002-2V6l-2-2-8 6-8-6-2 2z" fill="#EA4335" />
          <path d="M2 6l10 7V20H4a2 2 0 01-2-2V6z" fill="#FBBC05" />
          <path d="M22 6l-10 7V20h8a2 2 0 002-2V6z" fill="#34A853" />
        </svg>
      )
    case 'drive':
      return (
        <svg className={className} viewBox="0 0 87.3 78" fill="none">
          <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA" />
          <path d="M43.65 25l-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 000 53h27.5z" fill="#00AC47" />
          <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#EA4335" />
          <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D" />
          <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC" />
          <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00" />
        </svg>
      )
    case 'slack':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" fill="#E01E5A" />
          <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" fill="#36C5F0" />
          <path d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312z" fill="#2EB67D" />
          <path d="M15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" fill="#ECB22E" />
        </svg>
      )
    case 'notion':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#000">
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.46 2.35c-.42-.326-.98-.7-2.055-.607L3.01 2.96c-.467.047-.56.28-.374.466l1.823 1.782zm.793 3.358v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.047.934-.56.934-1.167V6.634c0-.607-.233-.933-.747-.887l-15.177.887c-.56.047-.747.327-.747.932zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.934-.234-1.495-.933l-4.577-7.186v6.953l1.449.327s0 .84-1.168.84l-3.222.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.747-1.073l3.456-.234 4.764 7.28V9.388l-1.215-.14c-.093-.514.28-.887.747-.933l3.268-.187z" />
        </svg>
      )
    case 'confluence':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="conf-grad-1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0052CC" />
              <stop offset="100%" stopColor="#2684FF" />
            </linearGradient>
            <linearGradient id="conf-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0052CC" />
              <stop offset="100%" stopColor="#2684FF" />
            </linearGradient>
          </defs>
          <path d="M2 17.5c-.6-.9.3-2.1 1.3-2.7 4.1-2.6 8.7-2.4 12.9.1 1.1.7 2 1.7 1.4 2.8-.4.8-1.3 1-2.1.5-3.3-1.9-6.9-2.1-10.3-.3-.9.5-2.1.5-2.8 0-.2-.1-.3-.3-.4-.4z" fill="url(#conf-grad-1)" />
          <path d="M22 6.5c.6.9-.3 2.1-1.3 2.7-4.1 2.6-8.7 2.4-12.9-.1-1.1-.7-2-1.7-1.4-2.8.4-.8 1.3-1 2.1-.5 3.3 1.9 6.9 2.1 10.3.3.9-.5 2.1-.5 2.8 0 .2.1.3.3.4.4z" fill="url(#conf-grad-2)" />
        </svg>
      )
    case 'calendar':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="16" rx="2" fill="#FFFFFF" stroke="#4285F4" strokeWidth="1.5" />
          <rect x="3" y="5" width="18" height="4" rx="2" fill="#4285F4" />
          <line x1="8" y1="3" x2="8" y2="7" stroke="#1A73E8" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="3" x2="16" y2="7" stroke="#1A73E8" strokeWidth="1.5" strokeLinecap="round" />
          <text x="12" y="18" textAnchor="middle" fontSize="9" fontWeight="600" fill="#4285F4">31</text>
        </svg>
      )
    case 'github':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#181717">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.5 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
        </svg>
      )
    case 'jira':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="jira-grad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#2684FF" />
              <stop offset="100%" stopColor="#0052CC" />
            </linearGradient>
          </defs>
          <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.058A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.215V6.762a1.005 1.005 0 00-1.001-1.005zM23.013 0H11.456a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024.013 12.483V1.005A1.005 1.005 0 0023.013 0z" fill="url(#jira-grad)" />
        </svg>
      )
    case 'linear':
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="linear-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5E6AD2" />
              <stop offset="100%" stopColor="#7B7FE3" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="22" fill="url(#linear-grad)" />
          <path d="M22 64L36 78M22 50L50 78M22 36L64 78M30 26L74 70M44 22L78 56M58 22L78 42" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      )
    case 'teams':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <path d="M22 8.5h-7v-2c0-1.1.9-2 2-2h3a2 2 0 012 2v2z" fill="#5059C9" />
          <circle cx="18" cy="3" r="2" fill="#5059C9" />
          <path d="M3 6h11.5a1.5 1.5 0 011.5 1.5v9A4.5 4.5 0 0111.5 21h-3A4.5 4.5 0 014 16.5v-9A1.5 1.5 0 013 6z" fill="#7B83EB" />
          <path d="M3 6h11.5a1.5 1.5 0 011.5 1.5v9A4.5 4.5 0 0111.5 21h-3A4.5 4.5 0 014 16.5v-9A1.5 1.5 0 013 6z" fill="#7B83EB" />
          <text x="9.5" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill="white" fontFamily="Arial, sans-serif">T</text>
        </svg>
      )
    case 'sharepoint':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="9" r="6" fill="#036C70" />
          <circle cx="15" cy="13" r="5" fill="#1A9BA1" />
          <circle cx="11" cy="17" r="4" fill="#37C6D0" />
        </svg>
      )
    case 'sap':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="20" height="12" rx="2" fill="#0FAAFF" />
          <text x="12" y="14.5" textAnchor="middle" fontSize="6" fontWeight="700" fill="white" fontFamily="Arial, sans-serif">SAP</text>
        </svg>
      )
    default:
      return <Plug className={className} />
  }
}
