import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import markLogo from '../../assets/landing-logo-mark.svg';
import arrowRight from '../../assets/landing-arrow-right.svg';

const LINKS = [
  ['How it works', 'how-it-works'],
  ['Use cases', 'use-cases'],
  ['For leaders', 'for-leaders'],
  ['Security', 'for-leaders'],
];

export default function LandingNavbar({ setActiveView, onOpenDemo }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToSection = (id) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-3 font-['Geist',sans-serif] tracking-normal md:pt-6">
      <nav aria-label="Main navigation" className="landing-nav pointer-events-auto mx-auto flex h-[61px] max-w-[1200px] items-center gap-7 rounded-full border border-white/10 py-[10px] pl-[22px] pr-[10px]">
        <button
          type="button"
          className="flex shrink-0 items-center gap-[10px] whitespace-nowrap text-[22px] font-bold leading-none tracking-[-0.03em] text-white"
          onClick={() => setActiveView('website')}
        >
          <img src={markLogo} alt="" width="32" height="32" />
          <span>Data<span className="landing-volt-text">X</span></span>
        </button>

        <div className="hidden items-center gap-[26px] whitespace-nowrap text-[13px] font-medium leading-[1.45] text-[#A6ADC2] md:flex">
          {LINKS.map(([label, id]) => (
            <button type="button" key={label} className="transition-colors hover:text-white" onClick={() => scrollToSection(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto hidden shrink-0 items-center gap-7 md:flex">
          <button type="button" className="text-[13px] font-medium leading-[1.45] text-white hover:text-[#A6ADC2]" onClick={() => setActiveView('poc')}>
            Sign in
          </button>
          <button type="button" className="landing-demo-button" onClick={onOpenDemo}>
            Book a demo
            <img src={arrowRight} alt="" width="16" height="16" />
          </button>
        </div>

        <button
          type="button"
          className="ml-auto rounded-full p-2 text-[#A6ADC2] hover:text-white md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="landing-mobile-menu"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {mobileOpen && (
        <div id="landing-mobile-menu" className="landing-nav pointer-events-auto mt-2 flex flex-col gap-3 rounded-[20px] border border-white/10 p-5 md:hidden">
          {LINKS.map(([label, id]) => (
            <button type="button" key={label} className="border-b border-white/10 py-2 text-left text-sm text-[#A6ADC2] hover:text-white" onClick={() => scrollToSection(id)}>
              {label}
            </button>
          ))}
          <button type="button" className="rounded-full border border-white/10 py-2 text-sm text-white" onClick={() => { setMobileOpen(false); setActiveView('poc'); }}>
            Sign in
          </button>
          <button type="button" className="landing-demo-button" onClick={() => { setMobileOpen(false); onOpenDemo(); }}>
            Book a demo
            <img src={arrowRight} alt="" width="16" height="16" />
          </button>
        </div>
      )}
    </header>
  );
}
