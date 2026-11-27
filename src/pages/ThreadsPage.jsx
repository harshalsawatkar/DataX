import React, { useState } from 'react';
import DataXAppShell from '../components/common/DataXAppShell';
import { useNavigation } from '../context/NavigationContext';
import { useRuleEngine } from '../context/RuleEngineContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import UseCaseAdvisorModal from '../components/common/UseCaseAdvisorModal';


// Modular Subcomponents matching exact Screenshot
import {
  WorkflowsHeader,
  WorkflowsHeroBanner,
  UseCasesSection,
  WorkflowsFilterBar,
  WorkflowCard,
  CreateCustomWorkflowCard,
  WorkflowsEmptyState
} from '../components/workflows';

import { getWorkflows } from '../data/workflowCatalog';

export default function ThreadsPage({ onOpenLegacyPoc, onSwitchToMarketing } = {}) {
  const { navigateTo } = useNavigation();
  const ruleEngine = useRuleEngine?.() || {};
  const { 
    threads: contextThreads, 
    selectThread, 
    deleteThread, 
    autoFixEnabled
  } = ruleEngine;

  // Defaults to 'all' to show all 5 ready workflows matching screenshot
  const [filter, setFilter] = useState('all'); 
  const [search, setSearch] = useState('');

  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState(null);

  // Map baseline workflows with any user-customized threads in context
  const activeWorkflows = getWorkflows(contextThreads);

  // Filter workflows matching active tab ('all' | 'live' | 'draft')
  const filteredWorkflows = activeWorkflows.filter((wf) => {
    if (filter === 'live' && wf.status !== 'Live') return false;
    if (filter === 'draft' && wf.status === 'Live') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = wf.title.toLowerCase().includes(q);
      const matchDomain = wf.domain.toLowerCase().includes(q);
      const matchDesc = wf.description.toLowerCase().includes(q);
      const matchTag = wf.pipelineTag.toLowerCase().includes(q);
      return matchTitle || matchDomain || matchDesc || matchTag;
    }

    return true;
  });

  const handleOpenCanvas = (wf) => {
    if (selectThread && wf?.id) {
      selectThread(wf.id);
    }
    navigateTo('canvas');
  };

  const handleRunDryRun = async (wf) => {
    if (selectThread && wf?.id) {
      selectThread(wf.id);
    }
    navigateTo('running-dry-run');
  };

  const handleConfirmDelete = async () => {
    if (!threadToDelete) return;
    try {
      if (deleteThread) {
        await deleteThread(threadToDelete.id);
      }
    } catch (e) {
      console.warn('Delete workflow error:', e);
    }
    setThreadToDelete(null);
  };

  return (
    <DataXAppShell onSwitchToMarketing={onSwitchToMarketing}>
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-8 font-sans">
        
        {/* 1. Page Header: Title, Subtitle & + New thread CTA matching Screenshot */}
        <WorkflowsHeader 
          onOpenAdvisor={() => setAdvisorOpen(true)} 
        />

        {/* 2. Hero Dark Banner with exact background gradient and metrics matching Screenshot */}
        {filter === 'all' && <>
        <WorkflowsHeroBanner 
          activeCount={activeWorkflows.filter(wf => wf.status === 'Live').length}
          totalCount={activeWorkflows.length || 5}
          meanHealth="99.2"
          totalRuns={ruleEngine.runHistory?.length ?? 0}
          onToggleAutoFix={() => ruleEngine.setAutoFixEnabled(!autoFixEnabled)}
          autoFixEnabled={autoFixEnabled ?? true}
        />

        {/* 2.5 Start from a use case section matching Image 1 */}
        <UseCasesSection 
          onOpenCanvas={handleOpenCanvas}
          onOpenFirewall={() => navigateTo('ai-firewall')}
          onOpenMlGate={() => navigateTo('ml-certification')}
          onOpenMappingStudio={() => navigateTo('mapping-studio')}
          onOpenAdvisor={() => setAdvisorOpen(true)}
        />

        <CreateCustomWorkflowCard onOpenCanvas={() => navigateTo('start-thread')} />
        </>}
        <section className={filter === 'all' ? 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:bg-[#18181C]' : 'space-y-6'}>
        {/* 3. Search & Segmented Filter Bar directly below banner matching Screenshot */}
        <WorkflowsFilterBar 
          overview={filter === 'all'}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={(next) => { setFilter(next); if (next === 'all') setSearch(''); }}
          filteredCount={filteredWorkflows.length}
          totalCount={activeWorkflows.length}
        />

        {/* 4. Workflow Content Area: 4-Column Cards Grid matching Screenshot */}
        {filteredWorkflows.length === 0 ? (
          <WorkflowsEmptyState 
            searching={Boolean(search.trim())}
            onShowReady={() => {
              setFilter('draft');
              setSearch('');
            }}
            onNewWorkflow={() => navigateTo('start-thread')}
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard 
                key={workflow.id}
                workflow={workflow}
                onOpenCanvas={handleOpenCanvas}
                onRunDryRun={handleRunDryRun}
                onDelete={(wf) => setThreadToDelete(wf)}
              />
            ))}

          </div>
        )}
        </section>
      </div>

      {/* Floating Modals */}
      <UseCaseAdvisorModal 
        isOpen={advisorOpen} 
        onClose={() => setAdvisorOpen(false)} 
      />



      <ConfirmDialog 
        isOpen={!!threadToDelete}
        title="Archive Workflow"
        message={`Are you sure you want to archive "${threadToDelete?.title}"? You can restore it anytime from settings.`}
        confirmLabel="Archive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setThreadToDelete(null)}
      />
    </DataXAppShell>
  );
}
