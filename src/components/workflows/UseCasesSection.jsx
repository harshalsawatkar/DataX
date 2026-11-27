import React from 'react';
import { ArrowRight, ArrowUpRight, Bot, Database, FlaskConical, Table2 } from 'lucide-react';

export default function UseCasesSection({ onOpenCanvas, onOpenFirewall, onOpenMlGate, onOpenMappingStudio, onOpenAdvisor }) {
  const cards = [
    [Database, 'Database & ERP migrations', 'Move data across systems, catch errors, and keep records clean.', 'Open canvas', onOpenCanvas],
    [Bot, 'AI agent & privacy firewall', 'Protect sensitive data and block prompt injection before it reaches AI tools.', 'Open firewall', onOpenFirewall],
    [FlaskConical, 'ML training & drift gate', 'Check training data for drift and leakage before running your ML model.', 'Open ML gate', onOpenMlGate],
    [Table2, 'Schema & Migration Studio', 'Map Excel FMD files, compare rules, and prepare SAP BODS staging data.', 'Open studio', onOpenMappingStudio],
  ];
  return (
    <section>
      <h2 className="text-[32px] font-semibold tracking-tight">Start from a use case</h2>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <p>Four ways teams use DataX. Each opens the matching studio.</p>
        <button onClick={onOpenAdvisor} className="flex items-center gap-1 italic">Not sure? Ask the advisor <ArrowUpRight size={14}/></button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([Icon, title, description, action, open]) => (
          <button
            key={title}
            onClick={() => open()}
            className="group relative flex min-h-[276px] flex-col items-start rounded-2xl border border-slate-200/90 bg-white p-[22px] text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all duration-250 hover:-translate-y-0.5 hover:border-[#2D55F5] hover:bg-gradient-to-br hover:from-[#F6F9FF] hover:via-[#EDF2FF] hover:to-[#E3EBFF] hover:shadow-[4px_8px_24px_0px_rgba(45,85,245,0.25),0_4px_14px_0px_rgba(45,85,245,0.16)] dark:border-white/[0.08] dark:bg-[#18181C] dark:hover:border-blue-500 dark:hover:from-blue-950/90 dark:hover:to-slate-900 dark:hover:shadow-[4px_8px_24px_0px_rgba(59,130,246,0.3)]"
          >
            <span className="mb-5 rounded-xl border border-[#3B66F5] bg-white p-3 text-[#2D55F5] transition-transform duration-200 group-hover:scale-105"><Icon size={18}/></span>
            <strong className="text-xl leading-tight tracking-tight text-[#0A0F1F] dark:text-white">{title}</strong>
            <span className="my-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</span>
            <span className="mt-auto flex w-full items-center gap-1 border-t border-slate-200/80 pt-3 text-sm font-semibold text-[#2D55F5] transition-colors group-hover:border-blue-200/80 dark:border-white/[0.08]">
              <span className="group-hover:underline group-hover:decoration-[#2D55F5]/60 group-hover:underline-offset-4">{action}</span>
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5"/>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
