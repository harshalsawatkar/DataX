import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useRuleEngine } from '../../context/RuleEngineContext';
import WorkflowCanvasPage from '../WorkflowCanvasPage';
import { RunningDryRunModal } from '../../components/workflows/dryrun';

export default function RunningDryRunPage({ onComplete, onCancel }) {
  const { navigateTo } = useNavigation();
  const { executeDryRun, sourceConfig, activeRules } = useRuleEngine();

  const request = useRef(null);
  const [outcome, setOutcome] = useState(null);
  useEffect(() => {
    let mounted = true;
    request.current ??= executeDryRun();
    request.current.then(result => {
      if (mounted) setOutcome(result || { error: 'Another dry run is in progress.' });
    }).catch(error => {
      if (mounted) setOutcome({ error: error.message || 'The dry run failed.' });
    });
    return () => { mounted = false; };
  }, [executeDryRun]);

  const totalRows = outcome?.totalChecked ?? sourceConfig?.totalRows ?? 1420;
  const tableName = sourceConfig?.table || (sourceConfig?.selectedTables?.[0]) || 'OPUR_C01';
  const rulesCount = activeRules?.filter(rule => rule.selected !== false && rule.enabled !== false).length ?? 0;

  return (
    <div className="relative w-full min-h-[var(--studio-content-height,calc(100vh-4rem))]">
      {/* Background Interactive Canvas */}
      <WorkflowCanvasPage />

      {/* Foreground Modal Dialog (SS 3) */}
      <RunningDryRunModal
        isOpen={true}
        onComplete={() => {
          if (onComplete) onComplete();
          else navigateTo('dry-run-results');
        }}
        onCancel={() => {
          if (onCancel) onCancel();
          else navigateTo('canvas');
        }}
        onClose={() => navigateTo('canvas')}
        ready={Boolean(outcome && !outcome.error)}
        error={outcome?.error}
        totalRows={totalRows}
        tableName={tableName}
        rulesCount={rulesCount}
      />
    </div>
  );
}
