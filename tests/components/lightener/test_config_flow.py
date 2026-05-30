"""Tests for config_flow."""

from typing import Any
from unittest.mock import patch
from uuid import uuid4

import pytest
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_BRIGHTNESS, CONF_ENTITIES, CONF_FRIENDLY_NAME
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult, InvalidData
from homeassistant.helpers.entity_registry import async_get as async_get_entity_registry
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lightener import const
from custom_components.lightener.config_flow import LightenerConfigFlow
from custom_components.lightener.const import DEFAULT_BRIGHTNESS


async def test_config_flow_steps(hass: HomeAssistant) -> None:
    """Test if the panel-modal config flow works — name, select lights, done with default curves.

    Init shows a notice form (cog path), but the panel modal POSTs {"name": ...}
    directly to advance into the existing flow. Both surfaces share async_step_user.
    """

    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )

    assert result["type"] == "form"
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Test Name"}
    )

    assert result["type"] == "form"
    assert result["step_id"] == "area"
    assert result["last_step"] is False

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={}
    )

    assert result["type"] == "form"
    assert result["step_id"] == "lights"
    assert result["last_step"] is True

    assert get_required(result, "controlled_entities") is True

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        user_input={"controlled_entities": ["light.test1"]},
    )

    assert result["type"] == "create_entry"
    assert result["title"] == "Test Name"
    assert result["data"] == {
        CONF_FRIENDLY_NAME: "Test Name",
        CONF_ENTITIES: {"light.test1": {CONF_BRIGHTNESS: dict(DEFAULT_BRIGHTNESS)}},
    }


async def test_config_flow_init_shows_name_form(
    hass: HomeAssistant,
) -> None:
    """Init shows the native name form — no panel redirect (A-full).

    'Add Integration -> Lightener' now runs the native flow (name -> area ->
    native multi-light selector) instead of bouncing the user to the custom
    panel. The Lightener Studio panel launches this same native flow for its
    'New group' button; light selection lives in HA's native EntitySelector.
    """
    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] == "form"
    assert result["step_id"] == "user"
    schema_keys = {str(k) for k in result["data_schema"].schema}
    assert "name" in schema_keys, (
        f"native flow must open on the name field, got: {schema_keys}"
    )


async def test_config_flow_runs_natively_without_redirect(
    hass: HomeAssistant,
) -> None:
    """The native flow advances name -> area instead of aborting to the editor.

    A-full removed the cog-path abort/redirect: light selection happens in
    HA's native dialog, not the custom panel. No config entry is created until
    the lights step completes, keeping the integration list clean.
    """
    init = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        init["flow_id"], user_input={"name": "Test Name"}
    )
    assert result["type"] == "form"
    assert result["step_id"] == "area"
    assert len(hass.config_entries.async_entries(const.DOMAIN)) == 0


async def test_config_flow_no_internal_keys_in_persisted_data(
    hass: HomeAssistant,
) -> None:
    """Regression test: internal flow keys (prefixed with _) must not leak into the config entry."""

    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Test"}
    )
    # area step — always writes _area_filter to self.data (None when skipped)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        user_input={"controlled_entities": ["light.test1"]},
    )

    assert result["type"] == "create_entry"
    for key in result["data"]:
        assert not key.startswith("_"), f"Internal key '{key}' leaked into config entry"


async def test_config_flow_multiple_lights(hass: HomeAssistant) -> None:
    """Test config flow with multiple lights — all get default curves."""

    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Test Name"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        user_input={"controlled_entities": ["light.test1", "light.test2"]},
    )

    assert result["type"] == "create_entry"
    assert result["data"] == {
        CONF_FRIENDLY_NAME: "Test Name",
        CONF_ENTITIES: {
            "light.test1": {CONF_BRIGHTNESS: dict(DEFAULT_BRIGHTNESS)},
            "light.test2": {CONF_BRIGHTNESS: dict(DEFAULT_BRIGHTNESS)},
        },
    }


async def test_config_flow_handoff_to_editor(hass: HomeAssistant) -> None:
    """The create_entry result must point the user to the Lightener Studio.

    Curve choice happens in the panel against the live graph — the form no
    longer asks for a preset, so the success page has to bridge the user
    from form completion to the editor canvas.
    """

    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Handoff"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"controlled_entities": ["light.test1"]}
    )

    assert result["type"] == "create_entry"
    assert result["description"] == "open_editor"
    assert result["description_placeholders"] == {"editor_url": "/lightener-editor"}


