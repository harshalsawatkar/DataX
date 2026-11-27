import React from 'react';
import WorkflowHeroDiagram from './WorkflowHeroDiagram';
import './WorkflowHeroDiagram.css';

export { WorkflowHeroDiagram as HeroIllustration };

const steps = ['Connect a source', 'Generate rules with AI', 'Test, then run live'];

export default function WorkflowsHeroBanner({ activeCount, totalCount, meanHealth, totalRuns, onToggleAutoFix, autoFixEnabled }) {
  return (
    <section className="workflow-hero">
      <div className="workflow-hero-layout">
        <div className="workflow-hero-copy">
          <p className="workflow-hero-label">AI rule builder</p>
          <h2>Describe the rules in plain English. DataX writes them, tests them and keeps them running.</h2>
          <ol className="workflow-hero-steps">
            {steps.map((step, i) => <li key={step}><b>{i + 1}</b>{step}</li>)}
          </ol>
          <dl className="workflow-hero-metrics">
            <div><dt>Active workflows</dt><dd>{activeCount} / {totalCount}</dd></div>
            <div><dt>Mean data health</dt><dd>{meanHealth}% <small>A+</small></dd></div>
            <div><dt>Runs this week</dt><dd>{totalRuns}</dd></div>
            <div><dt>Auto-fix</dt><dd>
              <button type="button" role="switch" aria-label="Auto-fix" aria-checked={autoFixEnabled} onClick={onToggleAutoFix}>
                {autoFixEnabled ? 'On' : 'Off'}<span className="workflow-hero-switch"/>
              </button>
            </dd></div>
          </dl>
        </div>
        <WorkflowHeroDiagram />
      </div>
    </section>
  );
}
