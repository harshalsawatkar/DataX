import React from 'react';
import arrowRight from '../../assets/landing-arrow-right.svg';
import heroDot from '../../assets/landing-hero-dot.svg';
import heroPlay from '../../assets/landing-hero-play.svg';
import DataStreamConveyor from './DataStreamConveyor';

export default function Hero({ onOpenDemo }) {
  return (
    <section
      className="pt-[112px] tracking-normal md:pt-[150px]"
      style={{
        position: 'relative',
        paddingBottom: 40,
        overflow: 'hidden',
        /* Figma: linear-gradient(#171C45 0%, #0A0F1F 45%, #0A0F1F 100%) */
        background: 'linear-gradient(180deg, #171C45 0%, #0A0F1F 45%, #0A0F1F 100%)',
        fontFamily: "'Geist', sans-serif",
      }}
    >
      {/* Top ambient glow/shed beside & behind the floating navbar (Figma: illuminated shed) */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 1400, height: 260,
        background: 'radial-gradient(ellipse 75% 100% at 50% 0%, rgba(64,105,255,0.42) 0%, rgba(23,28,69,0.30) 50%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      {/* Background ambient glows */}
      <div style={{
        position: 'absolute', top: '22%', left: '50%',
        transform: 'translateX(-50%)',
        width: 720, height: 400,
        background: 'rgba(37,99,235,0.08)',
        filter: 'blur(140px)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '35%', left: '30%',
        width: 360, height: 360,
        background: 'rgba(6,182,212,0.04)',
        filter: 'blur(120px)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {/* Subtle dot-grid background */}
      <div style={{
        position: 'absolute', inset: '0 0 auto', height: 700, pointerEvents: 'none', opacity: 0.18,
        backgroundImage: 'radial-gradient(rgba(148,163,184,0.25) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* ── Main content ───────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        maxWidth: 1200, margin: '0 auto',
        padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        <div className="flex flex-col items-center gap-6 text-center">
          <div className="landing-volt-bg inline-flex items-center gap-[5px] rounded-full px-2 py-0.5 text-xs font-medium leading-[1.4]">
            <img src={heroDot} alt="" width="6" height="6" />
            AI rule engine for enterprise data
          </div>

          <h1 className="landing-hero-h1 text-[clamp(48px,7vw,96px)]">
            Bad data <span className="volt-span">stops here.</span>
          </h1>

          <p className="max-w-[680px] text-[19px] leading-[1.55] text-[#A6ADC2]">
            DataX checks every row against rules you describe in plain English, and holds
            the ones that fail before they reach SAP, your warehouse or your AI.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" className="landing-demo-button" onClick={onOpenDemo}>
              Book a demo
              <img src={arrowRight} alt="" width="16" height="16" />
            </button>
            <button
              type="button"
              className="landing-secondary-button"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <img src={heroPlay} alt="" width="14" height="14" />
              See how it works
            </button>
          </div>
        </div>

        <DataStreamConveyor />

      </div>
    </section>
  );
}
