import React, { useId } from 'react';
import { Database, FileCheck2, GitBranch, ListChecks, ShieldCheck, Split, Archive } from 'lucide-react';

const nodes = [
  ['Source', 'Source Ingestion', 'CSV Server Ledger', 'Data', Database, 'Table', 'gl_journal_entries', 'Rows', '2,800 rows'],
  ['AI Rules', 'SOX 404 Rules', 'Observes each transaction', 'Applied', ListChecks, 'Rules', '7 active', 'Mode', 'per-record'],
  ['Router', 'Conditional Router (If / Else)', 'If the amount exceeds 20,000', 'Active', GitBranch, 'Paths', 'TRUE / FALSE'],
  ['Review', 'Controller gate', 'Permissioned Controller', 'Armed', ShieldCheck, 'SLA', '6h'],
  ['Split', 'CleanFlow Router', 'Clean · Hold · Quarantine', 'Active', Split, 'Health gate', '90%'],
  ['Notebook', 'AuditStore', 'Sink to BigQuery', 'Dataset', FileCheck2, 'Table', 'gl_audit_post'],
  ['DLQ', 'SuspenseAccount', 'Store error balance', 'Locked', Archive, 'Table', '…quarantine'],
];

// Positions are the top-left corners of the cards in each artwork coordinate system.
const wide = {
  positions: [[26,122],[107,122],[188,122],[272,99],[272,147],[355,99],[355,147]],
  paths: ['M82 142H107','M163 142H188','M244 142C259 142 255 117 272 117','M244 142C259 142 255 165 272 165','M328 117H355','M328 165C344 165 337 117 355 117','M328 165H355'],
};
const compact = {
  positions: [[140,12],[140,77],[140,142],[46,222],[234,222],[46,303],[234,303]],
  paths: ['M180 69V77','M180 134V142','M180 199C180 213 86 203 86 222','M180 199C180 213 274 203 274 222','M86 274V303','M274 274C274 290 86 288 86 303','M274 274V303'],
};

function Diagram({ mobile }) {
  const id = useId().replace(/:/g, '');
  const layout = mobile ? compact : wide;
  return (
    <svg className={mobile ? 'workflow-diagram-compact' : 'workflow-diagram-wide'} viewBox={mobile ? '0 0 360 369' : '0 0 506 241'} aria-hidden="true">
      <defs>
        <radialGradient id={id+'panelGlow'} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#1473E6" stopOpacity="0.12"/>
          <stop offset="70%" stopColor="#0B1020" stopOpacity="0.04"/>
          <stop offset="100%" stopColor="#0B1020" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={id+'glow'}>
          <stop offset="0%" stopColor="#2D55F5" stopOpacity="0.42"/>
          <stop offset="100%" stopColor="#0B1020" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y={mobile ? 0 : 37} width={mobile ? 360 : 438} height={mobile ? 369 : 199} rx="14" fill={'url(#'+id+'panelGlow)'}/>
      {!mobile && <g>
        <circle cx="469" cy="211" r="111" fill={'url(#'+id+'glow)'}/>
        {[52,84,122,160].map(r => <circle key={r} cx="469" cy="211" r={r} fill="none" stroke="#45547e" strokeOpacity=".38" strokeWidth=".8"/>)}
        <path d="M347 211h87" stroke="#536493" strokeDasharray="4 4" strokeWidth="1"/>
        {[.35,.65,1].map((opacity,i) => <rect key={i} x={370+i*18.5} y="207.5" width="7" height="7" rx="1.6" fill="#d4ff3a" opacity={opacity}/>)}
        <path d="M452 228.6l25.6-35.2H488l-25.6 35.2z" fill="#9ba9c6"/>
        <path d="M451.2 193.4h10.4l7 9.6h-10.4zm20.2 25.6h10.4l7 9.6h-10.4z" fill="#96ad43"/>
      </g>}
      {layout.paths.map((d,i) => <path key={d} d={d} fill="none" stroke={i === 6 ? '#bbc7e3' : '#538fe0'} strokeWidth={mobile ? 1.2 : .55} strokeDasharray={i === 6 ? '1 1' : undefined}/>)}
      {!mobile && ['True','False'].map((label,i) => <g key={label} transform={`translate(250 ${136+i*10})`}><rect width="11" height="5" rx="2.5" fill="#f2f6ff"/><text x="5.5" y="3.7" textAnchor="middle" fontSize="3" fill="#2f57ab">{label}</text></g>)}
      {nodes.map(([type,title,detail,status,Icon,key,value,key2,value2],i) => {
        const height = i < 3 ? 100 : 90;
        const ports = mobile ? [[70,0],[70,height]] : [[0,height/2],[140,height/2]];
        return <g key={type} transform={`translate(${layout.positions[i].join(' ')}) scale(${mobile ? 0.57 : 0.4})`}>
          <rect width="140" height={height} rx="10" fill="#232836" stroke="#9399ac"/>
          <circle cx="12" cy="15" r="5.7" fill="#d4f63d"/>
          <text x="12" y="17.6" textAnchor="middle" fontSize="7">{i+1}</text>
          <text x="22" y="18" fontSize="9" fill="white">{type}</text>
          <rect x="91" y="8" width="42" height="13" rx="6" fill={['#ffe6d1','#deebff','#d9f6e7','#deebff','#d9f6e7','#deebff','#e8eedf'][i]}/>
          <text x="112" y="17" textAnchor="middle" fontSize="7" fill="#344360">● {status}</text>
          <rect x="8" y="32" width="25" height="25" rx="5" fill="#f5f7ff"/>
          <Icon x="14" y="38" width="13" height="13" color="#455475"/>
          <text x="39" y="41" fill="white" fontSize="7.8" fontWeight="600">{title}</text>
          <text x="39" y="52" fill="#bac4dc" fontSize="6.5">{detail}</text>
          <path d="M7 64h126" stroke="#717889" strokeWidth="1"/>
          <g fontSize="7.5"><text x="8" y="78" fill="#b5bdce">{key}</text><text x="131" y="78" fill="white" textAnchor="end">{value}</text>
          {key2 && <><text x="8" y="92" fill="#b5bdce">{key2}</text><text x="131" y="92" fill="white" textAnchor="end">{value2}</text></>}</g>
          {ports.map(([cx,cy]) => <circle key={cx+'-'+cy} cx={cx} cy={cy} r="4.4" fill="#303949" stroke="white" strokeWidth="3.4"/>)}
        </g>;
      })}
    </svg>
  );
}

export default function WorkflowHeroDiagram() {
  return <div className="workflow-hero-diagram" role="img" aria-label="Source ingestion passes through SOX rules and a conditional router. Review and clean paths lead to the audit store, and rejected rows go to the suspense account.">
    <Diagram mobile={false}/><Diagram mobile/>
  </div>;
}