async def test_config_flow_lights_step_has_no_preset_field(
    hass: HomeAssistant,
) -> None:
    """The lights step must not expose a curve_preset field.

    Preset choice is now visual and happens in the panel after creation.
    """

    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Test"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={}
    )

    schema_keys = {str(k) for k in result["data_schema"].schema}
    assert "curve_preset" not in schema_keys
    assert "controlled_entities" in schema_keys


async def test_config_flow_rejects_lightener_as_controlled_entity(
    hass: HomeAssistant,
) -> None:
    """Regression: a Lightener group cannot be selected as a controlled entity.

    Picking an existing Lightener entity to be controlled by a *new* Lightener
    creates a recursive LightGroup whose state listeners feed each other —
    `flow_handler.async_create_entry` then deadlocks the HA event loop while
    the new entity registers and immediately receives state events from
    itself. The card's create-group modal exposed this gap because the lights
    picker showed every existing Lightener as eligible.

    The form must (a) exclude existing Lightener entities from the picker
    and (b) reject any submitted selection that contains one — defense in
    depth against direct API submissions that bypass the picker hint.
    """

    # Set up an existing Lightener group so its entity is in the registry.
    existing = MockConfigEntry(
        domain="lightener",
        version=LightenerConfigFlow.VERSION,
        unique_id=str(uuid4()),
        data={
            CONF_FRIENDLY_NAME: "Existing",
            CONF_ENTITIES: {"light.test1": {CONF_BRIGHTNESS: dict(DEFAULT_BRIGHTNESS)}},
        },
    )
    existing.add_to_hass(hass)
    assert await hass.config_entries.async_setup(existing.entry_id)
    await hass.async_block_till_done()

    entity_registry = async_get_entity_registry(hass)
    lightener_ids = [
        e.entity_id
        for e in entity_registry.entities.values()
        if e.platform == const.DOMAIN and e.domain == "light"
    ]
    assert lightener_ids, "fixture must have created at least one Lightener entity"
    existing_lightener = lightener_ids[0]

    # Drive a fresh config flow up to the lights step.
    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Recursive Test"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={}
    )
    assert result["type"] == "form"
    assert result["step_id"] == "lights"

    # (a) The picker must declare exclude_entities so the existing Lightener
    # cannot be selected via the UI.
    schema = result["data_schema"].schema
    controlled_marker = next(k for k in schema if str(k) == "controlled_entities")
    selector_obj = schema[controlled_marker]
    selector_config = selector_obj.config
    assert existing_lightener in selector_config["exclude_entities"]

    # (b) Schema-level rejection: even when a client posts the Lightener
    # entity_id directly (bypassing the picker hint), HA's data_entry_flow
    # framework runs schema validation before user code sees the input.
    # The selector's exclude_entities list makes it raise InvalidData,
    # so the recursive create_entry path is unreachable.

    with pytest.raises(InvalidData):
        await hass.config_entries.flow.async_configure(
            result["flow_id"],
            user_input={"controlled_entities": [existing_lightener]},
        )


async def test_options_flow_preserves_existing_curves(hass: HomeAssistant) -> None:
    """Test that the options flow preserves existing curves and assigns defaults to new lights."""

    entry = MockConfigEntry(
        domain="lightener",
        version=LightenerConfigFlow.VERSION,
        unique_id=str(uuid4()),
        data={
            CONF_ENTITIES: {
                "light.test1": {CONF_BRIGHTNESS: {"10": "20", "80": "90"}},
                "light.test2": {CONF_BRIGHTNESS: {"30": "40"}},
            }
        },
    )
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)

    assert result["type"] == "form"
    assert result["step_id"] == "init"
    assert result["last_step"] is True

    assert get_default(result, "controlled_entities") == ["light.test1", "light.test2"]

    # Keep test1 (existing curves preserved), drop test2, add test3 (gets defaults)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        user_input={"controlled_entities": ["light.test1", "light.test3"]},
    )

    assert result["type"] == "create_entry"
    assert result["title"] == ""
    assert result["data"] == {}

    assert dict(entry.data) == {
        CONF_ENTITIES: {
            "light.test1": {CONF_BRIGHTNESS: {"10": "20", "80": "90"}},
            "light.test3": {CONF_BRIGHTNESS: dict(DEFAULT_BRIGHTNESS)},
        }
    }
    assert entry.options == {}


