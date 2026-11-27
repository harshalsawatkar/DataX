import pytest
import os
import sys
import sqlite3
import tempfile

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TEST_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")
for d in [_PROJECT_ROOT, _BACKEND_DIR, os.path.join(_BACKEND_DIR, "core"), os.path.join(_BACKEND_DIR, "governance")]:
    if d not in sys.path:
        sys.path.insert(0, d)

try:
    from backend.governance.unified_audit_ledger import (
        append_unified_audit_event,
        verify_unified_ledger,
        get_unified_audit_events,
        VALID_MODULES,
        GENESIS_HASH
    )
except ImportError:
    from unified_audit_ledger import (
        append_unified_audit_event,
        verify_unified_ledger,
        get_unified_audit_events,
        VALID_MODULES,
        GENESIS_HASH
    )


@pytest.fixture
def temp_audit_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass


def test_unified_audit_cross_module_chain_verification(temp_audit_db):
    """
    Gate S1-14: Verifies an unbroken Merkle hash chain across events
    from all 4 core DataX modules: DB_ERP, MIGRATION, ML_GATE, AI_FIREWALL.
    """
    tenant = "tenant_test_corp"

    # Module 1: DB_ERP event
    e1 = append_unified_audit_event(
        module="DB_ERP",
        action="DB_XRAY_SCHEMA_SCAN",
        actor="db_admin",
        payload={"tables_scanned": 24, "status": "HEALTHY"},
        tenant_id=tenant,
        db_path=temp_audit_db
    )
    assert e1["sha256_prev"] == GENESIS_HASH
    assert e1["module"] == "DB_ERP"

    # Module 2: MIGRATION event
    e2 = append_unified_audit_event(
        module="MIGRATION",
        action="EXCEL_FMD_TRANSFORM",
        actor="migration_eng",
        payload={"fmd_file": "MARA_MAPPING.xlsx", "rows_mapped": 1420},
        tenant_id=tenant,
        db_path=temp_audit_db
    )
    assert e2["sha256_prev"] == e1["sha256_curr"]
    assert e2["module"] == "MIGRATION"

    # Module 3: ML_GATE event
    e3 = append_unified_audit_event(
        module="ML_GATE",
        action="CONSENSUS_CERTIFICATION_PASS",
        actor="mlops_evaluator",
        payload={"score": 8.7, "disposition": "READY", "model": "procure_forecast_v2"},
        tenant_id=tenant,
        db_path=temp_audit_db
    )
    assert e3["sha256_prev"] == e2["sha256_curr"]
    assert e3["module"] == "ML_GATE"

    # Module 4: AI_FIREWALL event
    e4 = append_unified_audit_event(
        module="AI_FIREWALL",
        action="PROMPT_INJECTION_QUARANTINE",
        actor="gateway_proxy",
        payload={"injection_risk": 0.94, "verdict": "BLOCKED"},
        tenant_id=tenant,
        db_path=temp_audit_db
    )
    assert e4["sha256_prev"] == e3["sha256_curr"]
    assert e4["module"] == "AI_FIREWALL"

    # Verify chain
    report = verify_unified_ledger(tenant_id=tenant, db_path=temp_audit_db)

    assert report["valid"] is True
    assert report["status"] == "VERIFIED_TAMPER_PROOF"
    assert report["total_events"] == 4
    assert report["verified_events"] == 4
    assert report["tampered_events"] == 0
    assert report["violations"] == []
    assert report["modules_covered"] == ["AI_FIREWALL", "DB_ERP", "MIGRATION", "ML_GATE"]
    assert report["merkle_head"] == e4["sha256_curr"]


def test_unified_audit_catches_tampering(temp_audit_db):
    """Verifies that unauthorized direct row modification breaks the chain and is flagged."""
    tenant = "tenant_tamper_target"

    e1 = append_unified_audit_event(
        module="DB_ERP",
        action="INITIAL_SCAN",
        payload={"scan_id": 1},
        tenant_id=tenant,
        db_path=temp_audit_db
    )
    e2 = append_unified_audit_event(
        module="AI_FIREWALL",
        action="PROMPT_SANITIZED",
        payload={"sanitized": True},
        tenant_id=tenant,
        db_path=temp_audit_db
    )

    # Tamper with event 1 in database
    conn = sqlite3.connect(temp_audit_db)
    cur = conn.cursor()
    cur.execute("UPDATE datax_unified_audit_ledger SET payload_hash = 'tampered_hash_value' WHERE id = 1")
    conn.commit()
    conn.close()

    report = verify_unified_ledger(tenant_id=tenant, db_path=temp_audit_db)

    assert report["valid"] is False
    assert report["status"] == "TAMPERING_DETECTED"
    assert report["tampered_events"] >= 1
    assert any("Hash tampering" in v["reason"] or "Broken chain" in v["reason"] for v in report["violations"])


def test_unified_audit_rejects_invalid_module(temp_audit_db):
    """Verifies that events with invalid module categories are blocked."""
    with pytest.raises(ValueError) as exc:
        append_unified_audit_event(
            module="INVALID_UNSANCTIONED_MODULE",
            action="ATTEMPTED_LOG",
            payload={},
            db_path=temp_audit_db
        )
    assert "Invalid module" in str(exc.value)


def test_unified_audit_event_listing_and_filtering(temp_audit_db):
    """Verifies event querying and module filtering."""
    tenant = "tenant_filter_test"
    append_unified_audit_event("DB_ERP", "ACTION_1", tenant_id=tenant, db_path=temp_audit_db)
    append_unified_audit_event("MIGRATION", "ACTION_2", tenant_id=tenant, db_path=temp_audit_db)
    append_unified_audit_event("DB_ERP", "ACTION_3", tenant_id=tenant, db_path=temp_audit_db)

    all_events = get_unified_audit_events(tenant_id=tenant, db_path=temp_audit_db)
    assert len(all_events) == 3

    erp_events = get_unified_audit_events(tenant_id=tenant, module="DB_ERP", db_path=temp_audit_db)
    assert len(erp_events) == 2
    assert all(e["module"] == "DB_ERP" for e in erp_events)
