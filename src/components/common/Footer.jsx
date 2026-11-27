import React from 'react';
import markLogo from '../../assets/landing-logo-mark.svg';

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Use cases', href: '#use-cases' },
  { label: 'Security', href: '#for-leaders' },
  { label: 'Privacy', href: '#' },
  { label: 'Contact', href: '#' },
];

export default function Footer({ setActiveView }) {
  return (
    <footer className="border-t border-[#E3E6EE] bg-white font-['Geist',sans-serif] text-[13px] leading-[1.5] tracking-normal text-[#5F6678]">
      <div className="mx-auto flex max-w-[1248px] flex-wrap items-center gap-x-8 gap-y-5 px-6 py-10">
        <div className="flex items-center gap-8">
          <button
            type="button"
            className="flex items-center gap-[10px] whitespace-nowrap text-[22px] font-bold leading-none tracking-[-0.03em] text-[#0A0F1F]"
            onClick={() => setActiveView('website')}
          >
            <img src={markLogo} alt="" width="32" height="32" />
            <span>Data<span className="text-[#2D55F5]">X</span></span>
          </button>
          <span>by DataGlow.ai</span>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-8 gap-y-3 lg:ml-auto">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="whitespace-nowrap text-[#474E61] transition-colors hover:text-[#2D55F5]"
              onClick={(event) => {
                if (href.length > 1) {
                  event.preventDefault();
                  document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        <span className="whitespace-nowrap">© {new Date().getFullYear()} DataGlow.ai Inc.</span>
      </div>
    </footer>
  );
}
