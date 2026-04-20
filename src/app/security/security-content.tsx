'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield,
  Lock,
  Eye,
  Server,
  FileKey,
  UserCheck,
  Globe,
  Trash2,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Database,
  KeyRound,
  Fingerprint,
} from 'lucide-react'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' as any },
}

// ─── Hero badges (floating) ────────────────────────────
function FloatingBadge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className={`absolute hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.05)] text-[12px] font-medium text-gray-600 ${className}`}
    >
      {children}
    </motion.div>
  )
}

// ─── Core principles ────────────────────────────────────
const principles = [
  {
    icon: Lock,
    title: 'Encrypted Everywhere',
    description: 'AES-256 encryption at rest and TLS 1.3 in transit. Your data is never stored in plain text.',
    color: 'bg-violet-500/10 text-violet-600',
  },
  {
    icon: Eye,
    title: 'Zero Data Selling',
    description: 'We never sell, share, or monetize your data. Your memories belong to you, period.',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: Server,
    title: 'Isolated Workspaces',
    description: 'Each workspace has complete data isolation. No cross-tenant data leakage, ever.',
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    icon: FileKey,
    title: 'SOC 2-Ready Architecture',
    description: 'Built from day one with SOC 2 Type II controls in mind. Audit trails for every action.',
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    icon: UserCheck,
    title: 'GDPR Compliant',
    description: 'Full GDPR compliance with data portability, right to erasure, and minimal data collection.',
    color: 'bg-pink-500/10 text-pink-600',
  },
  {
    icon: Globe,
    title: 'Secure Infrastructure',
    description: 'Hosted on SOC 2-certified data centers with automated daily backups and high-availability architecture.',
    color: 'bg-cyan-500/10 text-cyan-600',
  },
]

// ─── How we protect ─────────────────────────────────────
const protections = [
  {
    icon: ShieldCheck,
    label: 'Authentication',
    items: [
      'Secure OTP-based passwordless login',
      'JWT tokens with short expiry windows',
      'Session management with automatic invalidation',
      'Role-based access controls (Owner, Admin, Member)',
    ],
  },
  {
    icon: Database,
    label: 'Data Protection',
    items: [
      'AES-256 encryption for all stored data',
      'TLS 1.3 for all data in transit',
      'Isolated databases per workspace',
      'Automated daily encrypted backups',
    ],
  },
  {
    icon: KeyRound,
    label: 'Access Control',
    items: [
      'Workspace-level permission system',
      'Integration tokens are encrypted and scoped',
      'Admin audit logs for all operations',
      'API rate limiting and abuse prevention',
    ],
  },
  {
    icon: Fingerprint,
    label: 'Privacy by Design',
    items: [
      'Minimal data collection, only what\'s needed',
      'No third-party tracking or analytics SDKs',
      'AI processing uses your data only for your team',
      'Full data export and deletion on request',
    ],
  },
]

// ─── Compliance items ───────────────────────────────────
const compliance = [
  { label: 'GDPR', description: 'EU General Data Protection Regulation' },
  { label: 'SOC 2', description: 'Service Organization Control (Type II ready)' },
  { label: 'CCPA', description: 'California Consumer Privacy Act' },
  { label: 'HIPAA', description: 'Health Insurance Portability (roadmap)' },
]

