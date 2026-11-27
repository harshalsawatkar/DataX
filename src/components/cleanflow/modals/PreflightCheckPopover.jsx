import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, X, RefreshCw, Play, ArrowRight } from 'lucide-react';
import api from '../../../services/apiClient';

export default function PreflightCheckPopover({ isOpen, onClose, workflowId, top, onFixIssue, onRunSandbox, onRunLive, isExecutingSandbox, isExecutingLive }) {
  const [data, setData] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setData(null);
    setError(false);
    api.get('/workflow/preflight-check?workflow_id=' + encodeURIComponent(workflowId)).then(result => {
      if (active) setData(result);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [isOpen, workflowId, refresh]);
  if (!isOpen) return null;

  return <div className="absolute inset-0 z-50" onClick={onClose}>
    <section role="dialog" aria-label="Pre-flight check" onClick={e => e.stopPropagation()} style={{ top, maxHeight: `calc(100% - ${top}px - 8px)` }} className="absolute right-2 sm:right-6 w-[460px] max-w-[calc(100%-1rem)] rounded-[18px] border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden">
      <header className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">Pre-flight check</h3><p className="text-xs text-slate-600">{data?.summary || (error ? 'Could not load checks.' : 'Checking workflow…')}</p></div>
        <button aria-label="Refresh checks" onClick={() => setRefresh(n => n + 1)} className="p-2"><RefreshCw size={16}/></button>
      </header>
      <div className="overflow-y-auto p-2 space-y-0.5">
        {data?.checks?.map(check => {
          const blocked = check.severity === 'blocking';
          const warning = check.severity === 'warning';
          const Icon = blocked ? X : warning ? AlertTriangle : Check;
          return <div key={check.id} className={`rounded-xl flex items-start gap-2.5 px-2.5 py-3 ${blocked ? 'bg-[#fcedeb]' : warning ? 'bg-[#fff4e3]' : ''}`}>
            <span className={`size-[22px] shrink-0 grid place-items-center rounded-full ${blocked ? 'text-red-600' : warning ? 'text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}><Icon size={13}/></span>
            <div className="flex-1"><strong className="text-sm font-medium">{check.name}</strong><p className="text-xs text-slate-600 mt-1">{check.message}</p></div>
            {check.actionText && <button disabled={warning && isExecutingSandbox} className="rounded-full bg-white px-3 py-1.5 shadow-sm text-xs font-medium inline-flex items-center gap-1" onClick={() => { onClose(); if (check.actionTarget === 'sandbox') onRunSandbox(); else onFixIssue(check.targetNodeId, check); }}>{check.actionText.replace(/ →$/, '')}<ArrowRight size={13}/></button>}
          </div>;
        })}
      </div>
      <footer className="border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs"><span>{data?.blockingCount ? `Fix ${data.blockingCount} blocking issue${data.blockingCount === 1 ? '' : 's'} to run live.` : data && 'All blocking checks passed.'}</span>
        <button disabled={!data?.canRunLive || isExecutingLive} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-3 disabled:bg-slate-100 disabled:text-slate-500" onClick={() => { onClose(); onRunLive(); }}><Play size={13}/>Run live</button>
      </footer>
    </section>
  </div>;
}
