'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  DollarSign,
  Users,
  Clock,
  Calendar,
  TrendingUp,
  ChevronDown,
  Brain,
  AlertTriangle,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <GlassCard className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-[15px] font-semibold text-[#1a1a2e] pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#4F46E5] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1 text-[14px] text-[#444] leading-relaxed">{answer}</div>
      )}
    </GlassCard>
  )
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`
  return `$${Math.round(amount).toLocaleString()}`
}

interface Props {
  faqItems: Array<{ question: string; answer: string }>
}

export function MeetingCostCalculator({ faqItems }: Props) {
  const [attendees, setAttendees] = useState(5)
  const [avgSalary, setAvgSalary] = useState(80000)
  const [durationMin, setDurationMin] = useState(60)
  const [meetingsPerWeek, setMeetingsPerWeek] = useState(8)
  const [calculated, setCalculated] = useState(false)

  const hourlyRate = avgSalary / 2080
  const costPerMeeting = attendees * hourlyRate * (durationMin / 60)
  const weeklyCost = costPerMeeting * meetingsPerWeek
  const monthlyCost = weeklyCost * 4.33
  const yearlyCost = weeklyCost * 52
  const contextSwitchMin = 23
  const lostProductivityHoursWeek = (meetingsPerWeek * contextSwitchMin) / 60
  const lostProductivityCostYear = lostProductivityHoursWeek * hourlyRate * attendees * 52
  const totalYearlyCost = yearlyCost + lostProductivityCostYear
  const meetingHoursWeek = (meetingsPerWeek * durationMin) / 60
  const meetingPercent = Math.round((meetingHoursWeek / 40) * 100)

  function handleCalculate() {
    setCalculated(true)
  }

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-8 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <DollarSign className="w-3.5 h-3.5" />
            Free tool
          </span>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1]">
            Meeting Cost <span className="text-[#4F46E5]">Calculator</span>
          </h1>
          <p className="text-gray-500 mt-4 text-[15px] max-w-xl mx-auto">
            Find out how much your team really spends in meetings. Enter your numbers below and see the true cost.
          </p>
        </motion.div>
      </section>

      {/* Calculator */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-2xl mx-auto">
          <GlassCard className="p-6 md:p-8">
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Attendees */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#4F46E5]" />
                  Average attendees per meeting
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={attendees}
                  onChange={e => setAttendees(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                />
              </div>

              {/* Average salary */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#4F46E5]" />
                  Average annual salary ($)
                </label>
                <input
                  type="number"
                  min={10000}
                  step={5000}
                  value={avgSalary}
                  onChange={e => setAvgSalary(Math.max(10000, parseInt(e.target.value) || 10000))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#4F46E5]" />
                  Average meeting duration (min)
                </label>
                <select
                  value={durationMin}
                  onChange={e => setDurationMin(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              {/* Meetings per week */}
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#4F46E5]" />
                  Meetings per week
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={meetingsPerWeek}
                  onChange={e => setMeetingsPerWeek(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <button
              onClick={handleCalculate}
              className="mt-6 w-full py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[15px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              Calculate meeting cost
            </button>
          </GlassCard>
        </div>
      </section>

      {/* Results */}
      {calculated && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 px-5 pb-16"
        >
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Big numbers */}
            <GlassCard className="p-6 md:p-8">
              <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-5">
                Direct Meeting Cost
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[13px] text-gray-500 mb-1">Per week</div>
                  <div className="text-xl md:text-2xl font-bold text-[#1a1a2e]">{formatCurrency(weeklyCost)}</div>
                </div>
                <div>
                  <div className="text-[13px] text-gray-500 mb-1">Per month</div>
                  <div className="text-xl md:text-2xl font-bold text-[#1a1a2e]">{formatCurrency(monthlyCost)}</div>
                </div>
                <div>
                  <div className="text-[13px] text-gray-500 mb-1">Per year</div>
                  <div className="text-xl md:text-2xl font-bold text-[#4F46E5]">{formatCurrency(yearlyCost)}</div>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-gray-600">Cost per meeting</span>
                  <span className="font-semibold">{formatCurrency(costPerMeeting)}</span>
                </div>
                <div className="flex items-center justify-between text-[14px] mt-2">
                  <span className="text-gray-600">Hourly rate per person</span>
                  <span className="font-semibold">${hourlyRate.toFixed(2)}/hr</span>
                </div>
              </div>
            </GlassCard>

            {/* Context switching cost */}
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#1a1a2e]">Hidden cost: context switching</h2>
                  <p className="text-[13px] text-gray-500 mt-1">
                    Research shows it takes ~23 minutes to fully refocus after a meeting. That is an extra{' '}
                    <strong>{lostProductivityHoursWeek.toFixed(1)} hours/week</strong> of lost focus time.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3">
                <span className="text-[14px] font-medium text-amber-800">Lost productivity cost per year</span>
                <span className="text-lg font-bold text-amber-700">{formatCurrency(lostProductivityCostYear)}</span>
              </div>
            </GlassCard>

            {/* Total */}
            <div className="rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-6 md:p-8 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-white/80" />
                  <h2 className="text-[15px] font-bold">Total annual meeting cost</h2>
                </div>
                <div className="text-2xl md:text-3xl font-bold">{formatCurrency(totalYearlyCost)}</div>
              </div>
              <div className="text-[13px] text-white/70 mb-4">
                Your team spends <strong className="text-white">{meetingHoursWeek.toFixed(1)} hours/week</strong> in meetings,
                which is <strong className="text-white">{meetingPercent}%</strong> of a 40-hour work week.
                {meetingPercent > 20 && (
                  <span> That is above the recommended 20% threshold.</span>
                )}
              </div>
              <div className="border-t border-white/20 pt-4 space-y-2">
                <h3 className="text-[13px] font-semibold text-white/90 mb-2">Quick wins to reduce meeting cost:</h3>
                <p className="text-[13px] text-white/70">
                  1. Cut default meeting length from 60 to 30 minutes (saves {formatCurrency(yearlyCost * 0.5)}/year)
                </p>
                <p className="text-[13px] text-white/70">
                  2. Remove 1 unnecessary attendee per meeting (saves {formatCurrency(yearlyCost / attendees)}/year)
                </p>
                <p className="text-[13px] text-white/70">
                  3. Make 2 meetings per week async (saves {formatCurrency((costPerMeeting * 2) * 52)}/year)
                </p>
              </div>
            </div>

            {/* Reattend CTA */}
            <GlassCard className="p-6 md:p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-[#4F46E5]" />
              </div>
              <h2 className="text-[17px] font-bold text-[#1a1a2e] mb-2">Make every meeting count</h2>
              <p className="text-[14px] text-gray-500 mb-5 max-w-md mx-auto">
                Reattend captures decisions and action items from meetings so your team never re-discusses the same thing twice. Save hours every week.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
              >
                Try Reattend free <ArrowRight className="w-4 h-4" />
              </Link>
            </GlassCard>
          </div>
        </motion.section>
      )}

      {/* FAQ */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[22px] font-bold text-center mb-6">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <FAQItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
