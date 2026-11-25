"""
DataX Backend Package
Enterprise Decision Fabric, AI Firewall, Rule Execution, and Governance Platform.
"""

import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)

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
    os.path.join(_PROJECT_ROOT, "tests"),
]

for _sub in _SUBDIRS:
    _p = os.path.abspath(os.path.join(_BACKEND_DIR, _sub)) if not os.path.isabs(_sub) else _sub
    if os.path.isdir(_p) and _p not in sys.path:
        sys.path.insert(0, _p)
