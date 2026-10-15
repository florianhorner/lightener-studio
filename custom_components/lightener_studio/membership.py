"""Transactional controlled-light membership updates."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable, Mapping, Sequence
from copy import deepcopy
from dataclasses import dataclass
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_BRIGHTNESS, CONF_ENTITIES
from homeassistant.core import HomeAssistant

from .const import (
    DEFAULT_BRIGHTNESS,
    DOMAIN,
    MEMBERSHIP_ERROR_DISABLED_ENTITY,
)

_LOGGER = logging.getLogger(__name__)

MAX_CONTROLLED_LIGHTS = 100
_LOCKS_KEY = f"{DOMAIN}_membership_locks"

MemberPayloadFactory = Callable[[str], Mapping[str, Any]]


class MembershipError(ValueError):
    """A stable membership command failure."""

    def __init__(self, code: str, message: str) -> None:
        """Initialize the error."""
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class MembershipUpdate:
    """Result of a committed membership transaction."""

    entities: dict[str, dict[str, Any]]
    added_entity_ids: list[str]
    removed_entity_ids: list[str]


def default_member_payload(_entity_id: str) -> Mapping[str, Any]:
    """Return the default payload for a newly controlled light."""
    return {CONF_BRIGHTNESS: dict(DEFAULT_BRIGHTNESS)}


def build_membership_entities(
    existing_entities: Mapping[str, Any],
    controlled_entity_ids: Sequence[str],
    new_member_payload_factory: MemberPayloadFactory = default_member_payload,
) -> dict[str, dict[str, Any]]:
    """Build member data with retained members first and new members appended."""
    submitted = list(controlled_entity_ids)
    submitted_set = set(submitted)
    ordered_ids = [
        entity_id for entity_id in existing_entities if entity_id in submitted_set
    ]
    ordered_ids.extend(
        entity_id for entity_id in submitted if entity_id not in existing_entities
    )
    built: dict[str, dict[str, Any]] = {}
    for entity_id in ordered_ids:
        if entity_id in existing_entities:
            built[entity_id] = deepcopy(existing_entities[entity_id])
        else:
            built[entity_id] = deepcopy(dict(new_member_payload_factory(entity_id)))
    return built


def entry_update_lock(hass: HomeAssistant, entry_id: str) -> asyncio.Lock:
    """Return the process-lifetime lock for one config entry.

    Membership updates and curve saves both hold it while they write the entry
    and reload or refresh its runtime, so their reloads never overlap and one
    side's rollback cannot undo the other's write.
    """
    locks: dict[str, asyncio.Lock] = hass.data.setdefault(_LOCKS_KEY, {})
    return locks.setdefault(entry_id, asyncio.Lock())


def discard_entry_update_lock(hass: HomeAssistant, entry_id: str) -> None:
    """Drop an unused lock after permanent config-entry removal."""
    locks: dict[str, asyncio.Lock] = hass.data.get(_LOCKS_KEY, {})
    lock = locks.get(entry_id)
    if lock is None or lock.locked() or getattr(lock, "_waiters", None):
        return
    locks.pop(entry_id, None)


def validate_membership_selection(
    hass: HomeAssistant,
    group_entity_id: str,
    existing_entities: Mapping[str, Any],
    controlled_entity_ids: Sequence[str],
) -> None:
    """Validate the full submitted membership set."""
    from homeassistant.helpers.entity_registry import async_get

    if not controlled_entity_ids:
        raise MembershipError("empty_selection", "Select at least one light")
    if len(controlled_entity_ids) > MAX_CONTROLLED_LIGHTS:
        raise MembershipError(
            "too_many",
            f"A Lightener group can control at most {MAX_CONTROLLED_LIGHTS} lights",
        )
    if len(set(controlled_entity_ids)) != len(controlled_entity_ids):
        raise MembershipError("duplicate", "The light selection contains a duplicate")

    entity_registry = async_get(hass)
    for entity_id in controlled_entity_ids:
        # Self-reference is the one rule a retained member cannot buy its way
        # out of: keeping it would make the group control itself.
        if entity_id == group_entity_id:
            raise MembershipError("self_reference", "A Lightener cannot control itself")
        if entity_id in existing_entities:
            # Persisted members remain retainable even if HA disabled or removed
            # them, or if they could not be granted today — a v1-YAML group may
            # already nest another Lightener, and re-validating it here would
            # reject every unrelated edit to that group. Only a new membership
            # grant is rejected below.
            continue

        if not entity_id.startswith("light."):
            raise MembershipError("not_a_light", f"{entity_id} is not a light entity")
        registry_entry = entity_registry.async_get(entity_id)
        if (
            registry_entry is not None
            and registry_entry.platform == DOMAIN
            and registry_entry.domain == "light"
        ):
            raise MembershipError(
                "recursive_lightener",
                "A Lightener group cannot control another Lightener group",
            )
        if registry_entry is not None and registry_entry.disabled_by is not None:
            raise MembershipError(
                MEMBERSHIP_ERROR_DISABLED_ENTITY,
                (
                    f"Could not add {entity_id} because it is disabled in Home Assistant. "
                    "Enable it under Settings → Devices & services → "
                    "Entities, reopen Edit lights, and try again."
                ),
            )

        # Existing stale members were handled above. Newly added IDs must exist.
        if registry_entry is None and hass.states.get(entity_id) is None:
            raise MembershipError(
                "not_found", f"Light entity {entity_id} was not found"
            )


async def async_set_controlled_lights(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    group_entity_id: str,
    controlled_entity_ids: Sequence[str],
    observed_controlled_entity_ids: Sequence[str] | None,
    *,
    new_member_payload_factory: MemberPayloadFactory = default_member_payload,
) -> MembershipUpdate:
    """Atomically validate, persist, reload, and compensate a membership update."""
    submitted = list(controlled_entity_ids)
    lock = entry_update_lock(hass, config_entry.entry_id)
    async with lock:
        # Resolve again after waiting. A prior transaction may have reloaded or
        # removed this entry while this caller was queued.
        current_entry = hass.config_entries.async_get_entry(config_entry.entry_id)
        if current_entry is None:
            raise MembershipError("not_found", "Config entry not found")

        previous_data = deepcopy(dict(current_entry.data))
        existing_entities = deepcopy(dict(previous_data.get(CONF_ENTITIES, {})))
        current_ids = list(existing_entities)
        if observed_controlled_entity_ids is not None and set(
            observed_controlled_entity_ids
        ) != set(current_ids):
            raise MembershipError(
                "conflict",
                "The group changed since this editor was opened. Reload and try again.",
            )

        validate_membership_selection(
            hass, group_entity_id, existing_entities, submitted
        )
        new_entities = build_membership_entities(
            existing_entities, submitted, new_member_payload_factory
        )
        new_data = deepcopy(previous_data)
        new_data[CONF_ENTITIES] = new_entities

        hass.config_entries.async_update_entry(current_entry, data=new_data)
        try:
            reloaded = await hass.config_entries.async_reload(current_entry.entry_id)
        except Exception:
            _LOGGER.exception(
                "Failed to reload Lightener config entry after membership update"
            )
            reloaded = False

        if reloaded is False:
            _LOGGER.error(
                "Lightener config entry reload returned false after membership update"
            )
            hass.config_entries.async_update_entry(current_entry, data=previous_data)
            try:
                restored = await hass.config_entries.async_reload(
                    current_entry.entry_id
                )
            except Exception as err:
                _LOGGER.exception(
                    "Failed to restore Lightener runtime after membership rollback"
                )
                raise MembershipError(
                    "rollback_reload_failed",
                    "The update failed and the previous runtime state could not be restored",
                ) from err
            if restored is False:
                _LOGGER.error(
                    "Lightener compensating reload returned false after membership rollback"
                )
                raise MembershipError(
                    "rollback_reload_failed",
                    "The update failed and the previous runtime state could not be restored",
                )
            raise MembershipError("reload_failed", "Config entry reload failed")

        confirmed_entry = hass.config_entries.async_get_entry(current_entry.entry_id)
        if confirmed_entry is None:
            raise MembershipError("not_found", "Config entry not found after reload")
        confirmed_entities = deepcopy(dict(confirmed_entry.data.get(CONF_ENTITIES, {})))
        old_ids = set(current_ids)
        confirmed_ids = list(confirmed_entities)
        new_ids = set(confirmed_ids)
        return MembershipUpdate(
            entities=confirmed_entities,
            added_entity_ids=[
                entity_id for entity_id in confirmed_ids if entity_id not in old_ids
            ],
            removed_entity_ids=[
                entity_id for entity_id in current_ids if entity_id not in new_ids
            ],
        )
