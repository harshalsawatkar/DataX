import React from 'react';
import { IconAdvisor } from '../icons';

export default function WorkflowsHeader({ onNewWorkflow, onOpenAdvisor }) {
  return (
    <header className="-mx-6 sm:-mx-8">
    <div className="bg-white border-b dark:bg-[#18181C] py-6 px-6 sm:px-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-[32px] font-bold text-[#0A0F1F] dark:text-white tracking-tight leading-tight">
          Workflows
        </h1>
        <p className="max-w-[700px] text-sm text-[#5F6678] dark:text-slate-400 mt-1">
          Each workflow reads from a source, checks every row with rules written by AI, and writes clean rows to a target.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenAdvisor}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D0D5DD] dark:border-slate-700 bg-transparent hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-[#0A0F1F] dark:text-white text-[13px] sm:text-sm font-medium transition-colors cursor-pointer"
        >
          <IconAdvisor size={14} className="text-[#0A0F1F] dark:text-white" />
          <span>Use case advisor</span>
        </button>

        <button
          type="button"
          onClick={onNewWorkflow}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D55F5] hover:bg-[#2045DC] text-white text-sm font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
        >
          <span className="text-base leading-none font-normal">+</span>
          <span>New workflow</span>
        </button>
      </div>
    </div>
    </header>
  );
}
