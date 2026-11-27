"""
DataX Service Entrypoint (Root Backward Compatibility Shim)
Delegates execution to backend.service for seamless CLI, Docker, and daemon operation.
"""
import os
import sys

_ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.join(_ROOT_DIR, "backend")

if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

# Import backend application
from backend.service import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8003))
    uvicorn.run("backend.service:app", host="0.0.0.0", port=port, reload=False)
