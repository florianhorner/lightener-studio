"""Entity-selection helpers for Lightener setup and management."""

from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import (
    async_entries_for_area as devices_in_area,
)
from homeassistant.helpers.device_registry import (
    async_get as async_get_device_registry,
)
from homeassistant.helpers.entity_registry import (
    async_entries_for_area as entities_in_area,
)
from homeassistant.helpers.entity_registry import (
    async_entries_for_device,
)
from homeassistant.helpers.entity_registry import (
    async_get as async_get_entity_registry,
)

from .const import DOMAIN


def lightener_light_entity_ids(hass: HomeAssistant) -> list[str]:
    """Return Lightener-platform light entity IDs."""
    entity_registry = async_get_entity_registry(hass)
    return sorted(
        entry.entity_id
        for entry in entity_registry.entities.values()
        if entry.platform == DOMAIN and entry.domain == "light"
    )


def light_entity_ids_in_area(hass: HomeAssistant, area_id: str) -> list[str]:
    """Return light entity IDs belonging to an area.

    Includes entities directly assigned to the area and entities of devices
    assigned to the area. The HA entity selector's `filter` schema rejects
    any area key, so callers pass the result via `include_entities`.
    """
    entity_registry = async_get_entity_registry(hass)
    device_registry = async_get_device_registry(hass)

    entity_ids: set[str] = set()

    for entry in entities_in_area(entity_registry, area_id):
        if entry.domain == "light":
            entity_ids.add(entry.entity_id)

    for device in devices_in_area(device_registry, area_id):
        for entry in async_entries_for_device(
            entity_registry, device.id, include_disabled_entities=False
        ):
            if entry.domain == "light" and entry.area_id in (None, area_id):
                entity_ids.add(entry.entity_id)

    return sorted(entity_ids)


def eligible_controlled_light_entity_ids(
    hass: HomeAssistant, area_id: str | None = None
) -> list[str]:
    """Return light entity IDs eligible to be controlled by a Lightener group."""
    lightener_entities = set(lightener_light_entity_ids(hass))

    if area_id:
        candidate_ids = set(light_entity_ids_in_area(hass, area_id))
    else:
        entity_registry = async_get_entity_registry(hass)
        candidate_ids = {
            entry.entity_id
            for entry in entity_registry.entities.values()
            if entry.domain == "light"
        }
        candidate_ids.update(
            entity_id
            for entity_id in hass.states.async_entity_ids()
            if entity_id.startswith("light.")
        )

    return sorted(
        entity_id for entity_id in candidate_ids if entity_id not in lightener_entities
    )


def is_lightener_light_entity(hass: HomeAssistant, entity_id: str) -> bool:
    """Return whether an entity ID belongs to a Lightener light entity."""
    entry = async_get_entity_registry(hass).async_get(entity_id)
    return entry is not None and entry.platform == DOMAIN and entry.domain == "light"
