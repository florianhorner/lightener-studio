"""WebSocket API for Lightener curve editor."""

import logging
from collections.abc import Awaitable, Callable
from time import monotonic

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.entity_registry import async_get as async_get_entity_registry

from .const import CURVE_PRESETS, DEFAULT_CURVE_PRESET, DOMAIN
from .entity_selection import eligible_controlled_light_entity_ids
from .handoff import HandoffError, async_resolve_handoff
from .membership import MembershipError, async_set_controlled_lights
from .observability import end_span, entity_ref, log_event, metric, start_span

_LOGGER = logging.getLogger(__name__)

_ENTITY_LIST_CACHE_KEY = f"{DOMAIN}_entity_list_cache"
_ENTITY_LIST_CACHE_TTL = 5.0  # seconds


class CurveValidationError(ValueError):
    """Raised when a websocket curve payload fails validation."""

    def __init__(self, metric_code: str, message: str) -> None:
        """Initialize the validation error with a metric code and message."""
        super().__init__(message)
        self.metric_code = metric_code
        self.message = message


def _connection_can_read_entity(
    connection: websocket_api.ActiveConnection, entity_id: str
) -> bool:
    """Return whether this websocket connection may read an entity."""
    user = getattr(connection, "user", None)
    if user is None or getattr(user, "is_admin", False):
        return True

    permissions = getattr(user, "permissions", None)
    check_entity = getattr(permissions, "check_entity", None)
    if check_entity is None:
        return True

    try:
        return bool(check_entity(entity_id, "read"))
    except TypeError:
        try:
            return bool(check_entity("read", entity_id))
        except Exception:
            return False
    except Exception:
        return False


def _parse_curve_percent(raw_value, field: str) -> int:
    """Parse a websocket curve percentage, rejecting bools/floats/truncation."""
    if isinstance(raw_value, bool | float):
        raise CurveValidationError(
            "non_integer_curve_value",
            f"Brightness {field} must be an integer percent: {raw_value}",
        )

    if isinstance(raw_value, int):
        return raw_value

    if isinstance(raw_value, str):
        value = raw_value.strip()
        numeric = value[1:] if value.startswith("-") else value
        if not numeric or not numeric.isdecimal():
            raise CurveValidationError(
                "non_numeric_curve_value",
                f"Brightness {field} must be numeric: {raw_value}",
            )
        return int(value)

    raise CurveValidationError(
        "non_numeric_curve_value",
        f"Brightness {field} must be numeric: {raw_value}",
    )


def _normalize_curve_payload(curves: dict) -> dict:
    """Validate and normalize curve websocket payload data."""
    normalized_curves = {}

    for controlled_entity_id, entity_data in curves.items():
        if not isinstance(entity_data, dict):
            raise CurveValidationError(
                "invalid_entity_payload",
                f"Curve payload for {controlled_entity_id} must be an object",
            )

        brightness = entity_data.get("brightness")
        if not isinstance(brightness, dict):
            raise CurveValidationError(
                "invalid_brightness_payload",
                f"Brightness payload for {controlled_entity_id} must be an object",
            )

        normalized_brightness = {}
        for raw_key, raw_value in brightness.items():
            key = _parse_curve_percent(raw_key, "level")
            value = _parse_curve_percent(raw_value, "value")

            if key < 0 or key > 100:
                raise CurveValidationError(
                    "curve_level_out_of_range",
                    f"Brightness level must be 0-100, got {key}",
                )
            if value < 0 or value > 100:
                raise CurveValidationError(
                    "curve_value_out_of_range",
                    f"Brightness value must be 0-100, got {value}",
                )

            normalized_brightness[str(key)] = str(value)

        normalized_curves[controlled_entity_id] = {"brightness": normalized_brightness}

    return normalized_curves


def _get_entity_list_cache(hass: HomeAssistant) -> list | None:
    """Return cached entity list if still fresh, else None."""
    cached = hass.data.get(_ENTITY_LIST_CACHE_KEY)
    if cached and (monotonic() - cached[0]) < _ENTITY_LIST_CACHE_TTL:
        return cached[1]
    return None


def _set_entity_list_cache(hass: HomeAssistant, entities: list) -> None:
    hass.data[_ENTITY_LIST_CACHE_KEY] = (monotonic(), entities)


def _invalidate_entity_list_cache(hass: HomeAssistant) -> None:
    hass.data.pop(_ENTITY_LIST_CACHE_KEY, None)


