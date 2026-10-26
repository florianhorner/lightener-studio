"""Content revisions for complete saved editor groups (not event counters)."""

import hashlib
import json
from collections.abc import Mapping
from typing import Any


def editor_revision(entry_id: str, entities: Mapping[str, Any]) -> str:
    """Hash identity, member order and every raw member field without rewriting it."""
    payload = ["lightener/editor/v1", entry_id, list(entities), entities]
    canonical = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    )
    return "v1:" + hashlib.sha256(canonical.encode("utf-8")).hexdigest()
