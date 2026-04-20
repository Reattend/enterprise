'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { Copy, Check } from 'lucide-react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-gray-400 hover:text-white"
      aria-label="Copy code"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative mt-3">
      <pre className="bg-[#0f1117] border border-white/10 rounded-xl p-4 text-[13px] text-gray-300 overflow-x-auto leading-relaxed font-mono">
        <code>{code.trim()}</code>
      </pre>
      <CopyButton text={code.trim()} />
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${color}`}>
      {label}
    </span>
  )
}

const endpoints = [
  {
    id: 'capture',
    method: 'POST',
    path: '/api/tray/capture',
    summary: 'Save a memory',
    description: 'Save any text to your Reattend memory. Supports deduplication — if you send the same content twice within a short window, the second call is a no-op.',
    auth: true,
    request: {
      fields: [
        { name: 'text', type: 'string', required: true, desc: 'The content to save. Min 15 characters.' },
        { name: 'source', type: 'string', required: false, desc: 'Label for the source. Defaults to "api". Examples: "github", "slack", "notion".' },
        { name: 'metadata', type: 'object', required: false, desc: 'Arbitrary key/value pairs attached to the memory. Shown in the detail view.' },
      ],
    },
    example: `curl -X POST https://reattend.com/api/tray/capture \\
  -H "Authorization: Bearer rat_your_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Decided to migrate auth to Clerk. Reason: better session management and built-in MFA.",
    "source": "notion",
    "metadata": { "page": "Architecture Decisions", "author": "partha" }
  }'`,
    response: `{
  "status": "saved",      // "saved" | "deduped" | "filtered"
  "id": "rec_abc123"
}`,
  },
  {
    id: 'search',
    method: 'GET',
    path: '/api/tray/search',
    summary: 'Search memories',
    description: 'Semantic search over your memory. Returns the most relevant results using vector similarity.',
    auth: true,
    request: {
      fields: [
        { name: 'q', type: 'string', required: true, desc: 'Search query.' },
        { name: 'limit', type: 'number', required: false, desc: 'Max results. Defaults to 10, max 50.' },
      ],
    },
    example: `curl "https://reattend.com/api/tray/search?q=auth+decisions&limit=5" \\
  -H "Authorization: Bearer rat_your_token"`,
    response: `{
  "results": [
    {
      "id": "rec_abc123",
      "title": "Auth migration decision",
      "summary": "Decided to migrate auth to Clerk for better session management.",
      "type": "decision",
      "source": "notion",
      "createdAt": "2025-03-20T10:00:00.000Z",
      "score": 0.91
    }
  ]
}`,
  },
  {
    id: 'ask',
    method: 'GET',
    path: '/api/tray/ask',
    summary: 'Ask a question',
    description: 'Ask a natural-language question and get an AI answer grounded in your saved memories. Uses RAG — retrieves relevant context, then generates a response.',
    auth: true,
    request: {
      fields: [
        { name: 'q', type: 'string', required: true, desc: 'The question to answer.' },
      ],
    },
    example: `curl "https://reattend.com/api/tray/ask?q=Why+did+we+choose+Clerk+for+auth%3F" \\
  -H "Authorization: Bearer rat_your_token"`,
    response: `{
  "answer": "You chose Clerk for auth because it offers better session management and built-in MFA support, as noted in your architecture decisions from March 2025.",
  "sources": [
    {
      "id": "rec_abc123",
      "title": "Auth migration decision",
      "createdAt": "2025-03-20T10:00:00.000Z"
    }
  ]
}`,
  },
  {
    id: 'recent',
    method: 'GET',
    path: '/api/tray/recent',
    summary: 'Get recent memories',
    description: 'Returns the most recently saved memories, sorted by creation time descending.',
    auth: true,
    request: {
      fields: [
        { name: 'limit', type: 'number', required: false, desc: 'Number of results. Defaults to 10, max 50.' },
      ],
    },
    example: `curl "https://reattend.com/api/tray/recent?limit=20" \\
  -H "Authorization: Bearer rat_your_token"`,
    response: `{
  "memories": [
    {
      "id": "rec_xyz789",
      "title": "Weekly standup — March 27",
      "summary": "Discussed Q2 roadmap, auth migration, and API docs.",
      "type": "meeting",
      "source": "slack",
      "createdAt": "2025-03-27T09:00:00.000Z"
    }
  ]
}`,
  },
]

const errorTable = [
  { code: '400', meaning: 'Bad request — missing or invalid parameters.' },
  { code: '401', meaning: 'Unauthorized — missing or invalid token.' },
  { code: '429', meaning: 'Rate limited — too many requests.' },
  { code: '500', meaning: 'Server error.' },
]

const statusCodes = [
  { code: 'saved', meaning: 'Memory was saved successfully.' },
  { code: 'deduped', meaning: 'Identical or near-identical content was already saved recently. No duplicate created.' },
  { code: 'filtered', meaning: 'Content was too short or low-signal. Not saved.' },
]

