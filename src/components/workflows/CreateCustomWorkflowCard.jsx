import React from 'react';
import { LayoutGrid } from 'lucide-react';

const CustomWorkflowIcon = () => (
  <svg
    viewBox="0 0 32 32"
    className="size-8 shrink-0 sm:size-11"
    fill="none"
    aria-hidden="true"
  >
    <rect x="4.5" y="9.5" width="18" height="22" rx="4" fill="#D1DBFE" />
    <rect x="3" y="8.5" width="18.5" height="22" rx="4" fill="#FFFFFF" stroke="#0A0F1F" strokeWidth="1.8" />
    <path d="M7 15h8m-8 4h8m-8 4h8" stroke="#0A0F1F" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="22" cy="10" r="7" fill="#2D55F5" stroke="#0A0F1F" strokeWidth="1.8" />
    <path d="M22 5.5c.6 2.6 1.9 3.9 4.5 4.5-2.6.6-3.9 1.9-4.5 4.5-.6-2.6-1.9-3.9-4.5-4.5 2.6-.6 3.9-1.9 4.5-4.5Z" style={{ fill: '#D4FF3A' }} />
  </svg>
);

/**
 * CreateCustomWorkflowCard - 6th Card in Grid matching 01.1 & screenshot
 */
export default function CreateCustomWorkflowCard({ onOpenCanvas, onNewThread }) {
  const handleClick = onOpenCanvas || onNewThread;

  return (
    <div
      onClick={handleClick}
      className="border-2 border-dashed border-[#CDD2DE] dark:border-white/[0.12] rounded-[22px] p-6 sm:p-7 flex flex-col items-center justify-center text-center bg-[#FBFBFC] dark:bg-white/[0.015] hover:border-[#2D55F5]/50 hover:bg-[#F8FAFF] dark:hover:bg-white/[0.03] transition-all cursor-pointer group min-h-[224px]"
    >
      <CustomWorkflowIcon />

      <h3 className="font-semibold text-xl sm:text-[30px] text-[#0A0F1F] dark:text-white mt-4 group-hover:text-[#2D55F5] transition-colors">
        Create a custom workflow
      </h3>

      <p className="text-xs text-[#5F6678] dark:text-slate-400 mt-2 max-w-[260px] leading-relaxed">
        Connect any database, S3 bucket or LLM endpoint and draft rules with AI.
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-white/[0.06] border border-[#E3E6EE] dark:border-white/[0.1] text-xs font-semibold text-[#2D55F5] dark:text-blue-400 group-hover:border-[#2D55F5]/40 transition-all mt-6 shadow-2xs cursor-pointer"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>Open visual canvas</span>
      </button>
    </div>
  );
}
