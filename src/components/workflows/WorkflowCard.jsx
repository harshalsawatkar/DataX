import React from 'react';
import { Trash2 } from 'lucide-react';

export default function WorkflowCard({ workflow, onOpenCanvas, onRunDryRun, onDelete }) {
  const { title, domain, pipelineTag, rulesCount, schemaMappedPercent, status } = workflow;
  return (
    <article className="group relative grid gap-4 bg-white px-6 py-4 dark:bg-[#18181C] sm:grid-cols-2 xl:min-h-[94px] xl:grid-cols-[1.2fr_1fr_.76fr_110px_auto] xl:items-center">
      <div>
        <h3 className="max-w-[270px] text-lg font-semibold leading-tight">{title}</h3>
        <span className="text-xs text-slate-500">{domain}</span>
      </div>
      <span className="rounded-full bg-[#E5EBFF] px-3 py-1.5 text-xs text-slate-700">{pipelineTag}</span>
      <div className="text-xs text-slate-500">
        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#3155F5]" style={{width: `${schemaMappedPercent}%`}} />
        </div>
        {rulesCount} rules · {schemaMappedPercent}% mapped
      </div>
      <span className={`rounded-full px-3 py-1 text-center text-xs font-semibold ${status === 'Draft' ? 'bg-amber-100 text-amber-800' : 'bg-green-50 text-green-800'}`}>{status}</span>
      <div className="flex gap-2">
        <button className="rounded-lg border border-slate-300 px-3 py-3 text-sm font-semibold" onClick={() => onRunDryRun(workflow)}>Dry run</button>
        <button className="rounded-lg bg-[#3155F5] px-3 py-3 text-sm font-semibold text-white" onClick={() => onOpenCanvas(workflow)}>Open canvas</button>
        {onDelete && <button className="self-center rounded p-1 text-slate-500 xl:absolute xl:right-1 xl:top-1 xl:opacity-0 xl:group-hover:opacity-100 xl:focus:opacity-100" aria-label={`Archive ${title}`} onClick={() => onDelete(workflow)}><Trash2 size={14}/></button>}
      </div>
    </article>
  );
}
