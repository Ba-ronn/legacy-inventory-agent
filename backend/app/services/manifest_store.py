"""Where approved mapping manifests live.

A manifest describes the shape of one specific database, so it is keyed by
tenant *and* connection. Keying it by tenant alone was fine while a tenant could
only ever have one database, but it breaks as soon as the user keeps more than
one connection: the agent would resolve logical columns against whichever
schema was mapped last and silently query the wrong columns.

(Still a JSON file per manifest, as in the rest of Phase 2 — the point here is
the key, not the storage engine.)
"""
import hashlib
import json
from pathlib import Path
from typing import Optional

from sqlalchemy.engine import make_url

from ..core.config import BACKEND_ROOT
from ..models.manifest import MappingManifest


def connection_fingerprint(connection_string: str) -> str:
    """A stable id for a database, derived from the URL without its password.

    Excluding the password means rotating a credential does not orphan the
    manifest, and no secret is written into a filename.
    """
    try:
        identity = make_url(connection_string).render_as_string(hide_password=True)
    except Exception:
        # Not a URL we can parse; fall back to the raw string so an unusual
        # connection format still gets its own stable slot.
        identity = connection_string.strip()
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()[:12]


def _scoped_path(tenant_id: str, connection_string: str) -> Path:
    return BACKEND_ROOT / f"manifest_{tenant_id}_{connection_fingerprint(connection_string)}.json"


def _legacy_path(tenant_id: str) -> Path:
    """The pre-per-connection location, still read so existing setups keep working."""
    return BACKEND_ROOT / f"manifest_{tenant_id}.json"


def _has_scoped_manifests(tenant_id: str) -> bool:
    """Whether this tenant has saved anything under the per-connection scheme."""
    return any(BACKEND_ROOT.glob(f"manifest_{tenant_id}_" + "[0-9a-f]" * 12 + ".json"))


def resolve_path(tenant_id: str, connection_string: Optional[str]) -> Optional[Path]:
    """The file backing this tenant/connection pair, or None if there isn't one yet."""
    if connection_string:
        scoped = _scoped_path(tenant_id, connection_string)
        if scoped.exists():
            return scoped

        # An install predating per-connection manifests has exactly one database
        # in play, so its tenant-wide file is unambiguous and still readable.
        # Once any scoped manifest exists the tenant has migrated, and falling
        # back would hand a database the mapping of a different schema — which
        # is the whole reason manifests became per-connection.
        if _has_scoped_manifests(tenant_id):
            return None

    legacy = _legacy_path(tenant_id)
    return legacy if legacy.exists() else None


def save(tenant_id: str, connection_string: Optional[str], manifest: MappingManifest) -> Path:
    path = (
        _scoped_path(tenant_id, connection_string)
        if connection_string
        else _legacy_path(tenant_id)
    )
    path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
    return path


def load(tenant_id: str, connection_string: Optional[str]) -> Optional[MappingManifest]:
    path = resolve_path(tenant_id, connection_string)
    if path is None:
        return None
    return MappingManifest(**json.loads(path.read_text(encoding="utf-8")))


def exists(tenant_id: str, connection_string: Optional[str]) -> bool:
    return resolve_path(tenant_id, connection_string) is not None
