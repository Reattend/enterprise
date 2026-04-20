'use client'


import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ArrowRight, MessageSquare } from 'lucide-react'


// ─── FAQ data by category ────────────────────────────────
const categories = [
 {
   label: 'General',
   slug: 'general',
   questions: [
     {
       q: 'What is Reattend?',
       a: 'Reattend is your AI-powered memory layer. It connects to your tools - Gmail, Google Calendar, Google Meet, Slack - and automatically captures, organizes, and makes every decision, meeting, and insight searchable. Never lose context again.',
     },
     {
       q: 'Who is Reattend for?',
       a: 'Reattend is built for individuals and teams who lose track of decisions, context, and knowledge across tools. Whether you\'re a startup, a remote team, or a solo professional - if things fall through the cracks, Reattend helps.',
     },
     {
       q: 'How is Reattend different from Notion or Google Docs?',
       a: 'Notion and Google Docs require you to manually organize everything. Reattend captures automatically from your integrations, categorizes with AI, links related memories, and surfaces knowledge when you need it. It\'s a living memory - not a static document.',
     },
     {
       q: 'Do I need to install anything?',
       a: 'No installation needed. Reattend is a web app — sign up at reattend.com and start saving memories. Connect Notion to auto-sync your pages, or use the Chrome extension to capture from any web page. Import meeting transcripts from Read.ai, Fireflies, or Otter by dragging files into the Import tool.',
     },
   ],
 },
 {
   label: 'Pricing & Plans',
   slug: 'pricing',
   questions: [
     {
       q: 'How much does Reattend cost?',
       a: 'Reattend has a free forever plan - no trial clock, no credit card required. Free gives you unlimited memories, 20 AI queries per day, 1 integration of your choice, and 10 DeepThink sessions per day. Pro is $20/month for unlimited AI, all integrations, and unlimited recordings. Teams is $5/user/month.',
     },
     {
       q: 'Can I use Reattend for free?',
       a: 'Yes, forever. The Free plan never expires - no trial, no expiry, no credit card. You get unlimited memory storage, 20 AI queries per day, 1 integration of your choice, and 10 DeepThink sessions per day.',
     },
     {
       q: 'How does the Pro trial work?',
       a: 'Once you sign up, you can activate a 60-day free Pro trial from inside your dashboard - no credit card needed. At the end of the trial, pay $20/month to continue on Pro, or stay on the Free plan. Your memories are never deleted.',
     },
     {
       q: 'What payment methods do you accept?',
       a: 'We accept all major credit and debit cards. PayPal is also supported in select regions.',
     },
     {
       q: 'Can I cancel anytime?',
       a: 'Absolutely. No contracts, no commitments. Cancel from your settings at any time and you keep access until the end of your billing period. Downgrading to Free keeps all your memories intact.',
     },
   ],
 },
 {
   label: 'Features & Product',
   slug: 'features',
   questions: [
     {
       q: 'What does the AI actually do?',
       a: 'The AI triages incoming information from your integrations, auto-generates summaries and tags, extracts decisions and action items, links related memories together, and powers semantic search so you can ask questions in natural language.',
     },
     {
       q: 'What is the Knowledge Graph?',
       a: 'The Knowledge Graph is an interactive visualization that shows how your memories are connected. Decisions link to meetings, insights connect to projects - you can explore relationships visually and discover patterns you would otherwise miss.',
     },
     {
       q: 'What are Boards?',
       a: 'Boards are visual canvases where you can spatially arrange memories, add notes, draw connections, and collaborate visually. Think of it as a whiteboard overlay on top of your knowledge.',
     },
     {
       q: 'Can I search across all my memories?',
       a: 'Yes. On Pro and Teams you get semantic search - search by meaning, not just exact words. Ask "What did we decide about pricing?" and get relevant results instantly. The Free plan includes keyword search.',
     },
     {
       q: 'Does Reattend support teams?',
       a: 'Yes. The Teams plan gives every member full Pro features plus shared memory spaces, a team knowledge base, admin controls, and bulk onboarding. It\'s $5/user/month with a minimum of 3 users.',
     },
   ],
 },
 {
   label: 'Integrations',
   slug: 'integrations',
   questions: [
     {
       q: 'What integrations does Reattend support?',
       a: 'Currently live: Gmail, Google Calendar, Google Meet, and Slack. Coming soon: Discord, MS Teams, Zoom, Notion, GitHub, Linear, Jira, and more.',
     },
     {
       q: 'Are integrations included in the free plan?',
       a: 'The Free plan includes 1 integration of your choice - Gmail, Google Calendar, Google Meet, or Slack. Pro and Teams plans include all current and future integrations at no extra cost.',
     },
     {
       q: 'Can I request an integration?',
       a: 'Yes. Email us at pb@reattend.ai with your request. We prioritize integrations based on user demand, so let us know what tools you need.',
     },
     {
       q: 'How do integrations work?',
       a: 'Connect an integration from your dashboard and Reattend starts syncing automatically - emails from Gmail, events from Calendar, transcripts from Meet, messages from Slack. The AI organizes and links everything as it comes in.',
     },
   ],
 },
 {
   label: 'Security & Privacy',
   slug: 'security',
   questions: [
     {
       q: 'Is my data encrypted?',
       a: 'Yes. All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Your data is protected by industry-standard encryption at every level.',
     },
     {
       q: 'Does Reattend sell or share my data?',
       a: 'Never. Your data belongs to you. We do not sell, share, or use your data for advertising or to train models. Reattend only processes your data to deliver the service to you.',
     },
     {
       q: 'Is Reattend GDPR compliant?',
       a: 'Yes. You can export or delete all your data at any time. We collect only the minimum data required to deliver the service and process it in line with GDPR requirements.',
     },
     {
       q: 'Can I delete all my data?',
       a: 'Yes. Delete your account and all associated data at any time from your settings. Deletion is permanent and we purge everything from our systems.',
     },
     {
       q: 'Where is my data stored?',
       a: 'Your data is stored on secure, encrypted servers hosted on SOC 2-certified infrastructure. We use isolated databases per workspace to ensure complete data separation. All connections use TLS 1.3 encryption.',
     },
   ],
 },
 {
   label: 'Getting Started',
   slug: 'getting-started',
   questions: [
     {
       q: 'How do I get started?',
       a: 'Sign up at reattend.com - no download needed. Connect your first integration (Gmail, Google Calendar, Google Meet, or Slack) and Reattend starts capturing automatically. You can also install the Chrome extension for even more coverage.',
     },
     {
       q: 'How do I add team members?',
       a: 'Go to Settings in your workspace, then Invite Members. Enter their email addresses and assign roles. They will receive an invitation to join your workspace.',
     },
     {
       q: 'What should I capture first?',
       a: 'Connect Gmail or Google Calendar first - these give you the richest starting memory. From there, add Meet for meeting transcripts and Slack for team conversations. The AI starts linking everything together automatically.',
     },
     {
       q: 'Can I import existing data?',
       a: 'Currently you can capture data through integrations or manually. Bulk import for common formats is on the roadmap. For specific needs, contact us at pb@reattend.ai.',
     },
   ],
 },
]


