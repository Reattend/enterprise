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
       a: 'Reattend is a memory layer for individuals and teams. It captures the decisions, notes and context you come across while you work, organizes and links them with AI, and answers questions from that memory with the source attached.',
     },
     {
       q: 'Who is Reattend for?',
       a: 'Anyone who loses track of what was decided and why. Individuals use a personal account as a second brain. Teams use a shared workspace so knowledge stays when people move on, with roles, SSO and an audit log.',
     },
     {
       q: 'How is Reattend different from Notion or Google Docs?',
       a: 'Notion and Google Docs rely on you to write things down and keep them organized. Reattend captures as you work, organizes with AI, links related memories together, and answers questions with a citation back to the original. It is a living memory, not a static document.',
     },
     {
       q: 'Do I need to install anything?',
       a: 'No. Reattend is a web app - sign up at reattend.com and start capturing. For capture from any web page, add the Reattend extension from the Chrome Web Store.',
     },
   ],
 },
 {
   label: 'Pricing & Plans',
   slug: 'pricing',
   questions: [
     {
       q: 'How much does Reattend cost?',
       a: 'Free forever if you connect your own AI provider key - you pay the provider directly and we bill nothing. If you would rather we run the AI, a personal account is $9 a month for up to 800 questions. Team workspaces are $19 per seat per month, or $182.40 per seat per year. Government and on-premise deployments are quoted.',
     },
     {
       q: 'Can I use Reattend for free?',
       a: 'Yes, forever. Connect your own AI provider key and answers and AI organization run on your key at no charge from us. Without a key you can still capture and store memories; answers need either a key or a paid plan.',
     },
     {
       q: 'How does the free trial work?',
       a: 'Personal accounts get a 7-day free trial of the managed plan, and team workspaces get 15 days. No card is needed to start. If you do not continue, the account moves back to the free plan and your memories are kept.',
     },
     {
       q: 'What payment methods do you accept?',
       a: 'Payments are handled by Paddle, which accepts major credit and debit cards and other local payment methods depending on your region.',
     },
     {
       q: 'Can I cancel anytime?',
       a: 'Yes. There are no contracts. If you cancel, you move back to the free plan and your memories stay intact.',
     },
   ],
 },
 {
   label: 'Features & Product',
   slug: 'features',
   questions: [
     {
       q: 'What does the AI actually do?',
       a: 'It titles and tags what you capture, picks out decisions and tasks, links related memories together, and answers questions in plain language with a citation to the memory each answer came from.',
     },
     {
       q: 'What is Landscape?',
       a: 'Landscape is a board view of your memory. You can see how memories connect, arrange them spatially, and draw a link between two memories and choose what the relationship is.',
     },
     {
       q: 'Can I search across all my memories?',
       a: 'Yes. Search works by meaning as well as by exact words, so you can ask "What did we decide about pricing?" and find the relevant memories even if they never use those words.',
     },
     {
       q: 'Does Reattend support teams?',
       a: 'Yes. A team workspace gives everyone shared memory with role-based access, so each person only ever sees what they are allowed to. It includes SSO, an audit log and admin controls at $19 per seat per month.',
     },
   ],
 },
 {
   label: 'Integrations',
   slug: 'integrations',
   questions: [
     {
       q: 'What integrations does Reattend support?',
       a: 'Everyone can capture through the Chrome extension, directly in the app, or through the capture API. Team workspaces can connect Gmail, Google Drive, Slack, Notion and Confluence, switched on per workspace. Connectors for personal accounts are coming soon.',
     },
     {
       q: 'Can I use my memory inside other AI assistants?',
       a: 'Yes. Reattend runs as an MCP server, so AI assistants that support the Model Context Protocol can search and add to your memory. See the MCP page for setup.',
     },
     {
       q: 'Can I request an integration?',
       a: 'Yes. Email pb@reattend.ai with the tool you need. We prioritize connectors based on what people ask for.',
     },
     {
       q: 'Can I send data to Reattend from my own scripts?',
       a: 'Yes. Generate an API key on the Extension page and POST text to the capture API. It arrives like any other capture and the AI organizes it. The help center has the details.',
     },
   ],
 },
 {
   label: 'Security & Privacy',
   slug: 'security',
   questions: [
     {
       q: 'Is my data encrypted?',
       a: 'All traffic to Reattend is encrypted in transit with TLS. Credentials you give us, such as AI provider keys and SSO secrets, are additionally encrypted with AES-256-GCM before they are stored. The Compliance page lists every control with its real status.',
     },
     {
       q: 'Does Reattend sell or share my data?',
       a: 'Never. Your data belongs to you. We do not sell, share, or use your data for advertising or to train models. Reattend only processes your data to deliver the service to you.',
     },
     {
       q: 'Can I export or delete my data?',
       a: 'Yes. You can export your data and delete your account from settings. Account deletion is permanent.',
     },
     {
       q: 'Where is my data stored?',
       a: 'In a single United States region. Every search and answer is filtered by permissions before the AI sees anything, so nobody is shown a memory they are not allowed to see. Dedicated regional or on-premise deployments are available for government and regulated organizations.',
     },
   ],
 },
 {
   label: 'Getting Started',
   slug: 'getting-started',
   questions: [
     {
       q: 'How do I get started?',
       a: 'Sign up at reattend.com, then either connect your own AI provider key or start the free trial of the managed plan. Add the Chrome extension to capture from any page, and start saving what matters.',
     },
     {
       q: 'How do I add team members?',
       a: 'In a team workspace, an admin opens Members and invites people by email, choosing a role for each. They receive an invitation to join.',
     },
     {
       q: 'What should I capture first?',
       a: 'Start with decisions: what was decided, who decided it and why. Those are the memories people most often need later and can least reconstruct. Pages and passages you keep coming back to are a good second.',
     },
     {
       q: 'Can I import existing data?',
       a: 'You can capture through the app, the extension or the capture API. For a larger one-off import, email pb@reattend.ai and we will help.',
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