export function DocsContent() {

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-[1100px] mx-auto px-5 pt-20 pb-24">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">API Reference</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Reattend REST API</h1>
          <p className="text-lg text-gray-500 max-w-xl">
            Capture, search, and query your memory programmatically. Four endpoints. One auth header.
          </p>
          <div className="flex items-center gap-4 mt-5">
            <span className="text-sm text-gray-500">Base URL:</span>
            <code className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-lg font-mono">https://reattend.com</code>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
          {/* Sidebar nav */}
          <nav className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3 px-2">Sections</p>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'auth', label: 'Authentication' },
                ...endpoints.map(e => ({ id: e.id, label: e.summary })),
                { id: 'errors', label: 'Errors' },
                { id: 'sdks', label: 'SDKs & Tools' },
              ].map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="space-y-16 min-w-0">

            {/* Overview */}
            <section id="overview">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                The Reattend API lets you capture anything to your memory, search it semantically, and ask questions grounded in what you&apos;ve saved. It&apos;s the same API used by the <Link href="/mcp" className="text-indigo-600 hover:underline">MCP server</Link> and <Link href="/mcp#github-action" className="text-indigo-600 hover:underline">GitHub Action</Link>.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {endpoints.map(e => (
                  <a key={e.id} href={`#${e.id}`} className="flex flex-col gap-1 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors group">
                    <Badge label={e.method} color={e.method === 'POST' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} />
                    <span className="text-xs font-medium text-gray-700 mt-1 group-hover:text-indigo-700">{e.summary}</span>
                    <code className="text-[10px] text-gray-400 font-mono truncate">{e.path}</code>
                  </a>
                ))}
              </div>
            </section>

            {/* Auth */}
            <section id="auth">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                All endpoints require a Bearer token. Get yours from{' '}
                <Link href="/app/settings" className="text-indigo-600 hover:underline">Settings → API Token</Link>.
                Tokens start with <code className="text-sm bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">rat_</code>.
              </p>
              <CodeBlock code={`Authorization: Bearer rat_your_token_here`} />
              <p className="text-sm text-gray-500 mt-3">Tokens are workspace-scoped. Keep them secret — treat them like a password.</p>
            </section>

            {/* Endpoints */}
            {endpoints.map((ep) => (
              <section key={ep.id} id={ep.id}>
                <div className="flex items-center gap-3 mb-3">
                  <Badge
                    label={ep.method}
                    color={ep.method === 'POST' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}
                  />
                  <code className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">{ep.path}</code>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{ep.summary}</h2>
                <p className="text-gray-600 leading-relaxed mb-5">{ep.description}</p>

                {/* Parameters */}
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {ep.method === 'POST' ? 'Request body' : 'Query parameters'}
                </h3>
                <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Parameter</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Required</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ep.request.fields.map(f => (
                        <tr key={f.name}>
                          <td className="px-4 py-3">
                            <code className="text-[12px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{f.name}</code>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs font-mono">{f.type}</td>
                          <td className="px-4 py-3">
                            {f.required
                              ? <span className="text-[11px] font-semibold text-red-500">required</span>
                              : <span className="text-[11px] text-gray-400">optional</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{f.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Example */}
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Example request</h3>
                <CodeBlock code={ep.example} />

                <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-1">Response</h3>
                <CodeBlock code={ep.response} />
              </section>
            ))}

            {/* Capture status codes */}
            <section id="errors">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Errors</h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden mb-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">HTTP status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {errorTable.map(e => (
                      <tr key={e.code}>
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-700">{e.code}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{e.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-semibold text-gray-800 mb-3">Capture status codes</h3>
              <p className="text-sm text-gray-500 mb-3">A 200 response from <code className="font-mono text-xs bg-gray-100 px-1 rounded">/api/tray/capture</code> includes a <code className="font-mono text-xs bg-gray-100 px-1 rounded">status</code> field:</p>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {statusCodes.map(s => (
                      <tr key={s.code}>
                        <td className="px-4 py-3">
                          <code className="text-[12px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{s.code}</code>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{s.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SDKs */}
            <section id="sdks">
              <h2 className="text-xl font-bold text-gray-900 mb-4">SDKs &amp; Tools</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link href="/mcp" className="group block p-5 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                  <p className="font-semibold text-gray-900 group-hover:text-indigo-700 mb-1">MCP Server</p>
                  <p className="text-sm text-gray-500">Use Reattend from Claude Desktop, Cursor, Windsurf, or any MCP-compatible AI tool.</p>
                  <code className="text-xs font-mono text-gray-400 mt-2 block">npx @reattend/mcp --token rat_...</code>
                </Link>
                <Link href="/mcp#github-action" className="group block p-5 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                  <p className="font-semibold text-gray-900 group-hover:text-indigo-700 mb-1">GitHub Action</p>
                  <p className="text-sm text-gray-500">Auto-save every PR, push, and release to memory without writing a single line of code.</p>
                  <code className="text-xs font-mono text-gray-400 mt-2 block">uses: Reattend/reattend-action@v1</code>
                </Link>
              </div>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
