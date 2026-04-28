'use client'

import Image from 'next/image'

// Stripe-style trust strip — colored logos on a light background, generous
// spacing, soft eyebrow caption above. No grayscale or invert filters; the
// brands keep their own tone and the row reads as a confident roster.

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
    <section className="relative bg-white py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-[12px] font-medium tracking-[0.16em] uppercase text-slate-500 mb-12">
          Employees at these companies are using us
        </p>
        <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-x-8 gap-y-10 items-center">
          {CLIENTS.map((c) => (
            <li
              key={c.src}
              className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-300"
            >
              <Image
                src={c.src}
                alt={c.alt}
                width={120}
                height={36}
                className="h-7 md:h-8 w-auto object-contain"
                unoptimized
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