async def _async_restore_config_entry_data(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    previous_data: dict,
) -> None:
    """Restore prior config entry data after a failed post-update apply step."""
    hass.config_entries.async_update_entry(config_entry, data=previous_data)
    try:
        await hass.config_entries.async_reload(config_entry.entry_id)
    except Exception:
        _LOGGER.exception("Failed to restore Lightener config entry after rollback")


async def _async_apply_config_entry_update(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    new_data: dict,
    apply_change: Callable[[], Awaitable[bool]],
) -> bool:
    """Persist new entry data, rolling back if the follow-up apply step fails."""
    previous_data = dict(config_entry.data)
    hass.config_entries.async_update_entry(config_entry, data=new_data)
    try:
        applied = await apply_change()
    except Exception:
        _LOGGER.exception("Failed to apply Lightener config update; rolling back")
        await _async_restore_config_entry_data(hass, config_entry, previous_data)
        return False

    if applied:
        return True

    await _async_restore_config_entry_data(hass, config_entry, previous_data)
    return False


def async_register_commands(hass: HomeAssistant) -> None:
    """Register WebSocket commands."""
    websocket_api.async_register_command(hass, ws_get_curves)
    websocket_api.async_register_command(hass, ws_save_curves)
    websocket_api.async_register_command(hass, ws_list_entities)
    websocket_api.async_register_command(hass, ws_list_candidate_lights)
    websocket_api.async_register_command(hass, ws_set_controlled_lights)
    websocket_api.async_register_command(hass, ws_add_light)
    websocket_api.async_register_command(hass, ws_remove_light)
    websocket_api.async_register_command(hass, ws_resolve_handoff)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "lightener/get_curves",
        vol.Required("entity_id"): str,
    }
)
# Read access is intentionally not admin-gated: curve data is not sensitive,
# and non-admin users need to see curves on their dashboards.
@callback
def ws_get_curves(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Return brightness curves for a Lightener entity."""
    entity_id = msg["entity_id"]
    op_started = monotonic()
    span = start_span(
        _LOGGER,
        "lightener.ws.get_curves",
        message_id=msg["id"],
        lightener_entity_ref=entity_ref(entity_id),
    )

    # Find the config entry for this entity
    entity_registry = async_get_entity_registry(hass)
    entry = entity_registry.async_get(entity_id)

    if entry is None or entry.platform != DOMAIN:
        metric(
            _LOGGER,
            "lightener.ws.get_curves.not_found_total",
            "counter",
            1,
        )
        log_event(
            _LOGGER,
            logging.WARNING,
            "lightener.ws.get_curves.not_found",
            trace_id=span.trace_id,
            span_id=span.span_id,
            lightener_entity_ref=entity_ref(entity_id),
        )
        end_span(_LOGGER, span, status="error", error_code="not_found")
        connection.send_error(
            msg["id"], "not_found", f"Entity {entity_id} is not a Lightener entity"
        )
        return

    if not _connection_can_read_entity(connection, entity_id):
        metric(
            _LOGGER,
            "lightener.ws.get_curves.unauthorized_total",
            "counter",
            1,
        )
        end_span(_LOGGER, span, status="error", error_code="unauthorized")
        connection.send_error(msg["id"], "unauthorized", "Unauthorized")
        return

    config_entry = hass.config_entries.async_get_entry(entry.config_entry_id)
    if config_entry is None:
        metric(
            _LOGGER,
            "lightener.ws.get_curves.not_found_total",
            "counter",
            1,
            cause="missing_config_entry",
        )
        end_span(_LOGGER, span, status="error", error_code="missing_config_entry")
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return

    entities = {
        controlled_entity_id: entity_data
        for controlled_entity_id, entity_data in config_entry.data.get(
            "entities", {}
        ).items()
        if _connection_can_read_entity(connection, controlled_entity_id)
    }
    duration_ms = (monotonic() - op_started) * 1000

    connection.send_result(msg["id"], {"entities": entities})
    metric(
        _LOGGER,
        "lightener.ws.get_curves.duration_ms",
        "histogram",
        round(duration_ms, 2),
    )
    metric(
        _LOGGER,
        "lightener.ws.get_curves.entities_returned",
        "gauge",
        len(entities),
    )
    end_span(
        _LOGGER,
        span,
        status="ok",
        entities_returned=len(entities),
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "lightener/list_entities",
    }
)
@callback
def ws_list_entities(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Return all Lightener light entities.

    Access control: intentionally not admin-restricted. The sidebar panel uses this
    endpoint with require_admin=False so non-admin users can view curves in read-only
    mode. The config_entry_id field is included because the panel filters by it when
    opened from a specific config entry context. This data (entity IDs, friendly names,
    config entry IDs) is already accessible to any authenticated user via HA's own
    config/config_entries/get websocket endpoint.
    """
    op_started = monotonic()
    span = start_span(_LOGGER, "lightener.ws.list_entities", message_id=msg["id"])

    entities = _get_entity_list_cache(hass)
    if entities is None:
        entity_registry = async_get_entity_registry(hass)
        entities = []

        for entry in entity_registry.entities.values():
            if entry.platform != DOMAIN or entry.domain != "light":
                continue

            state = hass.states.get(entry.entity_id)
            friendly_name = (
                state.attributes.get("friendly_name")
                if state is not None
                else entry.original_name or entry.entity_id
            )

            entities.append(
                {
                    "entity_id": entry.entity_id,
                    "name": friendly_name or entry.entity_id,
                    "config_entry_id": entry.config_entry_id,
                }
            )

        entities.sort(key=lambda item: item["name"])
        _set_entity_list_cache(hass, entities)
    visible_entities = [
        entity
        for entity in entities
        if _connection_can_read_entity(connection, entity["entity_id"])
    ]

    connection.send_result(msg["id"], {"entities": visible_entities})
    duration_ms = (monotonic() - op_started) * 1000
    metric(
        _LOGGER,
        "lightener.ws.list_entities.duration_ms",
        "histogram",
        round(duration_ms, 2),
    )
    metric(
        _LOGGER,
        "lightener.ws.list_entities.returned",
        "gauge",
        len(visible_entities),
    )
    end_span(
        _LOGGER,
        span,
        status="ok",
        returned_entities=len(visible_entities),
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "lightener/save_curves",
        vol.Required("entity_id"): str,
        vol.Required("curves"): dict,
    }
)
@websocket_api.async_response
async def ws_save_curves(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Save brightness curves for a Lightener entity."""
    entity_id = msg["entity_id"]
    curves = msg["curves"]
    op_started = monotonic()
    span = start_span(
        _LOGGER,
        "lightener.ws.save_curves",
        message_id=msg["id"],
        lightener_entity_ref=entity_ref(entity_id),
        input_curve_entities=len(curves),
    )
    metric(_LOGGER, "lightener.ws.save_curves.requests_total", "counter", 1)

    # Find the config entry
    entity_registry = async_get_entity_registry(hass)
    entry = entity_registry.async_get(entity_id)

    if entry is None or entry.platform != DOMAIN:
        metric(
            _LOGGER,
            "lightener.ws.save_curves.validation_errors_total",
            "counter",
            1,
            error_code="not_found",
        )
        end_span(_LOGGER, span, status="error", error_code="not_found")
        connection.send_error(
            msg["id"],
            "not_found",
            f"Entity {entity_id} is not a Lightener entity",
        )
        return

    config_entry = hass.config_entries.async_get_entry(entry.config_entry_id)
    if config_entry is None:
        metric(
            _LOGGER,
            "lightener.ws.save_curves.validation_errors_total",
            "counter",
            1,
            error_code="missing_config_entry",
        )
        end_span(_LOGGER, span, status="error", error_code="missing_config_entry")
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return

    new_data = dict(config_entry.data)
    new_entities = dict(new_data.get("entities", {}))

    # Reject unknown entity IDs instead of silently dropping them
    unknown = [eid for eid in curves if eid not in new_entities]
    if unknown:
        metric(
            _LOGGER,
            "lightener.ws.save_curves.validation_errors_total",
            "counter",
            1,
            error_code="unknown_entities",
        )
        log_event(
            _LOGGER,
            logging.WARNING,
            "lightener.ws.save_curves.unknown_entities",
            trace_id=span.trace_id,
            span_id=span.span_id,
            unknown_entities_count=len(unknown),
        )
        connection.send_error(
            msg["id"], "unknown_entities", f"Unknown entity IDs: {unknown}"
        )
        end_span(_LOGGER, span, status="error", error_code="unknown_entities")
        return

    try:
        normalized_curves = _normalize_curve_payload(curves)
    except CurveValidationError as err:
        metric(
            _LOGGER,
            "lightener.ws.save_curves.validation_errors_total",
            "counter",
            1,
            error_code=err.metric_code,
        )
        connection.send_error(msg["id"], "invalid_format", err.message)
        end_span(_LOGGER, span, status="error", error_code=err.metric_code)
        return

    for controlled_entity_id, entity_data in normalized_curves.items():
        if controlled_entity_id in new_entities:
            new_entity = dict(new_entities[controlled_entity_id])
            new_entity["brightness"] = entity_data["brightness"]
            new_entities[controlled_entity_id] = new_entity

    new_data["entities"] = new_entities

    async def _apply_updated_curves() -> bool:
        """Refresh the live entity or reload the entry after saving curves."""
        lightener_entity = hass.data.get(DOMAIN, {}).get(config_entry.entry_id)
        if lightener_entity is not None:
            lightener_entity.reload_curves(new_entities)
            return True
        return await hass.config_entries.async_reload(config_entry.entry_id)

    applied = await _async_apply_config_entry_update(
        hass,
        config_entry,
        new_data,
        _apply_updated_curves,
    )
    if not applied:
        metric(
            _LOGGER,
            "lightener.ws.save_curves.reload_failures_total",
            "counter",
            1,
        )
        end_span(_LOGGER, span, status="error", error_code="reload_failed")
        connection.send_error(msg["id"], "reload_failed", "Config entry reload failed")
        return

    connection.send_result(msg["id"])
    duration_ms = (monotonic() - op_started) * 1000
    metric(
        _LOGGER,
        "lightener.ws.save_curves.duration_ms",
        "histogram",
        round(duration_ms, 2),
    )
    metric(
        _LOGGER,
        "lightener.ws.save_curves.updated_entities",
        "gauge",
        len(curves),
    )
    log_event(
        _LOGGER,
        logging.INFO,
        "lightener.ws.save_curves.success",
        trace_id=span.trace_id,
        span_id=span.span_id,
        updated_entities=len(curves),
        duration_ms=round(duration_ms, 2),
    )
    end_span(
        _LOGGER,
        span,
        status="ok",
        updated_entities=len(curves),
    )


def _resolve_lightener_entry(hass: HomeAssistant, entity_id: str):
    """Return (entry, config_entry) for a Lightener entity, or (None, None) if invalid."""
    entity_registry = async_get_entity_registry(hass)
    entry = entity_registry.async_get(entity_id)
    if entry is None or entry.platform != DOMAIN:
        return None, None
    config_entry = hass.config_entries.async_get_entry(entry.config_entry_id)
    if config_entry is None:
        return entry, None
    return entry, config_entry


def _candidate_area(
    hass: HomeAssistant, entity_id: str
) -> tuple[str | None, str | None]:
    """Return the effective area id and name for an entity."""
    registry_entry = async_get_entity_registry(hass).async_get(entity_id)
    area_id = registry_entry.area_id if registry_entry is not None else None
    if area_id is None and registry_entry is not None and registry_entry.device_id:
        device = dr.async_get(hass).async_get(registry_entry.device_id)
        area_id = device.area_id if device is not None else None
    area = ar.async_get(hass).async_get_area(area_id) if area_id else None
    return area_id, area.name if area is not None else None


def _send_membership_error(
    connection: websocket_api.ActiveConnection, message_id: int, err: MembershipError
) -> None:
    """Send a stable membership error to a websocket client."""
    connection.send_error(message_id, err.code, err.message)


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "lightener/list_candidate_lights",
        vol.Required("entity_id"): str,
    }
)
@callback
def ws_list_candidate_lights(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """List eligible lights plus retained stale members for batch editing."""
    _entry, config_entry = _resolve_lightener_entry(hass, msg["entity_id"])
    if config_entry is None:
        connection.send_error(msg["id"], "not_found", "Lightener entity not found")
        return

    current_ids = list(config_entry.data.get("entities", {}))
    candidate_ids = sorted(
        set(eligible_controlled_light_entity_ids(hass)).union(current_ids)
    )
    entity_registry = async_get_entity_registry(hass)
    candidates = []
    for entity_id in candidate_ids:
        registry_entry = entity_registry.async_get(entity_id)
        state = hass.states.get(entity_id)
        name = None
        if state is not None:
            name = state.attributes.get("friendly_name")
        if not name and registry_entry is not None:
            name = registry_entry.name or registry_entry.original_name
        area_id, area_name = _candidate_area(hass, entity_id)
        candidates.append(
            {
                "entity_id": entity_id,
                "name": name or entity_id,
                "available": state is not None and state.state != STATE_UNAVAILABLE,
                "area_id": area_id,
                "area_name": area_name,
            }
        )

    connection.send_result(
        msg["id"],
        {
            "observed_controlled_entity_ids": current_ids,
            "lights": candidates,
        },
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "lightener/set_controlled_lights",
        vol.Required("entity_id"): str,
        vol.Required("controlled_entity_ids"): vol.All([str], vol.Length(max=100)),
        vol.Required("observed_controlled_entity_ids"): [str],
    }
)
@websocket_api.async_response
async def ws_set_controlled_lights(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Replace controlled lights in one optimistic, transactional update."""
    _entry, config_entry = _resolve_lightener_entry(hass, msg["entity_id"])
    if config_entry is None:
        connection.send_error(msg["id"], "not_found", "Lightener entity not found")
        return

    try:
        update = await async_set_controlled_lights(
            hass,
            config_entry,
            msg["entity_id"],
            msg["controlled_entity_ids"],
            msg["observed_controlled_entity_ids"],
        )
    except MembershipError as err:
        _send_membership_error(connection, msg["id"], err)
        return

    _invalidate_entity_list_cache(hass)
    connection.send_result(
        msg["id"],
        {
            "entities": update.entities,
            "added_entity_ids": update.added_entity_ids,
            "removed_entity_ids": update.removed_entity_ids,
        },
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "lightener/add_light",
        vol.Required("entity_id"): str,
        vol.Required("controlled_entity_id"): str,
        vol.Optional("preset"): str,
    }
)
@websocket_api.async_response
async def ws_add_light(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Compatibility wrapper for adding one controlled light."""
    entity_id = msg["entity_id"]
    controlled_entity_id = msg["controlled_entity_id"]
    preset_id = msg.get("preset") or DEFAULT_CURVE_PRESET
    op_started = monotonic()
    span = start_span(
        _LOGGER,
        "lightener.ws.add_light",
        message_id=msg["id"],
        lightener_entity_ref=entity_ref(entity_id),
        controlled_entity_ref=entity_ref(controlled_entity_id),
    )
    metric(_LOGGER, "lightener.ws.add_light.requests_total", "counter", 1)

    entry, config_entry = _resolve_lightener_entry(hass, entity_id)
    if entry is None or entry.platform != DOMAIN:
        metric(
            _LOGGER,
            "lightener.ws.add_light.validation_errors_total",
            "counter",
            1,
            error_code="not_found",
        )
        end_span(_LOGGER, span, status="error", error_code="not_found")
        connection.send_error(
            msg["id"], "not_found", f"Entity {entity_id} is not a Lightener entity"
        )
        return
    if config_entry is None:
        end_span(_LOGGER, span, status="error", error_code="missing_config_entry")
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return

    if preset_id not in CURVE_PRESETS:
        connection.send_error(
            msg["id"],
            "invalid_format",
            f"Unknown preset: {preset_id}",
        )
        end_span(_LOGGER, span, status="error", error_code="unknown_preset")
        return

    current_ids = list(config_entry.data.get("entities", {}))
    if controlled_entity_id in current_ids:
        connection.send_error(
            msg["id"],
            "already_exists",
            f"{controlled_entity_id} is already controlled by this Lightener",
        )
        end_span(_LOGGER, span, status="error", error_code="already_exists")
        return

    try:
        update = await async_set_controlled_lights(
            hass,
            config_entry,
            entity_id,
            [*current_ids, controlled_entity_id],
            # Pass the pre-lock snapshot so a concurrent membership change is
            # rejected as a conflict rather than silently dropping the other
            # write (the snapshot is rebuilt from, and would clobber, whatever
            # committed while this request was queued behind the lock).
            current_ids,
            new_member_payload_factory=lambda _entity_id: {
                "brightness": dict(CURVE_PRESETS[preset_id])
            },
        )
    except MembershipError as err:
        metric(
            _LOGGER,
            "lightener.ws.add_light.validation_errors_total",
            "counter",
            1,
            error_code=err.code,
        )
        # Preserve legacy format codes for cached older bundles.
        legacy_code = (
            "invalid_format"
            if err.code in {"not_a_light", "self_reference", "recursive_lightener"}
            else "reload_failed"
            if err.code == "rollback_reload_failed"
            else err.code
        )
        connection.send_error(msg["id"], legacy_code, err.message)
        end_span(_LOGGER, span, status="error", error_code=err.code)
        return
    _invalidate_entity_list_cache(hass)

    connection.send_result(msg["id"], {"entities": update.entities})
    duration_ms = (monotonic() - op_started) * 1000
    metric(
        _LOGGER,
        "lightener.ws.add_light.duration_ms",
        "histogram",
        round(duration_ms, 2),
    )
    log_event(
        _LOGGER,
        logging.INFO,
        "lightener.ws.add_light.success",
        trace_id=span.trace_id,
        span_id=span.span_id,
        duration_ms=round(duration_ms, 2),
        total_entities=len(update.entities),
    )
    end_span(
        _LOGGER,
        span,
        status="ok",
        total_entities=len(update.entities),
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "lightener/remove_light",
        vol.Required("entity_id"): str,
        vol.Required("controlled_entity_id"): str,
    }
)
@websocket_api.async_response
async def ws_remove_light(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Compatibility wrapper for removing one controlled light."""
    entity_id = msg["entity_id"]
    controlled_entity_id = msg["controlled_entity_id"]
    op_started = monotonic()
    span = start_span(
        _LOGGER,
        "lightener.ws.remove_light",
        message_id=msg["id"],
        lightener_entity_ref=entity_ref(entity_id),
        controlled_entity_ref=entity_ref(controlled_entity_id),
    )
    metric(_LOGGER, "lightener.ws.remove_light.requests_total", "counter", 1)

    entry, config_entry = _resolve_lightener_entry(hass, entity_id)
    if entry is None or entry.platform != DOMAIN:
        metric(
            _LOGGER,
            "lightener.ws.remove_light.validation_errors_total",
            "counter",
            1,
            error_code="not_found",
        )
        end_span(_LOGGER, span, status="error", error_code="not_found")
        connection.send_error(
            msg["id"], "not_found", f"Entity {entity_id} is not a Lightener entity"
        )
        return
    if config_entry is None:
        end_span(_LOGGER, span, status="error", error_code="missing_config_entry")
        connection.send_error(msg["id"], "not_found", "Config entry not found")
        return

    current_ids = list(config_entry.data.get("entities", {}))

    if controlled_entity_id not in current_ids:
        connection.send_error(
            msg["id"],
            "not_found",
            f"{controlled_entity_id} is not controlled by this Lightener",
        )
        end_span(_LOGGER, span, status="error", error_code="not_controlled")
        return

    if len(current_ids) <= 1:
        connection.send_error(
            msg["id"],
            "last_light",
            "Cannot remove the last light. Delete the Lightener entity instead.",
        )
        end_span(_LOGGER, span, status="error", error_code="last_light")
        return

    try:
        update = await async_set_controlled_lights(
            hass,
            config_entry,
            entity_id,
            [item for item in current_ids if item != controlled_entity_id],
            # Pass the pre-lock snapshot so a concurrent membership change is
            # rejected as a conflict rather than silently dropping the other write.
            current_ids,
        )
    except MembershipError as err:
        metric(
            _LOGGER,
            "lightener.ws.remove_light.validation_errors_total",
            "counter",
            1,
            error_code=err.code,
        )
        if err.code == "rollback_reload_failed":
            connection.send_error(msg["id"], "reload_failed", err.message)
        else:
            _send_membership_error(connection, msg["id"], err)
        end_span(_LOGGER, span, status="error", error_code=err.code)
        return
    _invalidate_entity_list_cache(hass)

    connection.send_result(msg["id"], {"entities": update.entities})
    duration_ms = (monotonic() - op_started) * 1000
    metric(
        _LOGGER,
        "lightener.ws.remove_light.duration_ms",
        "histogram",
        round(duration_ms, 2),
    )
    log_event(
        _LOGGER,
        logging.INFO,
        "lightener.ws.remove_light.success",
        trace_id=span.trace_id,
        span_id=span.span_id,
        duration_ms=round(duration_ms, 2),
        total_entities=len(update.entities),
    )
    end_span(
        _LOGGER,
        span,
        status="ok",
        total_entities=len(update.entities),
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "lightener/resolve_handoff",
        vol.Required("token"): str,
    }
)
@websocket_api.async_response
async def ws_resolve_handoff(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Resolve and consume a native-flow handoff token."""
    user = getattr(connection, "user", None)
    try:
        result = await async_resolve_handoff(
            hass, msg["token"], getattr(user, "id", None)
        )
    except HandoffError as err:
        connection.send_error(msg["id"], err.code, err.message)
        return
    connection.send_result(msg["id"], result)
