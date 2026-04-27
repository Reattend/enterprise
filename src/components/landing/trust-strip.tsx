'use client'

import Image from 'next/image'

// "Powering teams at" logo strip. Logos live in /public/clients and are
// dropped into a desaturated row that lifts to white on hover. Edge
// gradients fade the row into the page background instead of hard-cutting.

const CLIENTS: Array<{ src: string; alt: string }> = [
  { src: '/clients/zomato.svg',    alt: 'Zomato' },
  { src: '/clients/infosys.svg',   alt: 'Infosys' },
  { src: '/clients/Namecheap.svg', alt: 'Namecheap' },
  { src: '/clients/atvi.svg',      alt: 'Activision' },
  { src: '/clients/BMGF.svg',      alt: 'Bill & Melinda Gates Foundation' },
  { src: '/clients/NTGP.svg',      alt: 'NTGP' },
  { src: '/clients/gt.svg',        alt: 'Georgia Tech' },
  { src: '/clients/10thlogo.svg',  alt: '10th Logo' },
  { src: '/clients/udyamini.svg',  alt: 'Udyamini' },
]

export function TrustStrip() {
  return (
    <section className="relative py-20 md:py-24 border-y border-white/[0.05]">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-500 mb-12">
          Employees at these companies are using us
        </p>
        <div className="relative">
          {/* Edge fade masks */}
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#08080c] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#08080c] to-transparent z-10 pointer-events-none" />

          <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-x-8 gap-y-10 items-center">
            {CLIENTS.map((c) => (
              <li
                key={c.src}
                className="flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-300"
              >
                <Image
                  src={c.src}
                  alt={c.alt}
                  width={120}
                  height={36}
                  className="h-7 md:h-8 w-auto object-contain brightness-0 invert"
                  unoptimized
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
