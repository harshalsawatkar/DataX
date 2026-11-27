import React from 'react';

const streams = [
  ['Compliant stream', 'Rows that pass every rule go straight to the target.', 'bg-emerald-600'],
  ['Auto-fixed stream', 'Rows repaired by warning rules are committed to the target.', 'bg-blue-600'],
  ['Critical violations stream', 'Rows failing a critical rule are isolated in the quarantine store.', 'bg-amber-600'],
];

export default function RouterModalPanel({ routerThreshold, setRouterThreshold }) {
  return <div className="space-y-3">
    {streams.map(([label, description, color]) => <div key={label} className="flex gap-3 rounded-xl border border-slate-200 p-4">
      <span className={`mt-1.5 size-2 rounded-full shrink-0 ${color}`} />
      <div><strong className="text-sm">{label}</strong><p className="mt-1 text-xs text-slate-500">{description}</p></div>
    </div>)}
    <div className="rounded-xl bg-slate-50 p-4 space-y-2">
      <label htmlFor="health-score" className="flex justify-between text-sm font-semibold">Minimum health score <span className="text-blue-600">{routerThreshold}%</span></label>
      <input id="health-score" type="range" min={70} max={100} value={routerThreshold} onChange={e => setRouterThreshold(Number(e.target.value))} className="w-full accent-blue-600" />
      <p className="text-xs text-slate-500">The run pauses if the overall health score falls below this gate.</p>
    </div>
  </div>;
}
