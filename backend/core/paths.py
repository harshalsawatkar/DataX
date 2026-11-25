"""
DataX Centralized Path Resolution
Single source of truth for where persistent stores (.json/.jsonl, backups, exports) live.

Resolution order for DATA_DIR:
  1. DATAX_VAULT_DIR env var (if it points to an existing directory)
  2. Production VM service directory (if present)
  3. <project_root>/data for local development

Importing this module also exports DATAX_VAULT_DIR so every legacy module that reads
the env var resolves to the same directory.
"""

import os

_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(_CORE_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

_PROD_SERVICE_DIR = "/home/azureuserSDH/Production/datax-service"


def _resolve_data_dir() -> str:
    env_dir = os.environ.get("DATAX_VAULT_DIR")
    if env_dir and os.path.isdir(env_dir):
        return env_dir
    if os.path.isdir(_PROD_SERVICE_DIR):
        return _PROD_SERVICE_DIR
    local_dir = os.path.join(PROJECT_ROOT, "data")
    os.makedirs(local_dir, exist_ok=True)
    return local_dir


def _resolve_demo_data_dir() -> str:
    for candidate in (PROJECT_ROOT, BACKEND_DIR, DATA_DIR):
        path = os.path.join(candidate, "demo_data")
        if os.path.isdir(path):
            return path
    return os.path.join(PROJECT_ROOT, "demo_data")


DATA_DIR = _resolve_data_dir()
os.environ["DATAX_VAULT_DIR"] = DATA_DIR
DEMO_DATA_DIR = _resolve_demo_data_dir()


def data_path(*parts: str) -> str:
    """Absolute path inside the persistent data directory."""
    return os.path.join(DATA_DIR, *parts)
