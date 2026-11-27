import React from 'react';
import step1Img from '../../assets/step1.png';
import step2Img from '../../assets/step2.png';
import step3Img from '../../assets/step3.png';
import { ArrowRight } from 'lucide-react';

/**
 * HowItWorksSection – Exact Figma "HOW IT WORKS" Spec
 * Features:
 *   - Eyebrow: "HOW IT WORKS" (Geist 600, 12px, #2D55F5)
 *   - Headline: "From one sentence to rules that check every row." (Geist 600, 56px, -3.5% tracking)
 *   - Subtitle: "The same three steps for every workflow. Nothing reaches a target system until it has passed."
 *   - 3 Step Images placed in a single 3-column row
 *   - Directly hover the image (no artificial white wrapper card / no double boxes)
 *   - Connecting blue arrow circles between Step 1-2 and Step 2-3
 */

const STEPS = [
  {
    id: 1,
    img: step1Img,
    alt: 'Step 1: Describe what clean means',
  },
  {
    id: 2,
    img: step2Img,
    alt: 'Step 2: Test before anything is written',
  },
  {
    id: 3,
    img: step3Img,
    alt: 'Step 3: Run live, with every exception explained',
  },
];

export default function HowItWorksSection() {

  return (
    <section
      id="how-it-works"
      style={{
        position: 'relative',
        background: 'var(--landing-surface)',
        paddingTop: 128,
        paddingBottom: 128,
        overflow: 'hidden',
        fontFamily: "'Geist', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1248, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Section Header ──────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16, maxWidth: 760, marginBottom: 64 }}>
          {/* Eyebrow: DX/eyebrow (Geist 600, 12px, 130% lh, #2D55F5) */}
          <div
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              lineHeight: '130%',
              letterSpacing: '0%',
              color: '#2D55F5',
              textTransform: 'uppercase',
            }}
          >
            HOW IT WORKS
          </div>

          {/* Headline: Geist 600 SemiBold, 56px, 102% line-height, -3.5% letter spacing */}
          <h2
            style={{
              margin: 0,
              fontFamily: 'inherit',
              fontSize: 'clamp(36px, 4.5vw, 56px)',
              fontWeight: 600,
              lineHeight: '102%',
              letterSpacing: '-0.035em',
              color: '#0A0F1F',
            }}
          >
            From one sentence to rules that check every row.
          </h2>

          {/* Subtitle: Geist 400 Regular, 17px, 155% line-height, #474F61 */}
          <p
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 400,
              lineHeight: '155%',
              letterSpacing: '0%',
              color: '#474E61',
              maxWidth: 640,
            }}
          >
            The same three steps for every workflow. Nothing reaches a target system until it has passed.
          </p>
        </div>

        <div className="grid items-start gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.id} className="relative">
              <img
                src={step.img}
                alt={step.alt}
                className="-mb-[10%] -ml-[9.375%] -mt-[3.125%] block h-auto w-[118.75%] max-w-none rounded-3xl transition-transform duration-200 hover:-translate-y-1.5"
              />
              {index < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute left-[calc(100%+12px)] top-[min(8vw,110px)] z-10 hidden size-10 -translate-x-1/2 items-center justify-center rounded-full bg-[#2D55F5] shadow-[0_4px_12px_rgba(45,85,245,0.35)] md:flex"
                >
                  <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
