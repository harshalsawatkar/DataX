const routes = [
  { label: 'Workflows', section: 'workflows', showCreate: true, screens: ['workflows', 'threads', 'home', ''] },
  { label: 'New workflow', section: 'workflows', screens: ['start-thread', 'new-thread', 'start-workflow', 'new-workflow'] },
  { label: 'Domain Templates', section: 'templates', screens: ['templates', 'template', 'domain-packs', 'domainpacks', 'domains'] },
  { label: 'Connections', section: 'connections', screens: ['connections', 'vault', 'datasources'] },
  { label: 'Visual Canvas', section: 'canvas', usesCanvas: true, screens: ['canvas', 'workflow-builder', 'builder'] },
  { label: 'Connect source', section: 'canvas', usesCanvas: true, screens: ['connect-source', 'source'] },
  { label: 'Generate rules', section: 'canvas', usesCanvas: true, screens: ['generate-rules', 'rules', 'ai-rules'] },
  { label: 'Connect target', section: 'canvas', usesCanvas: true, screens: ['connect-target', 'target'] },
  { label: 'Rules Engine', section: 'canvas', screens: ['rules-table', 'rules-engine'] },
  { label: 'Test in sandbox', section: 'canvas', screens: ['test-in-sandbox', 'sandbox'] },
  { label: 'Running dry run', section: 'canvas', usesCanvas: true, screens: ['running-dry-run'] },
  { label: 'Dry run results', section: 'canvas', usesCanvas: true, screens: ['dry-run-results'] },
  { label: 'Live with auto-fix', section: 'canvas', screens: ['live-auto-fix', 'live'] },
  { label: 'Quarantine Workbench', section: 'quarantine', screens: ['quarantine', 'dlq', 'quarantine-workbench'] },
  { label: 'Audit Ledger', section: 'audit', screens: ['audit', 'audit-trail', 'audit-logs', 'lineage'] },
  { label: 'Shadow Parity', section: 'shadow', screens: ['shadow', 'shadow-mode', 'shadow-reconciler', 'parity'] },
  { label: 'Executive ROI', section: 'roi', screens: ['roi', 'executive-roi', 'roi-dossier', 'dossier'] },
  { label: 'Settings & RBAC', section: 'settings', screens: ['settings', 'configuration', 'admin'] },
  { label: 'Help Center', section: 'help', screens: ['help', 'docs', 'knowledge-base', 'support'] },
  { label: 'Run Telemetry', section: 'history', screens: ['history', 'runs'] },
  { label: 'AI Firewall', section: 'ai-firewall', showCreate: true, screens: ['ai-firewall', 'firewall', 'rag-firewall', 'agent-guard'] },
  { label: 'ML Certify', section: 'ml-certify', screens: ['ml-certify', 'ml-certification', 'ml-gate', 'drift-gate'] },
  { label: 'FMD Mapping Studio', section: 'mapping-studio', screens: ['mapping-studio', 'fmd', 'fmd-mapping'] },
  { label: 'SAP BW Demo', section: 'legacy-poc', screens: ['legacy-poc'] },
  { label: 'Sign in', section: 'auth', screens: ['login', 'signin', 'sign-in'] },
  { label: 'Create account', section: 'auth', screens: ['register', 'signup', 'sign-up'] }
];

export function getStudioRoute(screen) {
  return routes.find(route => route.screens.includes(screen)) ?? { label: 'Page not found', section: null };
}
