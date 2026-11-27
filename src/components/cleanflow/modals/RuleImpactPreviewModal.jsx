import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, FlaskConical } from 'lucide-react';
import api from '../../../services/apiClient';

const control = 'block w-full h-10 mt-2 px-3 rounded-[10px] border border-slate-300 bg-white text-sm';
const number = value => value?.toLocaleString() ?? '—';

export default function RuleImpactPreviewModal({ rule, columns = [], sampleSize, onSaveRule, onClose }) {
  const original = rule.expression || rule.condition || rule.code || '';
  const [expression, setExpression] = useState(original);
  const [field, setField] = useState(rule.field || rule.column || '');
  const [severity, setSeverity] = useState(rule.severity || 'Critical');
  const [action, setAction] = useState(rule.action || 'Quarantine');
  const [request, setRequest] = useState({ expression, field, severity });
  const [result, setResult] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setResult(null);
    setFailed(false);
    api.post('/rules/impact-preview', { ruleId: rule.id, field: request.field, severity: request.severity, sampleSize, oldExpression: original, newExpression: request.expression })
      .then(data => { if (active) setResult(data); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [request, original, rule.id, sampleSize]);

  return <div className="fixed inset-0 z-[80] bg-slate-950/40 grid place-items-center p-4" onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label="Edit rule" className="bg-white text-slate-900 w-full max-w-[920px] max-h-[92dvh] flex flex-col overflow-hidden rounded-3xl shadow-2xl">
      <header className="flex items-center gap-2.5 border-b border-slate-200 px-6 py-5"><h3 className="font-semibold">Edit rule</h3><span className="bg-slate-50 rounded-md px-2 py-1 text-xs">{rule.name}</span><span className="text-xs text-red-700 bg-red-50 rounded-full px-2 py-1">{severity}</span><button className="ml-auto p-1" aria-label="Close" onClick={onClose}><X size={18}/></button></header>
      <div className="overflow-y-auto grid md:grid-cols-[12fr_11fr]">
        <div className="p-6 space-y-4 text-sm">
          <label className="block">Column<select className={control} value={field} onChange={e => setField(e.target.value)}>{[...new Set([field, ...columns.map(col => typeof col === 'string' ? col : col.name)])].filter(Boolean).map(col => <option key={col}>{col}</option>)}</select></label>
          <div>Expression<div className="mt-2 rounded-xl border border-slate-200 py-1 overflow-hidden text-xs"><div className="flex gap-3 bg-[#fcedeb] px-3 py-2"><span>−</span>{original}</div><label className="flex gap-3 bg-[#e7f5ee] px-3 py-2"><span>+</span><textarea rows={2} aria-label="Expression" value={expression} onChange={e => setExpression(e.target.value)} className="flex-1 bg-transparent"/></label></div></div>
          <label className="block">Severity<select className={control} value={severity} onChange={e => setSeverity(e.target.value)}>{[...new Set([severity,'Critical','High','Medium','Low'])].map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="block">When it fails<select className={control} value={action} onChange={e => setAction(e.target.value)}>{[...new Set([action,'Quarantine','Hold for review','Flag only'])].map(value => <option key={value} value={value}>{value === 'Quarantine' ? 'Send to quarantine' : value}</option>)}</select></label>
        </div>
        <div className="bg-slate-50 md:border-l border-slate-200 p-6 space-y-4 min-w-0">
          <div className="flex gap-4 items-center"><strong>Impact</strong><select aria-label="Impact sample" className={control}><option>Last sandbox run · {number(sampleSize)} rows</option></select></div>
          {result ? <><div className="grid grid-cols-2 gap-3">{[['Quarantined','quarantined'],['Clean or fixed','clean']].map(([label,key]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-3 text-xs"><p>{label}</p><p className="mt-2">{number(result[key+'Before'])} → <strong>{number(result[key+'After'])}</strong> <span className={key === 'clean' ? 'text-blue-600 bg-blue-50 rounded-full px-2' : 'text-green-700 bg-green-50 rounded-full px-2'}>{result[key+'Delta'] > 0 ? '+' : ''}{result[key+'Delta']}</span></p></div>)}</div>
          <div className="text-xs font-semibold text-slate-600">EXAMPLE ROWS THAT WOULD NOW PASS</div>
          <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white"><table className="w-full text-left text-xs"><thead><tr>{['Record','TOTAL_AMOUNT','QTY × PRICE','Diff'].map(label => <th key={label} className="p-2 font-medium">{label}</th>)}</tr></thead><tbody>{result.exampleRows?.map(row => <tr key={row.recordId} className="border-t border-slate-200">{[row.recordId,row.totalAmount,row.calculated,row.diff].map((value,i) => <td key={i} className="p-2">{typeof value === 'number' ? value.toLocaleString(undefined,{minimumFractionDigits:2}) : value}</td>)}</tr>)}</tbody></table></div>
          {result.governanceWarning && <p className="flex gap-2 rounded-xl bg-[#fff4e3] text-amber-800 p-4 text-sm"><AlertTriangle size={16} className="shrink-0"/>{result.governanceWarning}</p>}</> : <p className="text-sm">{failed ? 'Impact preview unavailable. Re-test to try again.' : 'Calculating impact…'}</p>}
        </div>
      </div>
      <footer className="border-t border-slate-200 px-6 py-3.5 flex items-center gap-2 text-sm"><button onClick={() => setRequest({ expression, field, severity })} className="mr-auto flex items-center gap-2"><FlaskConical size={16}/>Re-test in sandbox</button><button className="border border-slate-300 rounded-lg px-4 py-2.5" onClick={onClose}>Cancel</button><button disabled={!expression.trim()} className="bg-[#3455ff] disabled:opacity-50 rounded-lg px-4 py-2.5 text-white" onClick={() => { onSaveRule({ ...rule, field, severity, action, expression, condition: expression }); onClose(); }}>Save rule</button></footer>
    </section>
  </div>;
}
