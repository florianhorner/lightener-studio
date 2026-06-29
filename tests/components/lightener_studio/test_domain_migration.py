"""Regression test: the lightener -> lightener_studio domain rename preserves
entity_ids and stored curve data.

Two-part proof:
1. `test_rewriter_*` — the offline `.storage` migrator changes ONLY domain/
   platform/identifier fields and preserves entity_id/unique_id/entry_id/data.
2. `test_entity_id_survives_rename` — given a registry record under the NEW
   platform + same unique_id (the state the migrator produces), Home Assistant
   re-adopts the original entity_id instead of generating a fresh one.

Together: migrator yields the right registry state -> that state yields
entity_id continuity. Go/no-go gate for the lightener -> lightener_studio rename.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts"))
import migrate_domain

OLD = "lightener"
NEW = "lightener_studio"
ENTRY_ID = "0123456789abcdef0123456789abcdef"


def test_rewriter_preserves_identity_fields() -> None:
    """The migrator swaps domain/platform/identifiers and touches nothing else."""
    config_entries = {
        "data": {
            "entries": [
                {
                    "entry_id": ENTRY_ID,
                    "domain": OLD,
                    "title": "Living Room",
                    "data": {"friendly_name": "Living Room", "entities": {}},
                    "options": {},
                    "version": 2,
                    "unique_id": None,
                }
            ]
        }
    }
    entity_registry = {
        "data": {
            "entities": [
                {
                    "entity_id": "light.my_custom_living_room",
                    "platform": OLD,
                    "unique_id": ENTRY_ID,
                    "config_entry_id": ENTRY_ID,
                    "id": "regid123",
                }
            ],
            "deleted_entities": [],
        }
    }
    device_registry = {
        "data": {
            "devices": [
                {
                    "id": "dev123",
                    "identifiers": [[OLD, ENTRY_ID]],
                    "config_entries": [ENTRY_ID],
                }
            ],
            "deleted_devices": [],
        }
    }

    assert (
        migrate_domain.migrate_payload("core.config_entries", config_entries, OLD, NEW)
        == 1
    )
    assert (
        migrate_domain.migrate_payload(
            "core.entity_registry", entity_registry, OLD, NEW
        )
        == 1
    )
    assert (
        migrate_domain.migrate_payload(
            "core.device_registry", device_registry, OLD, NEW
        )
        == 1
    )

    entry = config_entries["data"]["entries"][0]
    assert entry["domain"] == NEW
    # identity + payload preserved
    assert entry["entry_id"] == ENTRY_ID
    assert entry["data"] == {"friendly_name": "Living Room", "entities": {}}
    assert entry["version"] == 2

    ent = entity_registry["data"]["entities"][0]
    assert ent["platform"] == NEW
    assert ent["entity_id"] == "light.my_custom_living_room"
    assert ent["unique_id"] == ENTRY_ID
    assert ent["config_entry_id"] == ENTRY_ID

    dev = device_registry["data"]["devices"][0]
    assert dev["identifiers"] == [[NEW, ENTRY_ID]]
    assert dev["config_entries"] == [ENTRY_ID]


def test_rewriter_is_scoped_to_the_target_domain() -> None:
    """Unrelated domains/platforms are left untouched."""
    data = {
        "data": {
            "entities": [
                {"entity_id": "light.other", "platform": "hue", "unique_id": "x"},
                {"entity_id": "light.mine", "platform": OLD, "unique_id": ENTRY_ID},
            ],
            "deleted_entities": [],
        }
    }
    assert migrate_domain.migrate_payload("core.entity_registry", data, OLD, NEW) == 1
    assert data["data"]["entities"][0]["platform"] == "hue"
    assert data["data"]["entities"][1]["platform"] == NEW


async def test_entity_id_survives_rename(
    hass: HomeAssistant, enable_custom_integrations
) -> None:
    """A pre-existing record under the NEW platform makes HA reuse its entity_id.

    Simulates the post-migration registry state: an entity registered under
    platform=lightener_studio with unique_id == the config entry id, carrying a
    DISTINCTIVE entity_id that HA would never auto-generate from the friendly
    name. If the renamed integration re-adopts it, continuity is proven.
    """
    reg = er.async_get(hass)

    # Post-migration record: distinctive entity_id, new platform, unique_id=entry_id.
    reg.async_get_or_create(
        "light",
        NEW,
        ENTRY_ID,
        suggested_object_id="my_custom_living_room",
    )
    assert (
        reg.async_get_entity_id("light", NEW, ENTRY_ID) == "light.my_custom_living_room"
    )

    # The renamed integration sets up the same entry (entry_id -> unique_id).
    entry = MockConfigEntry(
        domain=NEW,
        entry_id=ENTRY_ID,
        version=2,
        data={
            "friendly_name": "Living Room",
            "entities": {"light.member1": {"brightness": {"1": "1", "100": "100"}}},
        },
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    # Entity_id is reused, NOT regenerated as light.living_room.
    assert (
        reg.async_get_entity_id("light", NEW, ENTRY_ID) == "light.my_custom_living_room"
    )
    assert hass.states.get("light.my_custom_living_room") is not None
    assert hass.states.get("light.living_room") is None


def _seed_storage(storage: Path) -> None:
    """Write a minimal .storage with OLD-domain records across all three
    registries, including a removed-but-remembered (deleted) entity and a
    device identifier — the buckets a real instance accumulates over time."""
    storage.mkdir(parents=True, exist_ok=True)
    (storage / "core.config_entries").write_text(
        json.dumps({"data": {"entries": [{"entry_id": ENTRY_ID, "domain": OLD}]}})
    )
    (storage / "core.entity_registry").write_text(
        json.dumps(
            {
                "data": {
                    "entities": [{"platform": OLD, "unique_id": ENTRY_ID}],
                    "deleted_entities": [{"platform": OLD, "unique_id": "gone"}],
                }
            }
        )
    )
    (storage / "core.device_registry").write_text(
        json.dumps(
            {
                "data": {
                    "devices": [{"id": "dev1", "identifiers": [[OLD, ENTRY_ID]]}],
                    "deleted_devices": [],
                }
            }
        )
    )


def test_dry_run_is_the_default_and_writes_nothing(tmp_path: Path) -> None:
    """The safe default: counts changes but leaves every file byte-for-byte."""
    storage = tmp_path / ".storage"
    _seed_storage(storage)
    before = (storage / "core.config_entries").read_text()

    results = migrate_domain.migrate_storage_dir(
        storage, OLD, NEW
    )  # apply defaults False

    # config entry + live entity + deleted entity + device identifier
    assert sum(results.values()) == 4
    assert (storage / "core.config_entries").read_text() == before  # untouched


def test_apply_writes_and_backs_up_then_is_idempotent(tmp_path: Path) -> None:
    """--apply migrates, snapshots originals, and a second run is a no-op."""
    storage = tmp_path / ".storage"
    _seed_storage(storage)
    backup = storage / "backup"

    first = migrate_domain.migrate_storage_dir(
        storage, OLD, NEW, apply=True, backup_dir=backup
    )
    assert sum(first.values()) == 4
    # File now carries the NEW domain...
    migrated = json.loads((storage / "core.config_entries").read_text())
    assert migrated["data"]["entries"][0]["domain"] == NEW
    # ...and the original (OLD) was preserved in the backup dir.
    backed_up = json.loads((backup / "core.config_entries").read_text())
    assert backed_up["data"]["entries"][0]["domain"] == OLD
    # Device identifiers and removed-but-remembered entities migrate too, and
    # the device registry is backed up before it is rewritten.
    dev = json.loads((storage / "core.device_registry").read_text())
    assert dev["data"]["devices"][0]["identifiers"][0][0] == NEW
    ent = json.loads((storage / "core.entity_registry").read_text())
    assert ent["data"]["deleted_entities"][0]["platform"] == NEW
    assert (backup / "core.device_registry").exists()

    # Re-running finds nothing left to change.
    second = migrate_domain.migrate_storage_dir(storage, OLD, NEW, apply=True)
    assert sum(second.values()) == 0


def test_check_component_dirs_flags_the_collision(tmp_path: Path) -> None:
    """A leftover old integration dir (and a missing new one) is surfaced."""
    storage = tmp_path / ".storage"
    storage.mkdir()
    (tmp_path / "custom_components" / OLD).mkdir(parents=True)  # stale old dir present

    warnings = migrate_domain.check_component_dirs(storage, OLD, NEW)

    assert any(OLD in w and "REMOVE" in w for w in warnings)  # collision flagged
    assert any(NEW in w and "not found" in w for w in warnings)  # new dir missing