export default function SecurityContent() {
  return (
    <main className="relative overflow-hidden">
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 px-5">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />
        <div className="absolute top-20 -right-40 w-[400px] h-[400px] rounded-full bg-emerald-500/4 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-[800px] mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5]"
          >
            <Shield className="w-3.5 h-3.5" />
            Security & Privacy
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-[36px] md:text-[56px] font-bold tracking-[-0.03em] leading-[1.08] mt-6"
          >
            Your Data,{' '}
            <span className="text-[#4F46E5]">Protected</span>
            <br className="hidden md:block" />
            {' '}With Complete Privacy.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-[16px] md:text-[18px] mt-5 max-w-[580px] mx-auto leading-relaxed"
          >
            Harness the power of AI-driven team memory while ensuring your data remains secure, private, and fully protected.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              <ArrowRight className="w-4 h-4" />
              Get Started
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/40 text-[#4F46E5] font-bold text-[14px] transition-colors"
            >
              Read Privacy Policy
            </Link>
          </motion.div>

          {/* Floating badges */}
          <FloatingBadge className="top-20 left-0 md:left-4 lg:left-0">
            <Lock className="w-3.5 h-3.5 text-[#4F46E5]" />
            ENCRYPTED.
          </FloatingBadge>
          <FloatingBadge className="top-32 right-0 md:right-4 lg:right-0">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            SECURE.
          </FloatingBadge>
          <FloatingBadge className="bottom-12 left-8 md:left-16">
            <Eye className="w-3.5 h-3.5 text-pink-500" />
            PRIVATE.
          </FloatingBadge>
        </div>
      </section>

      {/* ─── Core Security Principles ─────────────────────── */}
      <section className="py-16 md:py-24 px-5">
        <div className="max-w-[1200px] mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4F46E5]/15 bg-white/60 text-[12px] font-medium text-[#4F46E5] uppercase tracking-wider">
              Principles
            </span>
            <h2 className="text-[28px] md:text-[40px] font-bold tracking-[-0.02em] leading-[1.1] mt-5">
              Security Built Into{' '}
              <span className="text-[#4F46E5]">Every Layer</span>
            </h2>
            <p className="text-gray-500 text-[15px] mt-3 max-w-[520px] mx-auto">
              From encryption to compliance, every aspect of Reattend is designed with security-first thinking.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {principles.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="group bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_rgba(79,70,229,0.08)] hover:border-[#4F46E5]/15 transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl ${item.color.split(' ')[0]} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${item.color.split(' ')[1]}`} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1a1a2e] mb-2">{item.title}</h3>
                  <p className="text-[14px] text-gray-500 leading-relaxed">{item.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── How We Protect Your Data ─────────────────────── */}
      <section className="py-16 md:py-24 px-5">
        <div className="max-w-[1100px] mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4F46E5]/15 bg-white/60 text-[12px] font-medium text-[#4F46E5] uppercase tracking-wider">
              Protection
            </span>
            <h2 className="text-[28px] md:text-[40px] font-bold tracking-[-0.02em] leading-[1.1] mt-5">
              How We <span className="text-[#4F46E5]">Protect</span> Your Data
            </h2>
            <p className="text-gray-500 text-[15px] mt-3 max-w-[500px] mx-auto">
              Multiple layers of defense ensure your team&apos;s knowledge stays safe at every level.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {protections.map((section, i) => {
              const Icon = section.icon
              return (
                <motion.div
                  key={section.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#4F46E5]" />
                    </div>
                    <h3 className="text-[17px] font-bold text-[#1a1a2e]">{section.label}</h3>
                  </div>
                  <ul className="space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-[14px] text-gray-600 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Compliance & Standards ────────────────────────── */}
      <section className="py-16 md:py-24 px-5">
        <div className="max-w-[900px] mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4F46E5]/15 bg-white/60 text-[12px] font-medium text-[#4F46E5] uppercase tracking-wider">
              Compliance
            </span>
            <h2 className="text-[28px] md:text-[40px] font-bold tracking-[-0.02em] leading-[1.1] mt-5">
              Standards We <span className="text-[#4F46E5]">Follow</span>
            </h2>
            <p className="text-gray-500 text-[15px] mt-3 max-w-[480px] mx-auto">
              Reattend is built to meet the compliance requirements of security-conscious teams.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {compliance.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(79,70,229,0.06)] transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6 text-[#4F46E5]" />
                </div>
                <h3 className="text-[18px] font-bold text-[#1a1a2e]">{item.label}</h3>
                <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Your Data Rights ─────────────────────────────── */}
      <section className="py-16 md:py-24 px-5">
        <div className="max-w-[800px] mx-auto">
          <motion.div
            {...fadeUp}
            className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] p-8 md:p-12"
          >
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4F46E5]/15 bg-white/60 text-[12px] font-medium text-[#4F46E5] uppercase tracking-wider">
                Your Rights
              </span>
              <h2 className="text-[24px] md:text-[32px] font-bold tracking-[-0.02em] leading-[1.1] mt-4">
                You Own Your Data. <span className="text-[#4F46E5]">Always.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { icon: FileKey, title: 'Export Anytime', desc: 'Download all your data in a standard format whenever you want.' },
                { icon: Trash2, title: 'Delete Everything', desc: 'Request full data deletion. We purge it from all systems.' },
                { icon: Eye, title: 'Know What We Store', desc: 'Full transparency on what data we collect and why.' },
                { icon: UserCheck, title: 'Consent-Based', desc: 'We only process data you explicitly choose to share with Reattend.' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-[#4F46E5]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#1a1a2e]">{item.title}</h4>
                      <p className="text-[13px] text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-5">
        <motion.div
          {...fadeUp}
          className="max-w-[700px] mx-auto text-center"
        >
          <h2 className="text-[24px] md:text-[36px] font-bold tracking-[-0.02em]">
            Ready to build your team&apos;s
            <br className="hidden sm:block" />
            <span className="text-[#4F46E5]"> secure shared memory?</span>
          </h2>
          <p className="text-gray-500 text-[15px] mt-3 max-w-md mx-auto">
            Start free. Your data stays yours. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/40 text-[#4F46E5] font-bold text-[14px] transition-colors"
            >
              Explore features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
