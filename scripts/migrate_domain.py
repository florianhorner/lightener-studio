#!/usr/bin/env python3
"""Offline Home Assistant domain-rename migrator.

Rewrites a stopped HA instance's `.storage` so an integration's domain can be
renamed while preserving every entity_id, unique_id, config-entry id and the
per-entity stored data.

Why offline: HA loads the entity/device registries before any integration's
code runs, so an in-process migration cannot re-key entities cleanly. Editing
the persisted JSON while HA is down sidesteps all load-order/timing problems.

Mechanism: HA persists `entity_id` in the entity registry and binds a live
entity to its stored record by (platform, unique_id). So if we change only the
`platform`/`domain` fields from <old> to <new> and keep unique_id/entity_id/
entry_id intact, the renamed integration re-adopts the same entity_id.

Safety — this script is meant to be run by people AND by agents, so it defends
itself:
  - DRY-RUN BY DEFAULT. It only previews; it writes nothing unless you pass
    --apply. An agent that runs it without reading this header cannot mutate
    your storage by accident.
  - Backs up every file it touches (timestamped dir) before writing.
  - Atomic writes (temp file + rename) so a crash can't half-write .storage.
  - Idempotent: re-running after a successful migration is a no-op (exit 0).
  - Warns loudly when the OLD `custom_components/<old>` dir is still installed
    or the NEW one is missing — that collision is the #1 way this breaks.

Usage:

    # 1. Preview (safe, default — no changes):
    python scripts/migrate_domain.py --storage <config>/.storage

    # 2. Apply for real, with Home Assistant STOPPED (backup taken automatically):
    python scripts/migrate_domain.py --storage <config>/.storage --apply

--old/--new default to lightener -> lightener_studio (the only rename this repo
performs), so agents can't fumble the values.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

DEFAULT_OLD = "lightener"
DEFAULT_NEW = "lightener_studio"


def migrate_config_entries(data: dict, old: str, new: str) -> int:
    """Rewrite config-entry domains. Returns count changed."""
    changed = 0
    for entry in data.get("entries", []):
        if entry.get("domain") == old:
            entry["domain"] = new
            changed += 1
    return changed


def migrate_entity_registry(data: dict, old: str, new: str) -> int:
    """Rewrite entity platforms (live + deleted). Returns count changed."""
    changed = 0
    for bucket in ("entities", "deleted_entities"):
        for ent in data.get(bucket, []):
            if ent.get("platform") == old:
                ent["platform"] = new
                changed += 1
    return changed


def migrate_device_registry(data: dict, old: str, new: str) -> int:
    """Rewrite the domain element of device identifiers. Returns count changed."""
    changed = 0
    for bucket in ("devices", "deleted_devices"):
        for dev in data.get(bucket, []):
            new_identifiers = []
            touched = False
            for ident in dev.get("identifiers", []):
                # JSON stores each identifier as a [domain, id] pair (list).
                if ident and ident[0] == old:
                    ident = [new, *ident[1:]]
                    touched = True
                new_identifiers.append(ident)
            if touched:
                dev["identifiers"] = new_identifiers
                changed += 1
    return changed


# storage key -> (data migrator)
_MIGRATORS = {
    "core.config_entries": migrate_config_entries,
    "core.entity_registry": migrate_entity_registry,
    "core.device_registry": migrate_device_registry,
}


def migrate_payload(key: str, payload: dict, old: str, new: str) -> int:
    """Apply the right migrator to a single `{version, key, data}` store payload."""
    migrator = _MIGRATORS.get(key)
    if migrator is None:
        return 0
    return migrator(payload.get("data", {}), old, new)


def _atomic_write(path: Path, text: str) -> None:
    """Write via temp file + rename so a crash never half-writes .storage."""
    tmp = path.with_name(path.name + ".lightener-migrate.tmp")
    tmp.write_text(text)
    tmp.replace(path)


def migrate_storage_dir(
    storage_dir: Path,
    old: str,
    new: str,
    *,
    apply: bool = False,
    backup_dir: Path | None = None,
) -> dict[str, int]:
    """Migrate the registry files in a `.storage` directory.

    Computes the per-file change counts either way. Only writes (with a backup
    first) when ``apply`` is True — so the default call is a safe dry run.
    """
    results: dict[str, int] = {}
    for key in _MIGRATORS:
        path = storage_dir / key
        if not path.exists():
            continue
        try:
            payload = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            raise SystemExit(
                f"error: {path} is not valid JSON ({exc}). .storage may be "
                f"corrupted — aborting with no changes made."
            ) from exc
        n = migrate_payload(key, payload, old, new)
        results[key] = n
        if apply and n:
            if backup_dir is not None:
                backup_dir.mkdir(parents=True, exist_ok=True)
                dest = backup_dir / path.name
                if not dest.exists():  # never clobber an earlier backup
                    dest.write_text(path.read_text())
            _atomic_write(path, json.dumps(payload, indent=2))
    return results


def check_component_dirs(storage_dir: Path, old: str, new: str) -> list[str]:
    """Warn about the dual-directory collision: a leftover old integration dir,
    or a missing new one. ``storage_dir`` is expected to be ``<config>/.storage``."""
    warnings: list[str] = []
    config = storage_dir.parent
    cc = config / "custom_components"
    if (cc / old).is_dir():
        warnings.append(
            f"OLD integration still installed at {cc / old} — REMOVE it before "
            f"starting HA. Both dirs register the same panel/websocket/card and "
            f"will collide."
        )
    if not (cc / new).is_dir():
        warnings.append(
            f"NEW integration not found at {cc / new} — install {new} before "
            f"starting HA, or the migrated entries will have no code to load."
        )
    return warnings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--storage", required=True, type=Path, help="path to .storage")
    parser.add_argument("--old", default=DEFAULT_OLD, help="current domain")
    parser.add_argument("--new", default=DEFAULT_NEW, help="new domain")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="actually write changes (default: dry-run preview only)",
    )
    args = parser.parse_args(argv)

    if not args.storage.is_dir():
        print(f"error: {args.storage} is not a directory", file=sys.stderr)
        return 2

    for warning in check_component_dirs(args.storage, args.old, args.new):
        print(f"  WARNING: {warning}", file=sys.stderr)

    # Always compute first (this pass never writes).
    preview = migrate_storage_dir(args.storage, args.old, args.new, apply=False)
    total = sum(preview.values())

    if total == 0:
        print(
            f"Nothing to migrate: no '{args.old}' records in {args.storage} "
            f"(already migrated?). No changes made."
        )
        return 0

    for key, n in preview.items():
        if n:
            print(f"  {key}: {n} record(s) {args.old} -> {args.new}")

    if not args.apply:
        print(
            "\nDRY RUN — nothing was changed. With Home Assistant STOPPED, "
            "re-run with --apply to migrate."
        )
        return 0

    # Keep the backup OUTSIDE .storage (in the config dir) so Home Assistant
    # never sees the old-domain copies sitting next to its live registry files.
    backup_dir = (
        args.storage.parent
        / f".lightener-migrate-backup-{datetime.now():%Y%m%d-%H%M%S}"
    )
    migrate_storage_dir(
        args.storage, args.old, args.new, apply=True, backup_dir=backup_dir
    )
    print(f"\nBacked up originals to: {backup_dir}")
    print(
        f"done. Remove custom_components/{args.old} if present, then START HA "
        f"and verify entity_ids are unchanged."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
