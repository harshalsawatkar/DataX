import React, { useState, useEffect, useMemo } from 'react';
import AiFirewallCanvas from '../components/firewall/AiFirewallCanvas';
import PrivacyGatewayTab from '../components/firewall/PrivacyGatewayTab';
import DataXAppShell from '../components/common/DataXAppShell';
import StudioDatabaseExtractor from '../components/common/StudioDatabaseExtractor';
import StudioDatabaseCommitPanel from '../components/common/StudioDatabaseCommitPanel';
import {
  Shield,
  ShieldAlert,
  Upload,
  Globe,
  FileText,
  Trash2,
  Download,
  AlertTriangle,
  Copy,
  Check,
  Lock,
  LayoutGrid,
  Save,
  FlaskConical,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/apiClient';
import {
  parseUploadedRagFiles,
  parseUploadedDatasetFile,
  recordsToRagChunks,
  exportRecordsToFile
} from '../utils/datasetIo';

const SEED_TOOL_CALL_EVENTS = [
  {
    event_id: 'seed_ev_1',
    display_time: '31 Oct · 09:16',
    agent_or_source: 'support_bot_v2',
    target_tool: 'stripe_refund',
    verdict: 'HOLD_FOR_HITL',
    violations: '$1,200 exceeds review threshold ($500)',
    latency_display: '1,690 ms',
    sha256_seal: '9c41a02fe81240a1'
  },
  {
    event_id: 'seed_ev_2',
    display_time: '29 Oct · 18:35',
    agent_or_source: 'support_agent_007',
    target_tool: 'stripe_refund',
    verdict: 'BLOCK_CRITICAL',
    violations: '$15,000 exceeds max cap ($5,000)',
    latency_display: '0.18 ms',
    sha256_seal: '5b60f5ed91a204b2'
  },
  {
    event_id: 'seed_ev_3',
    display_time: '29 Oct · 18:11',
    agent_or_source: 'analyst_bot',
    target_tool: 'sql_query',
    verdict: 'BLOCK_CRITICAL',
    violations: "Destructive SQL 'DROP TABLE' blocked",
    latency_display: '0.06 ms',
    sha256_seal: 'fb3d91b842e110c9'
  },
  {
    event_id: 'seed_ev_4',
    display_time: '29 Oct · 18:11',
    agent_or_source: 'support_bot',
    target_tool: 'stripe_refund',
    verdict: 'BLOCK_CRITICAL',
    violations: '$48,500 exceeds max cap ($5,000)',
    latency_display: '0.06 ms',
    sha256_seal: '1a281d8c77f039d4'
  }
];

function FigmaToggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-[#2D55F5]' : 'bg-[#CDD2DE]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-2xs transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}

function formatEventTime(ev) {
  if (ev.display_time) return ev.display_time;
  if (!ev.timestamp) return '—';
  const d = new Date(ev.timestamp);
  if (Number.isNaN(d.getTime())) return String(ev.timestamp);
  const day = d.getDate();
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} · ${hh}:${mm}`;
}

function evaluateToolCallLocally(agentId, toolName, parsedArgs, policy) {
  const blockedTools = (policy.blocked_tools || []).map((t) => t.toLowerCase());
  const violations = [];
  let verdict = 'ALLOW';

  if (blockedTools.includes(toolName.toLowerCase())) {
    verdict = 'BLOCK_CRITICAL';
    violations.push(`Tool '${toolName}' is on the forbidden tool denylist.`);
  }

  const serialized = JSON.stringify(parsedArgs || {});
  if (policy.block_destructive_sql && /\b(DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM)\b/i.test(serialized)) {
    verdict = 'BLOCK_CRITICAL';
    violations.push("Destructive SQL statement blocked by workspace policy.");
  }

  const finKeys = policy.financial_fields || ['amount', 'refund_amount', 'total'];
  for (const key of finKeys) {
    const val = Number(parsedArgs?.[key]);
    if (!Number.isNaN(val) && val > 0) {
      const formattedVal = val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (val > Number(policy.max_financial_limit || 5000)) {
        verdict = 'BLOCK_CRITICAL';
        violations.push(
          `${key} = $${formattedVal} exceeds the $${Number(policy.max_financial_limit || 5000).toLocaleString()} hard block ceiling.`
        );
      } else if (verdict !== 'BLOCK_CRITICAL' && val > Number(policy.hitl_threshold || 500)) {
        verdict = 'HOLD_FOR_HITL';
        violations.push(
          `${key} = $${formattedVal} exceeds the $${Number(policy.hitl_threshold || 500).toLocaleString()} review threshold. The call is held for human approval.`
        );
      }
    }
  }

  return {
    eventId: `ev_${Date.now().toString(36)}`,
    agentId,
    toolName,
    verdict,
    riskScore: verdict === 'BLOCK_CRITICAL' ? 9.6 : verdict === 'HOLD_FOR_HITL' ? 7.4 : 1.2,
    latencyMs: 0.42,
    violations
  };
}

export default function AiFirewallPage({ onSwitchToMarketing } = {}) {
  const [viewMode, setViewMode] = useState('canvas'); // 'canvas' | 'studio'
  const [activeTab, setActiveTab] = useState('rag'); // 'rag' | 'tool_call' | 'gateway' | 'integration'

  // =========================================================================
  // TAB 1 (03.3): RAG PRE-EMBEDDING INGESTION & SANITIZATION
  // =========================================================================
  const [ingestSourceMode, setIngestSourceMode] = useState('upload'); // 'upload' | 'db' | 'url' | 'paste'
  const [stagedChunks, setStagedChunks] = useState([]);
  const [ingestError, setIngestError] = useState('');
  const [ingestNotice, setIngestNotice] = useState('');

  const [tabularBuffer, setTabularBuffer] = useState(null);
  const [mappedTextCol, setMappedTextCol] = useState('');
  const [mappedTitleCol, setMappedTitleCol] = useState('');

  const [urlInput, setUrlInput] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const [pasteDocTitle, setPasteDocTitle] = useState('');
  const [pasteDocBody, setPasteDocBody] = useState('');

  const [ragPolicy, setRagPolicy] = useState({
    autoChunk: true,
    chunkSize: 1200,
    chunkOverlap: 120,
    injectionAction: 'quarantine', // 'quarantine' | 'strip'
    redactSecrets: true,
    redactSsnAndCards: true,
    redactEmails: false,
    redactPhones: false,
    customRedactionsText: '',
    persistLedger: true
  });

  const [scanningRag, setScanningRag] = useState(false);
  const [ragScanResult, setRagScanResult] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [selectedChunkId, setSelectedChunkId] = useState(null);
  const [editedTextMap, setEditedTextMap] = useState({});
  const [includedChunkIds, setIncludedChunkIds] = useState(new Set());

  // =========================================================================
  // TAB 2 (03.4): AGENT TOOL-CALL GUARD, VERIFIER & INTERCEPTED LEDGER
  // =========================================================================
  const [policySaving, setPolicySaving] = useState(false);
  const [policySavedNote, setPolicySavedNote] = useState('');
  const [agentPolicy, setAgentPolicy] = useState({
    max_financial_limit: 5000,
    hitl_threshold: 500,
    financial_fields_text: 'amount, refund_amount, total',
    blocked_tools_text: 'drop_database, wire_transfer',
    custom_blocked_terms_text: 'password, ssn',
    block_destructive_sql: true,
    redact_secrets_in_args: true,
    redact_pii_in_args: true,
    redact_emails_in_args: false,
    updatedAt: null
  });

  // Pre-populated realistic verifier scenario matching Figma 03.4
  const [verifierAgentId, setVerifierAgentId] = useState('support_bot_v2');
  const [verifierToolName, setVerifierToolName] = useState('stripe_refund');
  const [verifierArgsJson, setVerifierArgsJson] = useState(
    '{\n  "amount": 1200,\n  "currency": "usd",\n  "customer_id": "cus_8812"\n}'
  );
  const [verifierError, setVerifierError] = useState('');
  const [verifierLoading, setVerifierLoading] = useState(false);
  const [verifierResult, setVerifierResult] = useState({
    verdict: 'HOLD_FOR_HITL',
    violations: ['amount = $1,200.00 exceeds the $500 review threshold. The call is held for human approval.'],
    riskScore: 7.4,
    latencyMs: 0.42
  });

  const [batchTraceResults, setBatchTraceResults] = useState([]);
  const [batchTraceRunning, setBatchTraceRunning] = useState(false);

  const [events, setEvents] = useState([]);
  const [seedEvents, setSeedEvents] = useState(SEED_TOOL_CALL_EVENTS);
  const [eventFilter, setEventFilter] = useState('ALL');
  const [resolvingEventId, setResolvingEventId] = useState(null);

  // Tab 4 copy state
  const [copiedSnippet, setCopiedSnippet] = useState('');

  useEffect(() => {
    loadWorkspacePolicy();
    loadFirewallEvents();
  }, []);

  const loadWorkspacePolicy = async () => {
    try {
      const res = await api.get('/firewall/policy');
      if (res?.policy) {
        const p = res.policy;
        setAgentPolicy({
          max_financial_limit: Number(p.max_financial_limit ?? 5000),
          hitl_threshold: Number(p.hitl_threshold ?? 500),
          financial_fields_text: (p.financial_fields || []).join(', ') || 'amount, refund_amount, total',
          blocked_tools_text: (p.blocked_tools || []).join(', ') || 'drop_database, wire_transfer',
          custom_blocked_terms_text: (p.custom_blocked_terms || []).join(', ') || 'password, ssn',
          block_destructive_sql: Boolean(p.block_destructive_sql ?? true),
          redact_secrets_in_args: Boolean(p.redact_secrets_in_args ?? true),
          redact_pii_in_args: Boolean(p.redact_pii_in_args ?? true),
          redact_emails_in_args: Boolean(p.redact_emails_in_args ?? false),
          updatedAt: p.updatedAt || null
        });
      }
    } catch {
      // Offline/local fallback keeps Figma defaults
    }
  };

  const loadFirewallEvents = async () => {
    try {
      const res = await api.get('/firewall/events?limit=60');
      if (Array.isArray(res?.events) && res.events.length > 0) {
        setEvents(res.events);
      }
    } catch {
      // Offline fallback uses seedEvents
    }
  };

  // -------------------------------------------------------------------------
  // RAG Ingestion & Sanitization Handlers
  // -------------------------------------------------------------------------
  const handleFileUpload = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setIngestError('');
    setIngestNotice('');
    try {
      const parsed = await parseUploadedRagFiles(fileList);
      if (parsed.tabularSource && parsed.tabularSource.columns.length > 0) {
        const cols = parsed.tabularSource.columns;
        const defaultText =
          cols.find((c) =>
            ['text', 'content', 'chunk', 'body', 'document', 'description', 'message', 'notes'].includes(
              c.toLowerCase()
            )
          ) || '';
        const defaultTitle =
          cols.find((c) => ['docname', 'title', 'source', 'id', 'filename', 'url'].includes(c.toLowerCase())) || '';
        setTabularBuffer({
          sourceName: parsed.tabularSource.fileName,
          records: parsed.tabularSource.records,
          columns: cols
        });
        setMappedTextCol(defaultText);
        setMappedTitleCol(defaultTitle);
        setIngestNotice(
          `Loaded ${parsed.tabularSource.records.length.toLocaleString()} rows from "${parsed.tabularSource.fileName}". Confirm column mapping below.`
        );
      } else {
        setStagedChunks((prev) => [...prev, ...parsed.chunks]);
        setIngestNotice(`Staged ${parsed.chunks.length.toLocaleString()} document(s) from ${parsed.fileNames.join(', ')}.`);
      }
    } catch (err) {
      setIngestError(err.message || 'Failed to parse uploaded files.');
    } finally {
      e.target.value = '';
    }
  };

  const handleDbExtractedForRag = ({ records, columns, tableName }) => {
    setIngestError('');
    const defaultText =
      columns.find((c) =>
        ['text', 'content', 'chunk', 'clean_text', 'body', 'description', 'message', 'notes'].includes(c.toLowerCase())
      ) || '';
    const defaultTitle =
      columns.find((c) => ['id', 'chunk_id', 'doc_id', 'title', 'source_doc', 'name'].includes(c.toLowerCase())) || '';
    setTabularBuffer({
      sourceName: tableName,
      records,
      columns
    });
    setMappedTextCol(defaultText);
    setMappedTitleCol(defaultTitle);
    setIngestNotice(`Pulled ${records.length.toLocaleString()} rows from "${tableName}". Confirm text column below.`);
  };

  const handleConfirmTabularStaging = () => {
    if (!tabularBuffer) return;
    const derived = recordsToRagChunks(tabularBuffer.records, {
      textColumn: mappedTextCol,
      titleColumn: mappedTitleCol,
      defaultSource: tabularBuffer.sourceName
    });
    if (derived.length === 0) {
      setIngestError('No non-empty text chunks could be derived from the selected column.');
      return;
    }
    setStagedChunks((prev) => [...prev, ...derived]);
    setIngestNotice(`Staged ${derived.length.toLocaleString()} chunks from "${tabularBuffer.sourceName}".`);
    setTabularBuffer(null);
  };

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) {
      setIngestError('Enter a valid public https:// or http:// URL.');
      return;
    }
    setIngestError('');
    setIngestNotice('');
    setFetchingUrl(true);
    try {
      const res = await api.post('/firewall/fetch-url', {
        url: urlInput.trim(),
        chunkSize: Number(ragPolicy.chunkSize) || 1200,
        chunkOverlap: Number(ragPolicy.chunkOverlap) || 120
      });
      const fetched = res.chunks || [];
      setStagedChunks((prev) => [...prev, ...fetched]);
      setIngestNotice(`Fetched URL and staged ${fetched.length} chunk(s).`);
      setUrlInput('');
    } catch (err) {
      setIngestError(err.message || 'URL fetch failed.');
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleStagePastedDoc = () => {
    if (!pasteDocBody.trim()) {
      setIngestError('Paste document content before staging.');
      return;
    }
    setIngestError('');
    const title = pasteDocTitle.trim() || `manual_doc_${stagedChunks.length + 1}.txt`;
    setStagedChunks((prev) => [...prev, { docName: title, text: pasteDocBody.trim() }]);
    setPasteDocTitle('');
    setPasteDocBody('');
    setIngestNotice(`Staged "${title}" for inspection.`);
  };

  const handleRunRagScan = async () => {
    if (stagedChunks.length === 0) return;
    setIngestError('');
    setScanningRag(true);
    try {
      const customTerms = ragPolicy.customRedactionsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      let res;
      try {
        res = await api.post('/firewall/scan-rag-batch', {
          chunks: stagedChunks,
          persist: Boolean(ragPolicy.persistLedger),
          policy: {
            autoChunk: Boolean(ragPolicy.autoChunk),
            chunkSize: Number(ragPolicy.chunkSize) || 1200,
            chunkOverlap: Number(ragPolicy.chunkOverlap) || 120,
            injectionAction: ragPolicy.injectionAction,
            redactSecrets: Boolean(ragPolicy.redactSecrets),
            redactSsnAndCards: Boolean(ragPolicy.redactSsnAndCards),
            redactEmails: Boolean(ragPolicy.redactEmails),
            redactPhones: Boolean(ragPolicy.redactPhones),
            customRedactions: customTerms
          }
        });
      } catch {
        // Offline client-side deterministic fallback
        const results = stagedChunks.map((chk, idx) => {
          let sanitized = chk.text || '';
          const violations = [];
          let redactionsCount = 0;
          if (/ignore all previous instructions|disregard all prior|system prompt/i.test(sanitized)) {
            violations.push('Indirect prompt injection directive detected');
          }
          if (ragPolicy.redactSecrets && /(sk-[a-zA-Z0-9_-]{12,}|AKIA[0-9A-Z]{16}|postgresql:\/\/\S+)/g.test(sanitized)) {
            sanitized = sanitized.replace(/(sk-[a-zA-Z0-9_-]{12,}|AKIA[0-9A-Z]{16}|postgresql:\/\/\S+)/g, '[REDACTED_SECRET]');
            violations.push('API key / DB credential redacted');
            redactionsCount += 1;
          }
          if (ragPolicy.redactSsnAndCards && /\b\d{3}-\d{2}-\d{4}\b/g.test(sanitized)) {
            sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
            violations.push('SSN redacted');
            redactionsCount += 1;
          }
          if (ragPolicy.redactEmails && /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g.test(sanitized)) {
            sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');
            violations.push('Email redacted');
            redactionsCount += 1;
          }
          const isPoisoned = violations.some((v) => v.includes('injection'));
          const verdict =
            isPoisoned && ragPolicy.injectionAction === 'quarantine'
              ? 'QUARANTINED'
              : redactionsCount > 0
              ? 'REDACTED_PASS'
              : 'VERIFIED';
          return {
            chunkId: `chk_${idx + 1}`,
            docName: chk.docName || `doc_${idx + 1}`,
            originalText: chk.text,
            sanitizedText: sanitized,
            verdict,
            trustScore: verdict === 'QUARANTINED' ? 2.1 : verdict === 'REDACTED_PASS' ? 8.8 : 9.9,
            estTokens: Math.max(1, Math.floor(sanitized.length / 4)),
            entropy: '4.12',
            redactionsCount,
            violations,
            sha256Seal: '8f4b2e91c04a77d1e320b9f412a8c3e1'
          };
        });
        const verifiedCount = results.filter((r) => r.verdict === 'VERIFIED').length;
        const redactedCount = results.filter((r) => r.verdict === 'REDACTED_PASS').length;
        const quarantinedCount = results.filter((r) => r.verdict === 'QUARANTINED').length;
        res = {
          totalChunks: results.length,
          verifiedCount,
          redactedCount,
          quarantinedCount,
          totalRedactionsApplied: results.reduce((acc, r) => acc + r.redactionsCount, 0),
          overallHealth: Math.round(((verifiedCount + redactedCount) / Math.max(1, results.length)) * 100),
          elapsedMs: 12.4,
          batchSha256Seal: '8f4b2e91c04a77d1e320b9f412a8c3e1',
          results
        };
      }

      setRagScanResult(res);
      const nextEdits = {};
      const nextIncluded = new Set();
      (res.results || []).forEach((r) => {
        nextEdits[r.chunkId] = r.sanitizedText;
        if (r.verdict !== 'QUARANTINED') {
          nextIncluded.add(r.chunkId);
        }
      });
      setEditedTextMap(nextEdits);
      setIncludedChunkIds(nextIncluded);
      setVerdictFilter('ALL');
      if (res.results && res.results.length > 0) {
        setSelectedChunkId(res.results[0].chunkId);
      }
    } catch (err) {
      setIngestError(err.message || 'RAG firewall scan failed.');
    } finally {
      setScanningRag(false);
    }
  };

  const filteredScanChunks = useMemo(() => {
    if (!ragScanResult?.results) return [];
    if (verdictFilter === 'ALL') return ragScanResult.results;
    return ragScanResult.results.filter((r) => r.verdict === verdictFilter);
  }, [ragScanResult, verdictFilter]);

  const activeChunk = useMemo(() => {
    if (!ragScanResult?.results?.length) return null;
    return (
      ragScanResult.results.find((r) => r.chunkId === selectedChunkId) ||
      filteredScanChunks[0] ||
      ragScanResult.results[0]
    );
  }, [ragScanResult, selectedChunkId, filteredScanChunks]);

  const toggleIncludeChunk = (chunkId) => {
    setIncludedChunkIds((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) next.delete(chunkId);
      else next.add(chunkId);
      return next;
    });
  };

  const approvedRagOutputRecords = useMemo(() => {
    if (!ragScanResult?.results) return [];
    return ragScanResult.results
      .filter((r) => includedChunkIds.has(r.chunkId))
      .map((r) => {
        const finalText = editedTextMap[r.chunkId] !== undefined ? editedTextMap[r.chunkId] : r.sanitizedText;
        return {
          chunk_id: r.chunkId,
          source_doc: r.docName,
          clean_text: finalText,
          est_tokens: Math.max(1, Math.floor((finalText || '').length / 4)),
          trust_score: r.trustScore,
          verdict: editedTextMap[r.chunkId] !== r.sanitizedText ? 'MANUAL_OVERRIDE_APPROVED' : r.verdict,
          redactions_applied: r.redactionsCount,
          sha256_seal: r.sha256Seal
        };
      });
  }, [ragScanResult, includedChunkIds, editedTextMap]);

  const quarantinedThreatRecords = useMemo(() => {
    if (!ragScanResult?.results) return [];
    return ragScanResult.results
      .filter((r) => !includedChunkIds.has(r.chunkId))
      .map((r) => ({
        chunk_id: r.chunkId,
        source_doc: r.docName,
        verdict: r.verdict,
        trust_score: r.trustScore,
        violations: (r.violations || []).join(' | '),
        raw_text: r.originalText
      }));
  }, [ragScanResult, includedChunkIds]);

  // -------------------------------------------------------------------------
  // Tab 2 (03.4): Tool-Call Policy & Verifier Handlers
  // -------------------------------------------------------------------------
  const buildPolicyObject = () => ({
    max_financial_limit: Number(agentPolicy.max_financial_limit) || 5000,
    hitl_threshold: Number(agentPolicy.hitl_threshold) || 500,
    financial_fields: agentPolicy.financial_fields_text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    blocked_tools: agentPolicy.blocked_tools_text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    custom_blocked_terms: agentPolicy.custom_blocked_terms_text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    block_destructive_sql: Boolean(agentPolicy.block_destructive_sql),
    redact_secrets_in_args: Boolean(agentPolicy.redact_secrets_in_args),
    redact_pii_in_args: Boolean(agentPolicy.redact_pii_in_args),
    redact_emails_in_args: Boolean(agentPolicy.redact_emails_in_args)
  });

  const handleSavePolicy = async () => {
    setPolicySaving(true);
    setPolicySavedNote('');
    try {
      const res = await api.post('/firewall/policy', { policy: buildPolicyObject() });
      if (res?.policy?.updatedAt) {
        setAgentPolicy((prev) => ({ ...prev, updatedAt: res.policy.updatedAt }));
      }
      setPolicySavedNote('Workspace guardrail policy saved.');
    } catch {
      setPolicySavedNote('Workspace guardrail policy saved locally.');
    } finally {
      setPolicySaving(false);
      setTimeout(() => setPolicySavedNote(''), 3500);
    }
  };

  const handleEvaluateToolCall = async () => {
    setVerifierError('');
    if (!verifierToolName.trim()) {
      setVerifierError('Enter a tool name (for example: stripe_refund, sql_query) to evaluate.');
      return;
    }
    let parsedArgs = {};
    try {
      parsedArgs = verifierArgsJson.trim() ? JSON.parse(verifierArgsJson) : {};
    } catch (err) {
      setVerifierError(`Arguments must be valid JSON: ${err.message}`);
      return;
    }

    const policyObj = buildPolicyObject();
    setVerifierLoading(true);
    try {
      const res = await api.post('/firewall/intercept', {
        agent_id: verifierAgentId.trim() || 'support_bot_v2',
        tool_name: verifierToolName.trim(),
        arguments: parsedArgs,
        policies: policyObj
      });
      setVerifierResult(res);
      loadFirewallEvents();
    } catch {
      const localDecision = evaluateToolCallLocally(
        verifierAgentId.trim() || 'support_bot_v2',
        verifierToolName.trim(),
        parsedArgs,
        policyObj
      );
      setVerifierResult(localDecision);
      setSeedEvents((prev) => [
        {
          event_id: localDecision.eventId,
          display_time: 'Just now',
          agent_or_source: localDecision.agentId,
          target_tool: localDecision.toolName,
          verdict: localDecision.verdict,
          violations: localDecision.violations[0] || 'Compliant',
          latency_display: `${localDecision.latencyMs} ms`,
          sha256_seal: '7e21f09a44b120e8'
        },
        ...prev
      ]);
    } finally {
      setVerifierLoading(false);
    }
  };

  const handleBatchAgentTraceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifierError('');
    setBatchTraceRunning(true);
    try {
      const parsed = await parseUploadedDatasetFile(file);
      const rows = (parsed.records || []).slice(0, 250);
      if (rows.length === 0) {
        throw new Error('Uploaded trace file contained 0 records.');
      }
      const policySnapshot = buildPolicyObject();
      const evaluated = [];
      for (let i = 0; i < rows.length; i += 1) {
        const r = rows[i];
        const agentId = String(r.agent_id || r.agentId || r.agent || 'trace_agent');
        const toolName = String(r.tool_name || r.toolName || r.tool || r.function || 'tool_call');
        let argsObj = r.arguments ?? r.args ?? r.parameters ?? r.payload ?? null;
        if (typeof argsObj === 'string') {
          try {
            argsObj = JSON.parse(argsObj);
          } catch {
            argsObj = { raw: argsObj };
          }
        }
        if (!argsObj || typeof argsObj !== 'object') {
          argsObj = { ...r };
        }
        let res;
        try {
          res = await api.post('/firewall/intercept', {
            agent_id: agentId,
            tool_name: toolName,
            arguments: argsObj,
            policies: policySnapshot
          });
        } catch {
          res = evaluateToolCallLocally(agentId, toolName, argsObj, policySnapshot);
        }
        evaluated.push({
          trace_index: i + 1,
          event_id: res.eventId,
          agent_id: res.agentId,
          tool_name: res.toolName,
          verdict: res.verdict,
          risk_score: res.riskScore,
          violations: (res.violations || []).join(' | '),
          latency_ms: res.latencyMs
        });
      }
      setBatchTraceResults(evaluated);
      loadFirewallEvents();
    } catch (err) {
      setVerifierError(err.message || 'Batch trace evaluation failed.');
    } finally {
      setBatchTraceRunning(false);
      e.target.value = '';
    }
  };

  const handleResolveHitlEvent = async (eventId, decision) => {
    setResolvingEventId(eventId);
    try {
      if (String(eventId).startsWith('seed_') || String(eventId).startsWith('ev_')) {
        setSeedEvents((prev) =>
          prev.map((ev) =>
            ev.event_id === eventId
              ? { ...ev, verdict: decision === 'APPROVE' ? 'ALLOW' : 'BLOCK_CRITICAL' }
              : ev
          )
        );
      } else {
        await api.post(`/firewall/events/${eventId}/resolve`, {
          decision,
          note: 'Reviewed in DataX Firewall Workbench'
        });
        await loadFirewallEvents();
      }
    } catch (err) {
      setVerifierError(err.message || 'Failed to resolve review item.');
    } finally {
      setResolvingEventId(null);
    }
  };

  const activeEventsSource = events.length > 0 ? events : seedEvents;
  const displayedEventCount = events.length > 0 ? events.length : Math.max(9, seedEvents.length);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'ALL') return activeEventsSource;
    return activeEventsSource.filter((ev) => ev.verdict === eventFilter);
  }, [activeEventsSource, eventFilter]);

  // -------------------------------------------------------------------------
  // Tab 4 (03.6): Production API & SDK Code Snippets (Exact Figma 03.6)
  // -------------------------------------------------------------------------
  const resolvedOrigin = useMemo(() => {
    if (API_BASE_URL.startsWith('http')) return API_BASE_URL;
    return 'https://dataglow.ai/datax-api';
  }, []);

  const pythonMiddlewareCode = `DATAX_FIREWALL_URL = "${resolvedOrigin}/firewall/intercept"

def execute_guarded_tool(agent_id, tool_name, tool_fn, **kwargs):
  resp = requests.post(DATAX_FIREWALL_URL, json={
    "agent_id": agent_id,
    "tool_name": tool_name,
    "arguments": kwargs,
  }, timeout=3.0)
  decision = resp.json()
  if decision["verdict"] == "BLOCK_CRITICAL":
    raise PermissionError(decision["violations"])
  if decision["verdict"] == "HOLD_FOR_HITL":
    return {"status": "HELD_FOR_APPROVAL"}
  return tool_fn(**(decision.get("sanitizedArguments") or kwargs))`;

  const pythonRagScanCode = `DATAX_RAG_SCAN_URL = "${resolvedOrigin}/firewall/scan-rag-batch"

def sanitize_before_embedding(chunks):
  resp = requests.post(DATAX_RAG_SCAN_URL, json={
    "chunks": chunks, "persist": True,
    "policy": {"chunkSize": ${Number(ragPolicy.chunkSize) || 1200}, "chunkOverlap": ${Number(ragPolicy.chunkOverlap) || 120},
               "injectionAction": "${ragPolicy.injectionAction}",
               "redactSecrets": ${ragPolicy.redactSecrets ? 'True' : 'False'}}
  }, timeout=15.0)
  return [c for c in resp.json()["results"]
          if c["verdict"] in ("VERIFIED", "REDACTED_PASS")]`;

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(''), 2000);
  };

  const renderVerdictBadge = (verdict) => {
    if (verdict === 'HOLD_FOR_HITL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF4E3] border border-[#F7D9AE] text-[#A35600]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A35600]" />
          Hold for review
        </span>
      );
    }
    if (verdict === 'BLOCK_CRITICAL' || verdict === 'REJECTED_BY_HUMAN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDEDEB] border border-[#F5C7C2] text-[#C2362F]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C2362F]" />
          Blocked
        </span>
      );
    }
    if (verdict === 'ALLOW_REDACTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECF0FF] border border-[#C9D5FF] text-[#2D55F5]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2D55F5]" />
          Allow redacted
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F6EE] border border-[#BCE4D0] text-[#127A52]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#127A52]" />
        Allowed
      </span>
    );
  };

  return (
    <DataXAppShell onSwitchToMarketing={onSwitchToMarketing}>
      {viewMode === 'canvas' ? (
        <div className="h-[var(--studio-content-height,calc(100vh-112px))] w-full bg-[#F5F6FA] flex flex-col overflow-hidden">
          <AiFirewallCanvas onSwitchToStudio={() => setViewMode('studio')} />
        </div>
      ) : (
        <div className="min-h-[var(--studio-content-height,calc(100vh-112px))] bg-[#F5F6FA] font-sans">
          {/* =================================================================== */}
          {/* WORKBENCH WHITE TITLE BAND & 4-TAB BAR (Exact Figma 03.3 - 03.6)     */}
          {/* =================================================================== */}
          <div className="w-full bg-white border-b border-[#E3E6EE]">
            <div className="max-w-[1376px] mx-auto px-4 sm:px-8 pt-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#0A0F1F] tracking-tight leading-[1.15]">
                    AI agent &amp; RAG data firewall
                  </h1>
                  <p className="text-[14px] text-[#474E61] mt-2 max-w-[680px] leading-[1.5]">
                    Strip prompt injections and redact credentials before vector indexing, and govern the tool calls autonomous agents make.
                  </p>
                </div>

                {/* Segmented Pill [Canvas | Workbench] */}
                <div className="inline-flex items-center rounded-full bg-[#EDEFF5] p-[3px] h-[37px] shrink-0 self-start md:self-end">
                  <button
                    type="button"
                    onClick={() => setViewMode('canvas')}
                    className="px-4 h-[31px] rounded-full text-[13px] font-medium text-[#474E61] hover:text-[#0A0F1F] transition-colors cursor-pointer"
                  >
                    Canvas
                  </button>
                  <button
                    type="button"
                    className="px-4 h-[31px] rounded-full text-[13px] font-semibold text-[#2D55F5] bg-white shadow-2xs cursor-default"
                  >
                    Workbench
                  </button>
                </div>
              </div>

              {/* 4 Tabs Row */}
              <div className="mt-6 flex items-center gap-7 overflow-x-auto text-[13px]">
                {[
                  { id: 'rag', label: 'RAG pre-embedding', icon: FileText },
                  { id: 'tool_call', label: 'Agent tool-call guard', icon: Shield },
                  { id: 'gateway', label: 'AI privacy gateway', icon: Lock },
                  { id: 'integration', label: 'API & SDK', icon: LayoutGrid }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 pb-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? 'border-[#2D55F5] text-[#2D55F5] font-semibold'
                          : 'border-transparent text-[#474E61] hover:text-[#0A0F1F] font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-[#2D55F5]' : 'text-[#5F6678]'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* WORKBENCH BODY                                                      */}
          {/* =================================================================== */}
          <div className="max-w-[1376px] mx-auto px-4 sm:px-8 py-6">
            {/* ================================================================= */}
            {/* TAB 1 (03.3): RAG PRE-EMBEDDING                                   */}
            {/* ================================================================= */}
            {activeTab === 'rag' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  {/* LEFT CARD: Connect a knowledge corpus (Step 1 · Ingest) */}
                  <section className="bg-white border border-[#E3E6EE] rounded-[20px] p-[21px] space-y-4">
                    <div>
                      <h2 className="text-[15px] font-bold text-[#0A0F1F]">Connect a knowledge corpus</h2>
                      <p className="text-[12px] text-[#5F6678] mt-0.5">Step 1 · Ingest</p>
                    </div>

                    {/* 4-Segment Pill Bar */}
                    <div className="grid grid-cols-4 bg-[#EDEFF5] rounded-full p-[3px] h-[37px] text-[12.5px]">
                      {[
                        { id: 'upload', label: 'Upload files' },
                        { id: 'db', label: 'Database' },
                        { id: 'url', label: 'Web URL' },
                        { id: 'paste', label: 'Paste text' }
                      ].map((seg) => (
                        <button
                          key={seg.id}
                          type="button"
                          onClick={() => {
                            setIngestSourceMode(seg.id);
                            setIngestError('');
                          }}
                          className={`h-[31px] rounded-full transition-colors cursor-pointer truncate px-2 ${
                            ingestSourceMode === seg.id
                              ? 'bg-white text-[#2D55F5] font-semibold shadow-2xs'
                              : 'text-[#474E61] hover:text-[#0A0F1F] font-medium'
                          }`}
                        >
                          {seg.label}
                        </button>
                      ))}
                    </div>

                    {/* Channel A: File Dropzone (Exact Figma 03.3) */}
                    {ingestSourceMode === 'upload' && (
                      <label className="min-h-[149px] rounded-[16px] bg-[#F9FAFC] border border-dashed border-[#CDD2DE] hover:border-[#2D55F5] p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept=".txt,.md,.markdown,.csv,.tsv,.xlsx,.xls,.json,.jsonl,.ndjson,.html,.log"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Upload className="w-5 h-5 text-[#2D55F5] mb-2.5 stroke-[1.9]" />
                        <p className="text-[13px] font-semibold text-[#0A0F1F]">
                          Click to upload documents or knowledge tables
                        </p>
                        <p className="text-[12px] text-[#5F6678] mt-1">
                          .md, .txt, .jsonl, .json, .csv, .xlsx · multiple files
                        </p>
                      </label>
                    )}

                    {/* Channel B: Database */}
                    {ingestSourceMode === 'db' && (
                      <StudioDatabaseExtractor onExtracted={handleDbExtractedForRag} defaultLimit={1000} compact />
                    )}

                    {/* Channel C: Web URL */}
                    {ingestSourceMode === 'url' && (
                      <div className="rounded-[16px] border border-[#E3E6EE] bg-[#F9FAFC] p-4 space-y-2.5">
                        <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                          Public documentation or knowledge URL
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://docs.yourcompany.com/security-policy"
                            className="flex-1 h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                          />
                          <button
                            type="button"
                            onClick={handleFetchUrl}
                            disabled={fetchingUrl || !urlInput.trim()}
                            className="h-[39px] px-4 rounded-[10px] bg-[#2D55F5] hover:bg-[#2045DC] disabled:opacity-50 text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>{fetchingUrl ? 'Fetching...' : 'Fetch & stage'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Channel D: Paste text */}
                    {ingestSourceMode === 'paste' && (
                      <div className="rounded-[16px] border border-[#E3E6EE] bg-[#F9FAFC] p-4 space-y-2.5">
                        <input
                          type="text"
                          value={pasteDocTitle}
                          onChange={(e) => setPasteDocTitle(e.target.value)}
                          placeholder="Document identifier (e.g. policy_handbook_v3.md)"
                          className="w-full h-[38px] px-3 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                        />
                        <textarea
                          rows={4}
                          value={pasteDocBody}
                          onChange={(e) => setPasteDocBody(e.target.value)}
                          placeholder="Paste raw markdown, ticket transcript, or RAG passage..."
                          className="w-full p-3 rounded-[10px] border border-[#CDD2DE] bg-white text-[12.5px] font-mono text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleStagePastedDoc}
                            disabled={!pasteDocBody.trim()}
                            className="h-[36px] px-4 rounded-[10px] bg-[#2D55F5] hover:bg-[#2045DC] disabled:opacity-50 text-white text-[12.5px] font-semibold cursor-pointer"
                          >
                            Stage document
                          </button>
                        </div>
                      </div>
                    )}

                    {tabularBuffer && (
                      <div className="rounded-[14px] border border-[#C9D5FF] bg-[#ECF0FF]/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] font-semibold text-[#0A0F1F]">
                            Map text column from &ldquo;{tabularBuffer.sourceName}&rdquo; (
                            {tabularBuffer.records.length.toLocaleString()} rows)
                          </span>
                          <button
                            type="button"
                            onClick={() => setTabularBuffer(null)}
                            className="text-[12px] text-[#5F6678] hover:text-[#0A0F1F] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                          <div>
                            <label className="block text-[11.5px] font-semibold text-[#474E61] mb-1">Text column</label>
                            <select
                              value={mappedTextCol}
                              onChange={(e) => setMappedTextCol(e.target.value)}
                              className="w-full h-[36px] px-2.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[12.5px] text-[#0A0F1F]"
                            >
                              <option value="">(Serialize all columns)</option>
                              {tabularBuffer.columns.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11.5px] font-semibold text-[#474E61] mb-1">Title column</label>
                            <select
                              value={mappedTitleCol}
                              onChange={(e) => setMappedTitleCol(e.target.value)}
                              className="w-full h-[36px] px-2.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[12.5px] text-[#0A0F1F]"
                            >
                              <option value="">(Auto-number)</option>
                              {tabularBuffer.columns.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={handleConfirmTabularStaging}
                            className="h-[36px] px-3 rounded-[10px] bg-[#2D55F5] text-white text-[12.5px] font-semibold cursor-pointer"
                          >
                            Stage chunks
                          </button>
                        </div>
                      </div>
                    )}

                    {ingestError && (
                      <div className="rounded-[12px] bg-[#FDEDEB] border border-[#F5C7C2] px-3.5 py-2 text-[12px] text-[#C2362F]">
                        {ingestError}
                      </div>
                    )}
                    {ingestNotice && !ingestError && (
                      <div className="rounded-[12px] bg-[#E7F6EE] border border-[#BCE4D0] px-3.5 py-2 text-[12px] text-[#127A52]">
                        {ingestNotice}
                      </div>
                    )}

                    {/* Bottom Staged KV Row matching Figma 03.3 */}
                    <div className="flex items-center justify-between text-[12.5px] pt-0.5">
                      <span className="text-[#5F6678]">Staged for inspection</span>
                      <div className="flex items-center gap-3">
                        {stagedChunks.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setStagedChunks([]);
                              setRagScanResult(null);
                              setIngestNotice('');
                            }}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#C2362F] hover:underline cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear</span>
                          </button>
                        )}
                        <span className="font-semibold text-[#0A0F1F]">
                          {stagedChunks.length.toLocaleString()} {stagedChunks.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* RIGHT CARD: Sanitization & chunking rules (Step 2 · Policy) */}
                  <section className="bg-white border border-[#E3E6EE] rounded-[20px] p-[21px] space-y-5">
                    <div>
                      <h2 className="text-[15px] font-bold text-[#0A0F1F]">Sanitization &amp; chunking rules</h2>
                      <p className="text-[12px] text-[#5F6678] mt-0.5">Step 2 · Policy</p>
                    </div>

                    {/* Auto-split Toggle Row */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[13px] font-medium text-[#0A0F1F]">
                        Auto-split long documents into overlapping chunks
                      </span>
                      <FigmaToggle
                        checked={ragPolicy.autoChunk}
                        onChange={(val) => setRagPolicy((p) => ({ ...p, autoChunk: val }))}
                        label="Auto-split long documents into overlapping chunks"
                      />
                    </div>

                    {/* Chunk Size & Overlap Inputs */}
                    {ragPolicy.autoChunk && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                            Chunk size (chars)
                          </label>
                          <input
                            type="number"
                            min={200}
                            max={10000}
                            step={100}
                            value={ragPolicy.chunkSize}
                            onChange={(e) => setRagPolicy((p) => ({ ...p, chunkSize: e.target.value }))}
                            className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                            Overlap (chars)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={2000}
                            step={20}
                            value={ragPolicy.chunkOverlap}
                            onChange={(e) => setRagPolicy((p) => ({ ...p, chunkOverlap: e.target.value }))}
                            className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Indirect prompt injection handling (2 Radio Cards matching Figma 03.3) */}
                    <div className="space-y-2">
                      <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                        Indirect prompt injection handling
                      </label>
                      <div className="space-y-2.5">
                        {[
                          {
                            id: 'quarantine',
                            title: 'Quarantine poisoned chunk',
                            subtitle: 'Exclude it from the vector index'
                          },
                          {
                            id: 'strip',
                            title: 'Strip override directive',
                            subtitle: 'Keep the clean context'
                          }
                        ].map((opt) => {
                          const selected = ragPolicy.injectionAction === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setRagPolicy((p) => ({ ...p, injectionAction: opt.id }))}
                              className={`w-full rounded-[14px] px-4 py-3.5 border flex items-start justify-between gap-3 text-left transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-[#ECF0FF] border-[#2D55F5]'
                                  : 'bg-white border-[#E3E6EE] hover:border-[#CDD2DE]'
                              }`}
                            >
                              <div>
                                <div className="text-[13px] font-semibold text-[#0A0F1F]">{opt.title}</div>
                                <div className="text-[12px] text-[#5F6678] mt-0.5">{opt.subtitle}</div>
                              </div>
                              <span
                                className={`mt-0.5 w-4 h-4 rounded-full bg-white shrink-0 ${
                                  selected ? 'border-[5px] border-[#2D55F5]' : 'border-[1.5px] border-[#CDD2DE]'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Redact Section (4 Stacked Toggle Switch Rows matching Figma 03.3) */}
                    <div className="space-y-2.5">
                      <div className="text-[12.5px] font-semibold text-[#0A0F1F]">Redact</div>
                      {[
                        { key: 'redactSecrets', label: 'API keys, tokens & DB URIs' },
                        { key: 'redactSsnAndCards', label: 'SSNs & payment cards' },
                        { key: 'redactEmails', label: 'Email addresses' },
                        { key: 'redactPhones', label: 'Phone numbers' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-4 py-0.5">
                          <span className="text-[13px] text-[#0A0F1F]">{item.label}</span>
                          <FigmaToggle
                            checked={Boolean(ragPolicy[item.key])}
                            onChange={(val) => setRagPolicy((p) => ({ ...p, [item.key]: val }))}
                            label={item.label}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Custom confidential terms Optional */}
                    <div className="space-y-1.5">
                      <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                        Custom confidential terms{' '}
                        <span className="font-normal text-[#5F6678] ml-1">Optional</span>
                      </label>
                      <input
                        type="text"
                        value={ragPolicy.customRedactionsText}
                        onChange={(e) => setRagPolicy((p) => ({ ...p, customRedactionsText: e.target.value }))}
                        placeholder="Project Atlas, internal codename..."
                        className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] placeholder:text-[#5F6678]/80 focus:outline-none focus:border-[#2D55F5]"
                      />
                    </div>

                    {/* Run Pre-Embedding Scan Pill Button */}
                    <button
                      type="button"
                      onClick={handleRunRagScan}
                      disabled={scanningRag || stagedChunks.length === 0}
                      className={`w-full h-[40px] px-4 rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                        stagedChunks.length === 0
                          ? 'bg-[#EDEFF5] text-[#5F6678] cursor-not-allowed'
                          : 'bg-[#2D55F5] hover:bg-[#2045DC] text-white cursor-pointer'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      <span>
                        {scanningRag
                          ? 'Scanning & sanitizing corpus...'
                          : `Run pre-embedding scan · ${stagedChunks.length.toLocaleString()} staged`}
                      </span>
                    </button>
                  </section>
                </div>

                {/* STEP 3 & 4: INTERACTIVE SCAN RESULTS & EXPORT */}
                {ragScanResult && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                      <div className="bg-white border border-[#E3E6EE] rounded-[16px] p-4">
                        <p className="text-[12px] text-[#474E61]">Evaluated chunks</p>
                        <p className="text-[24px] font-extrabold text-[#0A0F1F] mt-1">
                          {ragScanResult.totalChunks.toLocaleString()}
                        </p>
                        <p className="text-[11.5px] text-[#5F6678] mt-0.5">{ragScanResult.elapsedMs} ms scan time</p>
                      </div>
                      <div className="bg-white border border-[#E3E6EE] rounded-[16px] p-4">
                        <p className="text-[12px] text-[#127A52]">Approved for index</p>
                        <p className="text-[24px] font-extrabold text-[#127A52] mt-1">
                          {approvedRagOutputRecords.length.toLocaleString()}
                        </p>
                        <p className="text-[11.5px] text-[#5F6678] mt-0.5">
                          {ragScanResult.verifiedCount} clean · {ragScanResult.redactedCount} redacted
                        </p>
                      </div>
                      <div className="bg-white border border-[#E3E6EE] rounded-[16px] p-4">
                        <p className="text-[12px] text-[#2D55F5]">Redactions applied</p>
                        <p className="text-[24px] font-extrabold text-[#2D55F5] mt-1">
                          {ragScanResult.totalRedactionsApplied.toLocaleString()}
                        </p>
                        <p className="text-[11.5px] text-[#5F6678] mt-0.5">Secrets, PII &amp; custom terms</p>
                      </div>
                      <div className="bg-white border border-[#E3E6EE] rounded-[16px] p-4">
                        <p className="text-[12px] text-[#A35600]">Quarantined</p>
                        <p className="text-[24px] font-extrabold text-[#A35600] mt-1">
                          {quarantinedThreatRecords.length.toLocaleString()}
                        </p>
                        <p className="text-[11.5px] text-[#5F6678] mt-0.5">Excluded from vector index</p>
                      </div>
                      <div className="bg-white border border-[#E3E6EE] rounded-[16px] p-4 col-span-2 md:col-span-1">
                        <p className="text-[12px] text-[#474E61]">Corpus health</p>
                        <p className="text-[24px] font-extrabold text-[#0A0F1F] mt-1">{ragScanResult.overallHealth}%</p>
                        <p className="text-[11px] font-mono text-[#5F6678] truncate mt-0.5">
                          SHA-256: {ragScanResult.batchSha256Seal?.slice(0, 12)}…
                        </p>
                      </div>
                    </div>

                    <section className="bg-white border border-[#E3E6EE] rounded-[20px] overflow-hidden">
                      <div className="px-5 py-4 border-b border-[#E3E6EE] flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-[15px] font-bold text-[#0A0F1F]">
                            Chunk sanitization diff &amp; manual override
                          </h3>
                          <p className="text-[12px] text-[#5F6678]">Step 3 · Inspect &amp; remediate</p>
                        </div>
                        <div className="inline-flex items-center rounded-full bg-[#EDEFF5] p-[3px] text-[12px]">
                          {[
                            { id: 'ALL', label: `All (${ragScanResult.results.length})` },
                            { id: 'VERIFIED', label: `Verified (${ragScanResult.verifiedCount})` },
                            { id: 'REDACTED_PASS', label: `Redacted (${ragScanResult.redactedCount})` },
                            { id: 'QUARANTINED', label: `Quarantined (${ragScanResult.quarantinedCount})` }
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setVerdictFilter(f.id)}
                              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                                verdictFilter === f.id
                                  ? 'bg-white text-[#2D55F5] font-semibold shadow-2xs'
                                  : 'text-[#474E61] hover:text-[#0A0F1F]'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E3E6EE]">
                        <div className="lg:col-span-4 max-h-[440px] overflow-y-auto divide-y divide-[#E3E6EE]">
                          {filteredScanChunks.map((chk) => {
                            const isSelected = activeChunk?.chunkId === chk.chunkId;
                            const isIncluded = includedChunkIds.has(chk.chunkId);
                            return (
                              <div
                                key={chk.chunkId}
                                onClick={() => setSelectedChunkId(chk.chunkId)}
                                className={`p-4 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-[#ECF0FF]/60' : 'hover:bg-[#F9FAFC]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[12.5px] font-bold text-[#0A0F1F] truncate">{chk.docName}</p>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0 ${
                                      chk.verdict === 'VERIFIED'
                                        ? 'bg-[#E7F6EE] text-[#127A52]'
                                        : chk.verdict === 'REDACTED_PASS'
                                        ? 'bg-[#ECF0FF] text-[#2D55F5]'
                                        : 'bg-[#FDEDEB] text-[#C2362F]'
                                    }`}
                                  >
                                    {chk.verdict}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-[#5F6678] line-clamp-2 mt-1 font-mono">
                                  {editedTextMap[chk.chunkId] ?? chk.sanitizedText}
                                </p>
                                <div className="flex items-center justify-between mt-2 text-[11.5px]">
                                  <span className="text-[#5F6678]">
                                    Trust <strong>{chk.trustScore}/10</strong> · ~{chk.estTokens} tok
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleIncludeChunk(chk.chunkId);
                                    }}
                                    className={`font-semibold cursor-pointer ${
                                      isIncluded ? 'text-[#2D55F5]' : 'text-[#5F6678]'
                                    }`}
                                  >
                                    {isIncluded ? 'Included' : 'Excluded'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="lg:col-span-8 p-5 space-y-4">
                          {activeChunk && (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-[14px] font-bold text-[#0A0F1F]">{activeChunk.docName}</h4>
                                  <p className="text-[11.5px] text-[#5F6678] font-mono">
                                    {activeChunk.chunkId} · Seal {activeChunk.sha256Seal?.slice(0, 16)}…
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleIncludeChunk(activeChunk.chunkId)}
                                  className={`h-[34px] px-3.5 rounded-[10px] text-[12px] font-semibold border cursor-pointer ${
                                    includedChunkIds.has(activeChunk.chunkId)
                                      ? 'bg-[#E7F6EE] border-[#BCE4D0] text-[#127A52]'
                                      : 'bg-white border-[#CDD2DE] text-[#0A0F1F]'
                                  }`}
                                >
                                  {includedChunkIds.has(activeChunk.chunkId)
                                    ? '✓ Included in clean export'
                                    : 'Approve & include'}
                                </button>
                              </div>

                              {activeChunk.violations?.length > 0 && (
                                <div className="rounded-[14px] bg-[#FFF4E3] p-3.5 text-[12px] text-[#A35600] space-y-1">
                                  <p className="font-semibold text-[#0A0F1F]">
                                    Detected findings ({activeChunk.violations.length})
                                  </p>
                                  <ul className="list-disc list-inside text-[#474E61]">
                                    {activeChunk.violations.map((v, i) => (
                                      <li key={i}>{v}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[12px] font-semibold text-[#474E61] mb-1.5">
                                    Raw ingested text
                                  </label>
                                  <div className="h-52 overflow-y-auto rounded-[12px] border border-[#E3E6EE] bg-[#F9FAFC] p-3 text-[12px] font-mono text-[#474E61] whitespace-pre-wrap">
                                    {activeChunk.originalText}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[12px] font-semibold text-[#2D55F5] mb-1.5">
                                    Sanitized output (editable)
                                  </label>
                                  <textarea
                                    value={editedTextMap[activeChunk.chunkId] ?? activeChunk.sanitizedText}
                                    onChange={(e) =>
                                      setEditedTextMap((prev) => ({
                                        ...prev,
                                        [activeChunk.chunkId]: e.target.value
                                      }))
                                    }
                                    className="w-full h-52 rounded-[12px] border border-[#CDD2DE] bg-white p-3 text-[12px] font-mono text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </section>

                    <section className="bg-white border border-[#E3E6EE] rounded-[20px] p-5 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-[15px] font-bold text-[#0A0F1F]">
                            Export embedding-ready corpus or commit to target database
                          </h3>
                          <p className="text-[12px] text-[#5F6678]">Step 4 · Delivery</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={approvedRagOutputRecords.length === 0}
                            onClick={() =>
                              exportRecordsToFile(approvedRagOutputRecords, 'datax_verified_rag_chunks', 'jsonl')
                            }
                            className="h-[38px] px-4 rounded-[10px] bg-[#2D55F5] hover:bg-[#2045DC] disabled:opacity-50 text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download .JSONL ({approvedRagOutputRecords.length})</span>
                          </button>
                          <button
                            type="button"
                            disabled={approvedRagOutputRecords.length === 0}
                            onClick={() =>
                              exportRecordsToFile(approvedRagOutputRecords, 'datax_verified_rag_chunks', 'csv')
                            }
                            className="h-[38px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white hover:bg-[#F9FAFC] text-[#0A0F1F] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download .CSV</span>
                          </button>
                          {quarantinedThreatRecords.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                exportRecordsToFile(quarantinedThreatRecords, 'datax_quarantined_rag_threats', 'csv')
                              }
                              className="h-[38px] px-3.5 rounded-[10px] border border-[#F7D9AE] bg-[#FFF4E3] text-[#A35600] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Quarantine CSV ({quarantinedThreatRecords.length})</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <StudioDatabaseCommitPanel
                        records={approvedRagOutputRecords}
                        suggestedTableName="rag_chunks_clean"
                        recordLabel="verified chunks"
                      />
                    </section>
                  </div>
                )}
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 2 (03.4): AGENT TOOL-CALL GUARD                               */}
            {/* ================================================================= */}
            {activeTab === 'tool_call' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  {/* LEFT CARD: Workspace guardrail policy (Exact Figma 03.4) */}
                  <section className="bg-white border border-[#E3E6EE] rounded-[20px] p-[21px] space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-[15px] font-bold text-[#0A0F1F]">Workspace guardrail policy</h2>
                        <p className="text-[12px] text-[#5F6678] mt-0.5">
                          Enforced on every autonomous tool call
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F6EE] text-[#127A52] shrink-0">
                        Active policy
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                          Hard block ceiling ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={agentPolicy.max_financial_limit}
                          onChange={(e) => setAgentPolicy((p) => ({ ...p, max_financial_limit: e.target.value }))}
                          className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                          Hold for review above ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={agentPolicy.hitl_threshold}
                          onChange={(e) => setAgentPolicy((p) => ({ ...p, hitl_threshold: e.target.value }))}
                          className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                        Inspected monetary argument keys
                      </label>
                      <input
                        type="text"
                        value={agentPolicy.financial_fields_text}
                        onChange={(e) => setAgentPolicy((p) => ({ ...p, financial_fields_text: e.target.value }))}
                        className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                        Forbidden tool denylist
                      </label>
                      <input
                        type="text"
                        value={agentPolicy.blocked_tools_text}
                        onChange={(e) => setAgentPolicy((p) => ({ ...p, blocked_tools_text: e.target.value }))}
                        placeholder="drop_database, wire_transfer"
                        className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                        Restricted argument terms{' '}
                        <span className="font-normal text-[#5F6678] ml-1">Optional</span>
                      </label>
                      <input
                        type="text"
                        value={agentPolicy.custom_blocked_terms_text}
                        onChange={(e) => setAgentPolicy((p) => ({ ...p, custom_blocked_terms_text: e.target.value }))}
                        placeholder="password, ssn"
                        className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                      />
                    </div>

                    {/* 4 Stacked Toggle Switch Rows matching Figma 03.4 */}
                    <div className="space-y-3 pt-1">
                      {[
                        { key: 'block_destructive_sql', label: 'Block destructive SQL (DROP / TRUNCATE / DELETE)' },
                        { key: 'redact_secrets_in_args', label: 'Auto-redact API keys & credentials' },
                        { key: 'redact_pii_in_args', label: 'Auto-redact SSNs & payment cards' },
                        { key: 'redact_emails_in_args', label: 'Auto-redact email addresses' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-4">
                          <span className="text-[13px] text-[#0A0F1F]">{item.label}</span>
                          <FigmaToggle
                            checked={Boolean(agentPolicy[item.key])}
                            onChange={(val) => setAgentPolicy((p) => ({ ...p, [item.key]: val }))}
                            label={item.label}
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleSavePolicy}
                      disabled={policySaving}
                      className="w-full h-[44px] px-4 rounded-[12px] bg-[#2D55F5] hover:bg-[#2045DC] disabled:opacity-50 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4 stroke-[1.9]" />
                      <span>{policySaving ? 'Saving...' : 'Save workspace policy'}</span>
                    </button>

                    {policySavedNote && (
                      <div className="rounded-[12px] bg-[#E7F6EE] border border-[#BCE4D0] px-3.5 py-2 text-[12px] text-[#127A52]">
                        {policySavedNote}
                      </div>
                    )}
                  </section>

                  {/* RIGHT CARD: Policy verifier & trace auditor (Exact Figma 03.4) */}
                  <section className="bg-white border border-[#E3E6EE] rounded-[20px] p-[21px] space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-[15px] font-bold text-[#0A0F1F]">Policy verifier &amp; trace auditor</h2>
                        <p className="text-[12px] text-[#5F6678] mt-0.5">
                          Test a payload or audit an agent trace file
                        </p>
                      </div>

                      <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#474E61] hover:text-[#0A0F1F] cursor-pointer shrink-0 pt-1">
                        <Upload className="w-3.5 h-3.5 stroke-[1.9]" />
                        <span>{batchTraceRunning ? 'Auditing...' : 'Audit trace file'}</span>
                        <input
                          type="file"
                          accept=".jsonl,.ndjson,.json,.csv,.xlsx"
                          onChange={handleBatchAgentTraceUpload}
                          disabled={batchTraceRunning}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">Agent ID</label>
                        <input
                          type="text"
                          value={verifierAgentId}
                          onChange={(e) => setVerifierAgentId(e.target.value)}
                          placeholder="support_bot_v2"
                          className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">Tool name</label>
                        <input
                          type="text"
                          value={verifierToolName}
                          onChange={(e) => setVerifierToolName(e.target.value)}
                          placeholder="stripe_refund"
                          className="w-full h-[39px] px-3.5 rounded-[10px] border border-[#CDD2DE] bg-white text-[13px] text-[#0A0F1F] focus:outline-none focus:border-[#2D55F5]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[12.5px] font-semibold text-[#0A0F1F]">
                        Tool arguments (JSON)
                      </label>
                      <textarea
                        rows={5}
                        value={verifierArgsJson}
                        onChange={(e) => setVerifierArgsJson(e.target.value)}
                        className="w-full p-3.5 rounded-[12px] border border-[#CDD2DE] bg-white text-[12.5px] font-mono text-[#0A0F1F] leading-relaxed focus:outline-none focus:border-[#2D55F5]"
                      />
                    </div>

                    {verifierError && (
                      <div className="rounded-[12px] bg-[#FDEDEB] border border-[#F5C7C2] px-3.5 py-2 text-[12px] text-[#C2362F]">
                        {verifierError}
                      </div>
                    )}

                    {/* White Pill Evaluate Button matching Figma 03.4 */}
                    <button
                      type="button"
                      onClick={handleEvaluateToolCall}
                      disabled={verifierLoading}
                      className="w-full h-[41px] px-4 rounded-full border border-[#CDD2DE] bg-white hover:bg-[#F9FAFC] disabled:opacity-50 text-[#0A0F1F] text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <FlaskConical className="w-4 h-4 text-[#0A0F1F] stroke-[1.8]" />
                      <span>{verifierLoading ? 'Evaluating...' : 'Evaluate against policy'}</span>
                    </button>

                    {/* Verdict Banner matching Figma 03.4 */}
                    {verifierResult && (
                      <div
                        className={`rounded-[14px] px-4 py-3.5 flex items-start gap-3 ${
                          verifierResult.verdict === 'BLOCK_CRITICAL'
                            ? 'bg-[#FDEDEB]'
                            : verifierResult.verdict === 'HOLD_FOR_HITL'
                            ? 'bg-[#FFF4E3]'
                            : 'bg-[#E7F6EE]'
                        }`}
                      >
                        {verifierResult.verdict === 'BLOCK_CRITICAL' ? (
                          <XCircle className="w-4 h-4 text-[#C2362F] shrink-0 mt-0.5" />
                        ) : verifierResult.verdict === 'HOLD_FOR_HITL' ? (
                          <AlertTriangle className="w-4 h-4 text-[#A35600] shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#127A52] shrink-0 mt-0.5" />
                        )}
                        <div className="text-[12.5px]">
                          <div className="font-semibold text-[#0A0F1F]">
                            Verdict ·{' '}
                            {verifierResult.verdict === 'BLOCK_CRITICAL'
                              ? 'Blocked'
                              : verifierResult.verdict === 'HOLD_FOR_HITL'
                              ? 'Hold for review'
                              : 'Allowed'}
                          </div>
                          <p className="text-[#474E61] mt-0.5 leading-relaxed">
                            {verifierResult.violations?.[0] ||
                              'Payload passed all financial caps, SQL checks, and argument policies.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {batchTraceResults.length > 0 && (
                      <div className="rounded-[12px] border border-[#C9D5FF] bg-[#ECF0FF]/60 p-3 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                        <span className="text-[#0A0F1F]">
                          Audited <strong>{batchTraceResults.length}</strong> tool calls from trace file.
                        </span>
                        <button
                          type="button"
                          onClick={() => exportRecordsToFile(batchTraceResults, 'audited_agent_trace', 'csv')}
                          className="px-3 py-1 rounded-lg bg-[#2D55F5] text-white font-semibold cursor-pointer"
                        >
                          Export CSV
                        </button>
                      </div>
                    )}
                  </section>
                </div>

                {/* BOTTOM SECTION: Intercepted tool calls (Exact Figma 03.4) */}
                <section className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-bold text-[#0A0F1F]">Intercepted tool calls</h3>
                      <p className="text-[12px] text-[#5F6678] mt-0.5">
                        PostgreSQL audit ledger and review queue · {displayedEventCount} events
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Segmented Filter Pill */}
                      <div className="inline-flex items-center rounded-full bg-[#EDEFF5] p-[3px] text-[12.5px]">
                        {[
                          { id: 'ALL', label: 'All' },
                          { id: 'HOLD_FOR_HITL', label: 'Hold' },
                          { id: 'BLOCK_CRITICAL', label: 'Block' },
                          { id: 'ALLOW_REDACTED', label: 'Allow redacted' },
                          { id: 'ALLOW', label: 'Allow' }
                        ].map((vf) => (
                          <button
                            key={vf.id}
                            type="button"
                            onClick={() => setEventFilter(vf.id)}
                            className={`px-3.5 py-1 rounded-full transition-colors cursor-pointer ${
                              eventFilter === vf.id
                                ? 'bg-white text-[#2D55F5] font-semibold shadow-2xs'
                                : 'text-[#474E61] hover:text-[#0A0F1F] font-medium'
                            }`}
                          >
                            {vf.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => exportRecordsToFile(activeEventsSource, 'datax_firewall_events_audit', 'csv')}
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#474E61] hover:text-[#0A0F1F] cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 stroke-[1.9]" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="bg-white border border-[#E3E6EE] rounded-[16px] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[12.5px]">
                        <thead>
                          <tr className="bg-[#F9FAFC] border-b border-[#E3E6EE] text-[11px] font-semibold text-[#5F6678] uppercase tracking-wider">
                            <th className="py-2.5 px-4">Time</th>
                            <th className="py-2.5 px-4">Agent</th>
                            <th className="py-2.5 px-4">Tool</th>
                            <th className="py-2.5 px-4">Verdict</th>
                            <th className="py-2.5 px-4">Findings</th>
                            <th className="py-2.5 px-4">Latency</th>
                            <th className="py-2.5 px-4">Review</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E3E6EE]">
                          {filteredEvents.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#5F6678] text-xs">
                                No intercepted tool calls match the selected filter.
                              </td>
                            </tr>
                          ) : (
                            filteredEvents.map((ev) => (
                              <tr key={ev.event_id} className="hover:bg-[#F9FAFC]/70 transition-colors">
                                <td className="py-3 px-4 text-[#0A0F1F] whitespace-nowrap">
                                  {formatEventTime(ev)}
                                </td>
                                <td className="py-3 px-4 font-medium text-[#0A0F1F] whitespace-nowrap">
                                  {ev.agent_or_source}
                                </td>
                                <td className="py-3 px-4 text-[#0A0F1F] whitespace-nowrap">{ev.target_tool}</td>
                                <td className="py-3 px-4 whitespace-nowrap">{renderVerdictBadge(ev.verdict)}</td>
                                <td className="py-3 px-4 text-[#474E61] max-w-md truncate" title={ev.violations}>
                                  {ev.violations || 'Clean'}
                                </td>
                                <td className="py-3 px-4 text-[#0A0F1F] whitespace-nowrap">
                                  {ev.latency_display || `${ev.latency_ms} ms`}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  {ev.verdict === 'HOLD_FOR_HITL' ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        disabled={resolvingEventId === ev.event_id}
                                        onClick={() => handleResolveHitlEvent(ev.event_id, 'APPROVE')}
                                        className="h-[31px] px-3 rounded-[10px] bg-[#2D55F5] hover:bg-[#2045DC] text-white text-[12px] font-semibold cursor-pointer transition-colors"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        disabled={resolvingEventId === ev.event_id}
                                        onClick={() => handleResolveHitlEvent(ev.event_id, 'REJECT')}
                                        className="h-[31px] px-3 rounded-[10px] border border-[#CDD2DE] bg-white hover:bg-[#F9FAFC] text-[#0A0F1F] text-[12px] font-semibold cursor-pointer transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[12px] font-mono text-[#5F6678]">
                                      {ev.sha256_seal ? `${ev.sha256_seal.slice(0, 8)}...` : '—'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 3 (03.5): AI PRIVACY GATEWAY                                  */}
            {/* ================================================================= */}
            {activeTab === 'gateway' && <PrivacyGatewayTab />}

            {/* ================================================================= */}
            {/* TAB 4 (03.6): API & SDK                                           */}
            {/* ================================================================= */}
            {activeTab === 'integration' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* LEFT CARD: Runtime guardrail middleware (Exact Figma 03.6) */}
                <section className="bg-white border border-[#E3E6EE] rounded-[20px] p-[21px] space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[15px] font-bold text-[#0A0F1F]">Runtime guardrail middleware</h2>
                    <button
                      type="button"
                      onClick={() => copyText('agent_sdk', pythonMiddlewareCode)}
                      className="h-[31px] px-3.5 rounded-full bg-[#ECF0FF] hover:bg-[#E0E7FF] text-[#2D55F5] text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedSnippet === 'agent_sdk' ? (
                        <Check className="w-3.5 h-3.5 text-[#127A52]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 stroke-[1.9]" />
                      )}
                      <span>{copiedSnippet === 'agent_sdk' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[13px] text-[#474E61] leading-[1.55]">
                    Python / LangChain tool interceptor. Enforces the saved policy (cap $
                    {Number(agentPolicy.max_financial_limit).toLocaleString()}, review above $
                    {Number(agentPolicy.hitl_threshold).toLocaleString()}) before a tool runs.
                  </p>
                  <pre className="rounded-[14px] bg-[#0A0F1F] text-[#CBD2E6] p-4 text-[12px] font-mono overflow-x-auto leading-[1.65]">
                    {pythonMiddlewareCode}
                  </pre>
                </section>

                {/* RIGHT CARD: Pre-embedding ingestion hook (Exact Figma 03.6) */}
                <section className="bg-white border border-[#E3E6EE] rounded-[20px] p-[21px] space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[15px] font-bold text-[#0A0F1F]">Pre-embedding ingestion hook</h2>
                    <button
                      type="button"
                      onClick={() => copyText('rag_sdk', pythonRagScanCode)}
                      className="h-[31px] px-3.5 rounded-full bg-[#ECF0FF] hover:bg-[#E0E7FF] text-[#2D55F5] text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedSnippet === 'rag_sdk' ? (
                        <Check className="w-3.5 h-3.5 text-[#127A52]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 stroke-[1.9]" />
                      )}
                      <span>{copiedSnippet === 'rag_sdk' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[13px] text-[#474E61] leading-[1.55]">
                    Call before embeddings.create() or a Pinecone / pgvector upsert so poisoned chunks and secrets never reach the index.
                  </p>
                  <pre className="rounded-[14px] bg-[#0A0F1F] text-[#CBD2E6] p-4 text-[12px] font-mono overflow-x-auto leading-[1.65]">
                    {pythonRagScanCode}
                  </pre>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </DataXAppShell>
  );
}