export default function FaqContent() {
 const [activeCategory, setActiveCategory] = useState('general')
 const [openQuestion, setOpenQuestion] = useState<string | null>(null)


 const currentCategory = categories.find(c => c.slug === activeCategory) || categories[0]


 const toggleQuestion = (q: string) => {
   setOpenQuestion(prev => prev === q ? null : q)
 }


 return (
   <main className="relative py-16 md:py-24 px-5 overflow-hidden">
     {/* Background */}
     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/6 via-[#818CF8]/4 to-transparent blur-3xl pointer-events-none" />


     <div className="relative z-10 max-w-[1100px] mx-auto">
       {/* Header */}
       <div className="mb-14">
         <motion.h1
           initial={{ opacity: 0, y: 12 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.08]"
         >
           Frequently Asked
           <br />
           Questions
         </motion.h1>
       </div>


       {/* Two-column layout */}
       <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
         {/* Left - Category navigation */}
         <motion.nav
           initial={{ opacity: 0, x: -16 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.1 }}
           className="lg:w-[280px] shrink-0"
         >
           <div className="lg:sticky lg:top-[100px] space-y-1">
             {categories.map((cat) => {
               const isActive = activeCategory === cat.slug
               return (
                 <button
                   key={cat.slug}
                   onClick={() => { setActiveCategory(cat.slug); setOpenQuestion(null) }}
                   className={`w-full text-left px-4 py-3 rounded-xl text-[15px] font-medium transition-all flex items-center gap-2.5 ${
                     isActive
                       ? 'bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[#1a1a2e]'
                       : 'text-gray-500 hover:text-[#1a1a2e] hover:bg-white/40'
                   }`}
                 >
                   {isActive && (
                     <span className="text-[#4F46E5]">
                       <ArrowRight className="w-4 h-4" />
                     </span>
                   )}
                   {cat.label}
                 </button>
               )
             })}


             {/* Contact link */}
             <div className="pt-6 mt-6 border-t border-gray-200/50">
               <p className="text-[13px] text-gray-400 mb-2">Still have questions?</p>
               <a
                 href="mailto:pb@reattend.ai"
                 className="inline-flex items-center gap-2 text-[14px] font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors"
               >
                 <MessageSquare className="w-4 h-4" />
                 Contact us
               </a>
             </div>
           </div>
         </motion.nav>


         {/* Right - Questions accordion */}
         <motion.div
           initial={{ opacity: 0, y: 16 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.15 }}
           className="flex-1 min-w-0"
         >
           <div className="divide-y divide-gray-200/60">
             {currentCategory.questions.map((item) => {
               const isOpen = openQuestion === item.q
               return (
                 <div key={item.q}>
                   <button
                     onClick={() => toggleQuestion(item.q)}
                     className={`w-full flex items-center justify-between gap-4 py-5 text-left transition-colors group ${
                       isOpen ? 'text-[#1a1a2e]' : 'text-gray-600 hover:text-[#1a1a2e]'
                     }`}
                   >
                     <span className="text-[15px] md:text-[16px] font-semibold leading-snug pr-4">
                       {item.q}
                     </span>
                     <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                       isOpen
                         ? 'bg-[#4F46E5] text-white'
                         : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                     }`}>
                       {isOpen ? (
                         <X className="w-3.5 h-3.5" />
                       ) : (
                         <Plus className="w-3.5 h-3.5" />
                       )}
                     </span>
                   </button>
                   <AnimatePresence initial={false}>
                     {isOpen && (
                       <motion.div
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         transition={{ duration: 0.25, ease: 'easeInOut' }}
                         className="overflow-hidden"
                       >
                         <div className="pb-6 pr-12">
                           <p className="text-[14px] md:text-[15px] text-gray-500 leading-relaxed">
                             {item.a}
                           </p>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>
               )
             })}
           </div>
         </motion.div>
       </div>


       {/* CTA */}
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         whileInView={{ opacity: 1, y: 0 }}
         viewport={{ once: true }}
         className="mt-20 text-center"
       >
         <h2 className="text-[24px] md:text-[32px] font-bold tracking-[-0.02em]">
           Ready to try Reattend?
         </h2>
         <p className="text-gray-500 text-[15px] mt-3 max-w-md mx-auto">
           Free forever. No credit card required.
         </p>
         <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
           <Link
             href="/register"
             className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
           >
             Get started free <ArrowRight className="w-4 h-4" />
           </Link>
           <Link
             href="/pricing"
             className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/40 text-[#4F46E5] font-bold text-[14px] transition-colors"
           >
             View pricing <ArrowRight className="w-4 h-4" />
           </Link>
         </div>
       </motion.div>
     </div>
   </main>
 )
}



