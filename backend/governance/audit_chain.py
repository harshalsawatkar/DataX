"""
DataX Audit Chain Compatibility Bridge
Re-exports Unified Merkle Audit Ledger for ARC-04 verification.
"""

from governance.unified_audit_ledger import (
    append_unified_audit_event,
    verify_unified_ledger,
    get_unified_audit_events,
    verify_integrity,
    VALID_MODULES,
    GENESIS_HASH
)

__all__ = [
    "append_unified_audit_event",
    "verify_unified_ledger",
    "get_unified_audit_events",
    "verify_integrity",
    "VALID_MODULES",
    "GENESIS_HASH"
]