async def test_options_flow_assigns_default_curve_to_new_lights(
    hass: HomeAssistant,
) -> None:
    """Options flow keeps existing curves and uses the linear default for added lights.

    Curve tuning (incl. presets) happens in the Lightener Studio panel —
    the options form just adds/removes lights.
    """

    entry = MockConfigEntry(
        domain="lightener",
        version=LightenerConfigFlow.VERSION,
        unique_id=str(uuid4()),
        data={
            CONF_ENTITIES: {
                "light.test1": {CONF_BRIGHTNESS: {"10": "20", "80": "90"}},
            }
        },
    )
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        user_input={"controlled_entities": ["light.test1", "light.test2"]},
    )

    assert result["type"] == "create_entry"
    assert dict(entry.data)[CONF_ENTITIES] == {
        "light.test1": {CONF_BRIGHTNESS: {"10": "20", "80": "90"}},
        "light.test2": {CONF_BRIGHTNESS: dict(DEFAULT_BRIGHTNESS)},
    }


async def test_options_flow_rolls_back_when_reload_fails(
    hass: HomeAssistant,
) -> None:
    """Failed options reload should restore the previous config entry data."""

    original_data = {
        CONF_ENTITIES: {
            "light.test1": {CONF_BRIGHTNESS: {"10": "20", "80": "90"}},
        }
    }
    entry = MockConfigEntry(
        domain="lightener",
        version=LightenerConfigFlow.VERSION,
        unique_id=str(uuid4()),
        data=original_data,
    )
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)

    with patch.object(hass.config_entries, "async_reload", return_value=False):
        result = await hass.config_entries.options.async_configure(
            result["flow_id"],
            user_input={"controlled_entities": ["light.test1", "light.test2"]},
        )

    assert result["type"] == "form"
    assert result["errors"]["base"] == "reload_failed"
    assert dict(entry.data) == original_data


async def test_step_lights_no_lightener(hass: HomeAssistant) -> None:
    """Test if the list of lights to select doesn't include the lightener being configured."""

    entry = MockConfigEntry(
        domain="lightener",
        unique_id=str(uuid4()),
        data={CONF_ENTITIES: {"light.test1": {CONF_BRIGHTNESS: {"10": "20"}}}},
    )
    entry.add_to_hass(hass)

    entity_registry = async_get_entity_registry(hass)

    entity_registry.async_get_or_create(
        domain="light",
        platform="lightener",
        unique_id=str(uuid4()),
        config_entry=entry,
        suggested_object_id="test_lightener",
    )

    result = await hass.config_entries.options.async_init(entry.entry_id)

    assert get_default(result, "controlled_entities") == ["light.test1"]


async def test_step_lights_error_no_selection(hass: HomeAssistant) -> None:
    """Test that submitting with no lights selected shows an error."""

    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Test Name"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={}
    )

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        user_input={"controlled_entities": []},
    )

    assert result["step_id"] == "lights"
    assert result["errors"]["controlled_entities"] == "controlled_entities_empty"


def get_default(form: FlowResult, key: str) -> Any:
    """Get default value for key in voluptuous schema."""

    for schema_key in form["data_schema"].schema:
        if schema_key == key:
            if schema_key.default != vol.UNDEFINED:
                return schema_key.default()
            return None

    raise KeyError(f"Key '{key}' not found")


def get_required(form: FlowResult, key: str) -> Any:
    """Return True if the given key is vol.Required in the form schema."""

    for schema_key in form["data_schema"].schema:
        if schema_key == key:
            return isinstance(schema_key, vol.Required)

    raise KeyError(f"Key '{key}' not found")


def get_entity_selector_config(form: FlowResult, key: str) -> dict[str, Any]:
    """Return the EntitySelector config dict for the given key in the form schema."""

    from homeassistant.helpers.selector import EntitySelector

    for schema_key, validator in form["data_schema"].schema.items():
        if schema_key == key:
            assert isinstance(validator, EntitySelector), (
                f"Expected EntitySelector for '{key}', got {type(validator).__name__}"
            )
            return dict(validator.config)

    raise KeyError(f"Key '{key}' not found")


