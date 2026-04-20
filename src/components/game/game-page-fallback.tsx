import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

interface GamePageFallbackProps {
  title: string
  description: string
  steps: string[]
}

export function GamePageFallback({ title, description, steps }: GamePageFallbackProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-[800px] mx-auto px-5 pt-16 pb-24">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4F46E5]/8 text-[#4F46E5] text-[13px] font-semibold mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
            Free Team Game
          </div>
          <h1 className="text-[36px] md:text-[44px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-4">
            {title}
          </h1>
          <p className="text-[17px] text-gray-500 max-w-xl mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-8 max-w-lg mx-auto">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-5">How to play</p>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[14px] text-gray-600 leading-relaxed">
                <span className="w-6 h-6 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </main>

      <Footer />
    </div>
  )
}
