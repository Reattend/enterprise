'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Download } from 'lucide-react'

export function PublicNav() {
  const [scrolled, setScrolled] = useState(false)
  const [isWindows, setIsWindows] = useState(false)

  useEffect(() => {
    setIsWindows(navigator.platform?.toLowerCase().includes('win') || navigator.userAgent?.toLowerCase().includes('windows'))
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/60 backdrop-blur-2xl shadow-[0_1px_20px_rgba(79,70,229,0.06)] border-b border-white/60'
          : 'bg-white/30 backdrop-blur-xl border-b border-transparent'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-5 flex items-center justify-between h-[64px]">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/black_logo.svg" alt="Reattend" width={32} height={32} className="h-8 w-8" />
          <span className="text-[18px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
        </Link>
        <div className="flex items-center gap-3">
          <a
            href={isWindows ? '/download/Reattend_x64-setup.exe' : '/download/Reattend.dmg'}
            className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.97] transition-all px-5 py-2.5 rounded-full shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
          >
            <Download className="h-3.5 w-3.5" /> {isWindows ? 'Download for Windows' : 'Download for Mac'}
          </a>
        </div>
      </div>
    </nav>
  )
}
