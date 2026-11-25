"""
DataX Test & Verification Suite
Air-gapped zero-egress audits, performance benchmarks, and FMD unit tests.
"""

import os
import sys

_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TESTS_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")

if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

_SUBDIRS = [
    "core",
    "engines",
    "pipeline",
    "security",
    "connectors",
    "governance",
    "models",
]

for _sub in _SUBDIRS:
    _p = os.path.join(_BACKEND_DIR, _sub)
    if os.path.isdir(_p) and _p not in sys.path:
        sys.path.insert(0, _p)
