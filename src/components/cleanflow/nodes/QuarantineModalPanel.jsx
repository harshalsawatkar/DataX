import React from 'react';
import { AlertTriangle, Database, ShieldAlert, Sparkles } from 'lucide-react';

/**
 * Audit Quarantine Store — Settings Panel
 * Dead-letter isolation vault for records violating critical quality and integrity rules.
 * Dynamically binds to the active source table.
 */
export default function QuarantineModalPanel({
  sourceTable = '',
  quarantineTable,
  setQuarantineTable,
  auditLock, setAuditLock,
  quarantineAlertWebhook,
  setQuarantineAlertWebhook,
}) {
  const defaultQuarantineName = sourceTable ? `${sourceTable}_quarantine` : 'quarantine_dlq';

  const quickPresets = sourceTable
    ? [
        `${sourceTable}_quarantine`,
        `${sourceTable}_violations_dlq`,
        `${sourceTable}_audit_locked`,
      ]
    : ['audit_quarantine_store', 'quarantine_violations_dlq', 'failed_records_vault'];

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-indigo-50 p-3 text-xs text-slate-700">Rows that break a critical rule are stored here with row-level violation details for data steward review.</p>
      {/* Quarantine Table Configuration */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-slate-800">
            Quarantine table
          </label>
          <button
            type="button"
            onClick={() => setQuarantineTable(defaultQuarantineName)}
            className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 cursor-pointer"
          >
            Reset to default
          </button>
        </div>
        <input
          type="text"
          value={quarantineTable}
          onChange={(e) => setQuarantineTable(e.target.value)}
          placeholder={`e.g. ${defaultQuarantineName}`}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        />

        {/* Quick Name Presets */}
        <div className="mt-2 space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 block">
            Suggested Table Names (bound to {sourceTable || 'active source'}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setQuarantineTable(preset)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-colors cursor-pointer border ${
                  quarantineTable === preset
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {[
        ['Synchronous disk flush & audit lock', 'Write quarantined rows to disk before clean rows commit, keeping timestamps, rule IDs and original values for replay.', auditLock, setAuditLock],
        ['Anomaly spike alert', 'Send a Slack or webhook alert when quarantined rows exceed 10.', quarantineAlertWebhook, setQuarantineAlertWebhook],
      ].map(([label, hint, checked, setChecked]) => <label key={label} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
        <span className="flex-1"><strong className="block text-xs">{label}</strong><small className="text-slate-500">{hint}</small></span>
        <input type="checkbox" role="switch" checked={checked} onChange={e => setChecked(e.target.checked)} className="accent-blue-600" />
      </label>)}
    </div>
  );
}
