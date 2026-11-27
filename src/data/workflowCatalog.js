export const BASELINE_WORKFLOWS = [
  {
    id: 'sap_bw_s4hana',
    title: 'SAP BW → S/4HANA Clean Core Modernizer',
    domain: 'ERP modernisation',
    description: 'Extract InfoCube purchasing lines, resolve legacy plant codes and stage BAPI_PO_CREATE1 orders.',
    pipelineTag: 'SAP BW → 4 AI rules → S/4HANA',
    rulesCount: 4,
    schemaMappedPercent: 100,
    status: 'Ready to run',
    filterTag: 'ready'
  },
  {
    id: 'customer_master_reconciliation',
    title: 'Customer Master & Identity Harmonizer',
    domain: 'Customer 360',
    description: 'Harmonize customer documents from MongoDB Atlas into PostgreSQL and enforce RFC-5322 email syntax.',
    pipelineTag: 'MongoDB → 5 AI rules → PostgreSQL',
    rulesCount: 5,
    schemaMappedPercent: 100,
    status: 'Ready to run',
    filterTag: 'ready'
  },
  {
    id: 'financial_gl_ledger',
    title: 'Financial General Ledger & AP Compliance',
    domain: 'Finance & audit',
    description: 'Audit GL and AP entries across legacy systems, guarantee zero imbalance and verify ISO currency codes.',
    pipelineTag: 'ERP GL → 6 AI rules → BigQuery',
    rulesCount: 6,
    schemaMappedPercent: 100,
    status: 'Ready to run',
    filterTag: 'ready'
  },
  {
    id: 'healthcare_hipaa',
    title: 'Healthcare Patient Master & HIPAA Sanitizer',
    domain: 'Healthcare',
    description: 'Ingest HL7 and EHR records, scrub PII and cross-verify National Provider Identifiers.',
    pipelineTag: 'PostgreSQL → 4 AI rules → Warehouse',
    rulesCount: 4,
    schemaMappedPercent: 100,
    status: 'Ready to run',
    filterTag: 'ready'
  },
  {
    id: 'supply_chain_inventory',
    title: 'Supply Chain Multi-Echelon Inventory Balancer',
    domain: 'Supply chain',
    description: 'Reconcile warehouse counts with distribution-centre POs and resolve SKU naming discrepancies.',
    pipelineTag: 'AWS S3 → 5 AI rules → S/4HANA',
    rulesCount: 5,
    schemaMappedPercent: 100,
    status: 'Ready to run',
    filterTag: 'ready'
  }
];

export function getWorkflows(contextThreads = []) {
  const activeWorkflows = BASELINE_WORKFLOWS.map((base) => {
    const matchedThread = contextThreads?.find(
      t => t.id === base.id || t.domainPackId === base.id
    );
    if (!matchedThread) return base;

    return {
      ...base,
      id: matchedThread.id,
      rulesCount: matchedThread.rules?.length ?? base.rulesCount,
      status: matchedThread.status === 'live' ? 'Live' : base.status
    };
  });

  // Also include any user-created custom threads that aren't in the baseline 5
  if (Array.isArray(contextThreads)) {
    contextThreads.forEach(t => {
      const isBaseline = BASELINE_WORKFLOWS.some(b => b.id === t.id || b.id === t.domainPackId);
      if (!isBaseline && t.id) {
        activeWorkflows.push({
          id: t.id,
          title: t.name || 'Custom Workflow',
          domain: t.domain || 'Custom Domain',
          description: t.desc || 'Custom autonomous CleanFlow pipeline with node-based orchestration.',
          pipelineTag: t.pipeline || 'Source → AI rules → Target',
          rulesCount: t.rules?.length ?? 0,
          schemaMappedPercent: 100,
          health: 95.0,
          runsCount: 1,
          status: t.status === 'live' ? 'Live' : 'Draft',
          filterTag: t.status === 'live' ? 'live' : 'draft'
        });
      }
    });
  }

  return activeWorkflows;
}