async def test_area_step_narrows_lights_via_include_entities(
    hass: HomeAssistant,
) -> None:
    """When an area is selected, the lights step picker is scoped to that area.

    Regression: previously the area was passed via filter['area'], which is
    rejected by HA's entity selector schema and surfaced as 'Unknown error'.
    """

    from homeassistant.helpers.area_registry import async_get as async_get_areas
    from homeassistant.helpers.device_registry import async_get as async_get_devices

    area_registry = async_get_areas(hass)
    living_room = area_registry.async_create("Living Room")
    kitchen = area_registry.async_create("Kitchen")

    entity_registry = async_get_entity_registry(hass)

    # Direct area assignment.
    direct_in_living = entity_registry.async_get_or_create(
        domain="light", platform="test", unique_id="direct_living"
    )
    entity_registry.async_update_entity(
        direct_in_living.entity_id, area_id=living_room.id
    )

    # Inherited via device area.
    fake_entry = MockConfigEntry(domain="test", unique_id="device_owner", data={})
    fake_entry.add_to_hass(hass)
    device_registry = async_get_devices(hass)
    living_device = device_registry.async_get_or_create(
        config_entry_id=fake_entry.entry_id,
        identifiers={("test", "living_device")},
        manufacturer="ACME",
    )
    device_registry.async_update_device(living_device.id, area_id=living_room.id)
    via_device_in_living = entity_registry.async_get_or_create(
        domain="light",
        platform="test",
        unique_id="via_device_living",
        device_id=living_device.id,
    )

    # A light in a different area should be excluded.
    direct_in_kitchen = entity_registry.async_get_or_create(
        domain="light", platform="test", unique_id="direct_kitchen"
    )
    entity_registry.async_update_entity(direct_in_kitchen.entity_id, area_id=kitchen.id)

    existing_lightener = MockConfigEntry(
        domain=const.DOMAIN,
        version=LightenerConfigFlow.VERSION,
        unique_id=str(uuid4()),
        data={
            CONF_FRIENDLY_NAME: "Existing",
            CONF_ENTITIES: {"light.test1": {CONF_BRIGHTNESS: dict(DEFAULT_BRIGHTNESS)}},
        },
    )
    existing_lightener.add_to_hass(hass)
    assert await hass.config_entries.async_setup(existing_lightener.entry_id)
    await hass.async_block_till_done()
    lightener_in_living = next(
        entry.entity_id
        for entry in entity_registry.entities.values()
        if entry.platform == const.DOMAIN and entry.domain == "light"
    )
    entity_registry.async_update_entity(lightener_in_living, area_id=living_room.id)

    # Walk the flow: name → area (with id) → lights.
    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Living"}
    )
    assert result["step_id"] == "area"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"area_id": living_room.id}
    )
    assert result["type"] == "form"
    assert result["step_id"] == "lights"

    selector_config = get_entity_selector_config(result, "controlled_entities")

    # The entity selector must NOT carry an area key in its filter (HA rejects it).
    assert "filter" in selector_config
    for f in selector_config["filter"]:
        assert "area" not in f
        assert "area_id" not in f

    # Lights from the selected area are present; lights from other areas are not.
    include_entities = selector_config.get("include_entities", [])
    assert direct_in_living.entity_id in include_entities
    assert via_device_in_living.entity_id in include_entities
    assert direct_in_kitchen.entity_id not in include_entities
    assert lightener_in_living not in include_entities


async def test_area_step_skipped_does_not_set_include_entities(
    hass: HomeAssistant,
) -> None:
    """Skipping the area step leaves the entity selector unconstrained by area."""

    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "All"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={}
    )

    selector_config = get_entity_selector_config(result, "controlled_entities")

    assert "include_entities" not in selector_config
    # Domain filter remains so only lights show up.
    assert selector_config["filter"] == [{"domain": ["light"]}]


async def test_area_with_no_lights_sets_empty_include_entities(
    hass: HomeAssistant,
) -> None:
    """An empty selected area stays empty instead of widening to all lights."""

    from homeassistant.helpers.area_registry import async_get as async_get_areas

    area_registry = async_get_areas(hass)
    empty_area = area_registry.async_create("Empty")

    result = await hass.config_entries.flow.async_init(
        const.DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"name": "Empty test"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], user_input={"area_id": empty_area.id}
    )

    selector_config = get_entity_selector_config(result, "controlled_entities")
    assert selector_config["include_entities"] == []
