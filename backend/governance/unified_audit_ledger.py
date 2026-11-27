"""
DataX Unified Merkle Audit Ledger (Task S1-14 / ARC-04)
======================================================
Cryptographically tamper-evident audit ledger bridging all 4 core DataX pillars:
1. DB_ERP: Database scanning, safe-clear operations, SQL guard queries
2. MIGRATION: Schema mapping, Excel FMD transformations, BODS/S4 exports
3. ML_GATE: Model certification, bias scans, data quality consensus runs
4. AI_FIREWALL: Prompt injection detection, PII sanitization, egress blocks

Each event forms an unbroken Merkle hash chain:
sha256_curr = SHA256(sha256_prev | module | tenant_id | actor | action | payload_hash | timestamp)
"""

import os
import sys
import json
import time
import uuid
import hashlib
import sqlite3
import datetime
from typing import Dict, Any, List, Optional

_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_CURRENT_DIR)
for p in [_CURRENT_DIR, _BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from core.paths import get_data_dir
    _DATA_DIR = get_data_dir()
except Exception:
    _DATA_DIR = os.path.join(_BACKEND_DIR, "data")

os.makedirs(_DATA_DIR, exist_ok=True)
_SQLITE_AUDIT_DB = os.path.join(_DATA_DIR, "datax_unified_audit.db")

VALID_MODULES = {"DB_ERP", "MIGRATION", "ML_GATE", "AI_FIREWALL"}
GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"


def _init_sqlite_ledger(db_path: str = _SQLITE_AUDIT_DB):
    """Initializes local SQLite audit ledger table."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS datax_unified_audit_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT UNIQUE NOT NULL,
            timestamp TEXT NOT NULL,
            module TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            actor TEXT NOT NULL,
            action TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            sha256_prev TEXT NOT NULL,
            sha256_curr TEXT NOT NULL,
            metadata TEXT DEFAULT '{}'
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_tenant ON datax_unified_audit_ledger(tenant_id, id)")
    conn.commit()
    conn.close()


def compute_event_hash(
    sha256_prev: str,
    module: str,
    tenant_id: str,
    actor: str,
    action: str,
    payload_hash: str,
    timestamp: str
) -> str:
    """Computes deterministic SHA-256 block hash."""
    raw_material = f"{sha256_prev}|{module}|{tenant_id}|{actor}|{action}|{payload_hash}|{timestamp}"
    return hashlib.sha256(raw_material.encode("utf-8")).hexdigest()


def append_unified_audit_event(
    module: str,
    action: str,
    actor: str = "system",
    payload: Any = None,
    tenant_id: str = "tenant_enterprise",
    metadata: Optional[Dict[str, Any]] = None,
    db_path: str = _SQLITE_AUDIT_DB
) -> Dict[str, Any]:
    """
    Appends an immutable event to the Unified Merkle Audit Ledger.
    Validates module category and chains hash onto the previous block.
    """
    clean_module = str(module).upper().strip()
    if clean_module not in VALID_MODULES:
        raise ValueError(f"Invalid module '{module}'. Must be one of: {sorted(VALID_MODULES)}")

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    event_id = f"evt_{uuid.uuid4().hex[:16]}"
    metadata_json = json.dumps(metadata or {}, sort_keys=True)

    if payload is None:
        payload_hash = hashlib.sha256(b"{}").hexdigest()
    elif isinstance(payload, (str, bytes)):
        payload_bytes = payload if isinstance(payload, bytes) else payload.encode("utf-8")
        payload_hash = hashlib.sha256(payload_bytes).hexdigest()
    else:
        payload_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    _init_sqlite_ledger(db_path)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT sha256_curr FROM datax_unified_audit_ledger WHERE tenant_id = ? ORDER BY id DESC LIMIT 1",
            (tenant_id,)
        )
        row = cur.fetchone()
        sha256_prev = row[0] if row else GENESIS_HASH

        sha256_curr = compute_event_hash(
            sha256_prev=sha256_prev,
            module=clean_module,
            tenant_id=tenant_id,
            actor=actor,
            action=action,
            payload_hash=payload_hash,
            timestamp=timestamp
        )

        cur.execute("""
            INSERT INTO datax_unified_audit_ledger
            (event_id, timestamp, module, tenant_id, actor, action, payload_hash, sha256_prev, sha256_curr, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (event_id, timestamp, clean_module, tenant_id, actor, action, payload_hash, sha256_prev, sha256_curr, metadata_json))

        conn.commit()

        return {
            "event_id": event_id,
            "timestamp": timestamp,
            "module": clean_module,
            "tenant_id": tenant_id,
            "actor": actor,
            "action": action,
            "payload_hash": payload_hash,
            "sha256_prev": sha256_prev,
            "sha256_curr": sha256_curr,
            "metadata": metadata or {}
        }
    finally:
        conn.close()


def verify_unified_ledger(
    tenant_id: str = "tenant_enterprise",
    db_path: str = _SQLITE_AUDIT_DB
) -> Dict[str, Any]:
    """
    Verifies the cryptographic integrity of the unified audit chain for a tenant.
    Returns audit verification report including verified modules, violations, and Merkle head.
    """
    _init_sqlite_ledger(db_path)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, event_id, timestamp, module, tenant_id, actor, action, payload_hash, sha256_prev, sha256_curr
            FROM datax_unified_audit_ledger
            WHERE tenant_id = ?
            ORDER BY id ASC
        """, (tenant_id,))
        rows = cur.fetchall()

        if not rows:
            return {
                "valid": True,
                "tenant_id": tenant_id,
                "total_events": 0,
                "verified_events": 0,
                "tampered_events": 0,
                "violations": [],
                "modules_covered": [],
                "merkle_head": GENESIS_HASH,
                "genesis_hash": GENESIS_HASH,
                "status": "SECURE_EMPTY_CHAIN"
            }

        violations = []
        modules_covered = set()
        expected_prev = GENESIS_HASH

        for idx, r in enumerate(rows):
            _id, event_id, ts, mod, t_id, actor, action, p_hash, prev_h, curr_h = r
            modules_covered.add(mod)

            # Check 1: Chain link integrity
            if prev_h != expected_prev:
                violations.append({
                    "event_id": event_id,
                    "index": idx,
                    "reason": f"Broken chain link: expected sha256_prev '{expected_prev}', found '{prev_h}'"
                })

            # Check 2: Block hash integrity
            recomputed = compute_event_hash(
                sha256_prev=prev_h,
                module=mod,
                tenant_id=t_id,
                actor=actor,
                action=action,
                payload_hash=p_hash,
                timestamp=ts
            )
            if curr_h != recomputed:
                violations.append({
                    "event_id": event_id,
                    "index": idx,
                    "reason": f"Hash tampering: recorded '{curr_h}' does not match recomputed '{recomputed}'"
                })

            expected_prev = curr_h

        is_valid = (len(violations) == 0)

        return {
            "valid": is_valid,
            "tenant_id": tenant_id,
            "total_events": len(rows),
            "verified_events": len(rows) - len(violations),
            "tampered_events": len(violations),
            "violations": violations,
            "modules_covered": sorted(list(modules_covered)),
            "merkle_head": rows[-1][9] if rows else GENESIS_HASH,
            "genesis_hash": rows[0][8] if rows else GENESIS_HASH,
            "status": "VERIFIED_TAMPER_PROOF" if is_valid else "TAMPERING_DETECTED"
        }
    finally:
        conn.close()


def get_unified_audit_events(
    tenant_id: str = "tenant_enterprise",
    limit: int = 50,
    module: Optional[str] = None,
    db_path: str = _SQLITE_AUDIT_DB
) -> List[Dict[str, Any]]:
    """Retrieves recent audit events for telemetry or UI audit logs."""
    _init_sqlite_ledger(db_path)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        query = "SELECT event_id, timestamp, module, tenant_id, actor, action, payload_hash, sha256_prev, sha256_curr, metadata FROM datax_unified_audit_ledger WHERE tenant_id = ?"
        params = [tenant_id]

        if module:
            query += " AND module = ?"
            params.append(module.upper().strip())

        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        cur.execute(query, tuple(params))
        rows = cur.fetchall()

        events = []
        for r in rows:
            events.append({
                "event_id": r[0],
                "timestamp": r[1],
                "module": r[2],
                "tenant_id": r[3],
                "actor": r[4],
                "action": r[5],
                "payload_hash": r[6],
                "sha256_prev": r[7],
                "sha256_curr": r[8],
                "metadata": json.loads(r[9]) if r[9] else {}
            })
        return events
    finally:
        conn.close()


def verify_integrity(tenant_id: str = "tenant_enterprise") -> Dict[str, Any]:
    """Compatibility alias for legacy audit_chain callers."""
    return verify_unified_ledger(tenant_id=tenant_id)
