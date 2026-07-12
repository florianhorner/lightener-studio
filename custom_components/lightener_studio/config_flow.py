"""The config flow for Lightener."""

import logging
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_ENTITIES, CONF_FRIENDLY_NAME
from homeassistant.core import callback
from homeassistant.data_entry_flow import (
    FlowHandler,
    FlowResult,
    SectionConfig,
    section,
)
from homeassistant.helpers.entity_registry import async_get as async_get_entity_registry
from homeassistant.helpers.selector import selector

from .const import DOMAIN
from .entity_selection import (
    eligible_controlled_light_entity_ids,
    lightener_light_entity_ids,
)
from .handoff import ENTRY_HANDOFF_KEY, create_handoff_metadata
from .membership import (
    MembershipError,
    async_set_controlled_lights,
    build_membership_entities,
    validate_membership_selection,
)

_LOGGER = logging.getLogger(__name__)


class LightenerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Lightener config flow."""

    # The schema version of the entries that it creates.
    # Home Assistant will call the migrate method if the version changes.
    VERSION = 2

    def __init__(self) -> None:
        """Initialize options flow."""
        self.lightener_flow = LightenerFlow(self, steps={"name": "user"})
        super().__init__()

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        """Entry point for the native config flow (details -> lights).

        The Lightener Studio panel launches this native flow (the standard
        HA "Add Integration -> Lightener" entry point) for light selection,
        then hands the user off to the editor for visual curve tuning. Light
        selection lives in HA's native EntitySelector (see async_step_lights),
        which renders reliably inside HA's own dialog rather than a custom
        in-panel picker. Delegating to async_step_name means user_input=None
        shows the name form and a programmatic {"name": ...} POST advances the
        flow, so both the native dialog and any direct caller share one path.
        """
        return await self.lightener_flow.async_step_name(user_input)

    async def async_step_area(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Forward an older in-progress area step into light selection."""
        return await self.lightener_flow.async_step_area(user_input)

    async def async_step_lights(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the selection of the lights controlled by the Lightener light."""
        return await self.lightener_flow.async_step_lights(user_input)

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Create the options flow."""

        return LightenerOptionsFlow(config_entry)


class LightenerOptionsFlow(config_entries.OptionsFlow):
    """The options flow handler for Lightener."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.lightener_flow = LightenerFlow(
            self, steps={"lights": "init"}, config_entry=config_entry
        )
        super().__init__()

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the selection of the lights controlled by the Lightener light."""
        return await self.lightener_flow.async_step_lights(user_input)


class LightenerFlow:
    """Handle steps for both the config and the options flow."""

    def __init__(
        self,
        flow_handler: FlowHandler,
        steps: dict,
        config_entry: config_entries.ConfigEntry | None = None,
    ) -> None:
        """Initialize the LightenerFlow."""

        self.flow_handler = flow_handler
        self.config_entry = config_entry
        self.data = {} if config_entry is None else config_entry.data.copy()
        self.observed_controlled_entity_ids = list(self.data.get(CONF_ENTITIES, {}))
        self.steps = steps

    async def async_step_name(self, user_input: dict[str, Any] | None = None):
        """Configure the lightener device name."""

        errors = {}

        _LOGGER.debug("config_flow step=name user_input=%s", user_input)
        if user_input is not None:
            self.data[CONF_FRIENDLY_NAME] = user_input["name"]
            area_settings = user_input.get("area_settings") or {}
            self.data["_area_filter"] = area_settings.get("area_id")
            return await self.async_step_lights()

        data_schema = {
            vol.Required("name"): str,
            vol.Optional("area_settings"): section(
                vol.Schema({vol.Optional("area_id"): selector({"area": {}})}),
                SectionConfig(collapsed=True),
            ),
        }

        return self.flow_handler.async_show_form(
            step_id=self.steps.get("name", "name"),
            last_step=False,
            data_schema=vol.Schema(data_schema),
            errors=errors,
        )

    async def async_step_area(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Accept the removed standalone area step for in-progress flows."""
        _LOGGER.debug("config_flow step=area user_input=%s", user_input)
        if user_input is not None:
            self.data["_area_filter"] = user_input.get("area_id")
            return await self.async_step_lights()

        return await self.async_step_lights()

    async def async_step_lights(
        self,
        user_input: dict[str, Any] | None = None,
        errors: dict[str, str] | None = None,
    ) -> FlowResult:
        """Manage the selection of the lights controlled by the Lightener light."""

        errors = errors or {}

        _LOGGER.debug("config_flow step=lights user_input=%s", user_input)
        # Enumerate every Lightener-platform light across every config entry,
        # not just the current one. Picking a Lightener as a controlled entity
        # creates a recursive LightGroup whose state listeners feed each other
        # — `flow_handler.async_create_entry` then deadlocks the HA event loop
        # while the new entity registers and immediately receives state events
        # from itself. The card's create-group modal exposed this gap because
        # the lights picker showed every existing Lightener as eligible.
        lightener_entities = lightener_light_entity_ids(self.flow_handler.hass)

        controlled_entities = []
        if self.config_entry is not None:
            # Load the previously configured list of entities controlled by this Lightener.
            controlled_entities = list(
                self.config_entry.data.get(CONF_ENTITIES, {}).keys()
            )

        if user_input is not None:
            selected = user_input.get("controlled_entities")

            if not selected:
                errors["controlled_entities"] = "controlled_entities_empty"
            else:
                # Build entities dict, preserving existing curves for lights
                # that were already configured, and assigning the default
                # (linear) curve to new ones. Curve choice happens visually
                # in the Lightener Studio panel after the flow completes —
                # the panel exposes presets as live curve thumbnails on the
                # actual graph rather than as text radio buttons here.
                if self.config_entry is not None:
                    group_entity_id = self._group_entity_id()
                    try:
                        # Persists + reloads the entry itself; the options flow
                        # has nothing left to save, so the return value is unused.
                        await async_set_controlled_lights(
                            self.flow_handler.hass,
                            self.config_entry,
                            group_entity_id,
                            selected,
                            self.observed_controlled_entity_ids,
                        )
                    except MembershipError as err:
                        self.data = self.config_entry.data.copy()
                        self.observed_controlled_entity_ids = list(
                            self.data.get(CONF_ENTITIES, {})
                        )
                        return await self.async_step_lights(
                            None, errors={"base": err.code}
                        )
                    return self.flow_handler.async_create_entry(title="", data={})

                existing_entities = self.data.get(CONF_ENTITIES, {})
                try:
                    validate_membership_selection(
                        self.flow_handler.hass,
                        "",
                        existing_entities,
                        selected,
                    )
                except MembershipError as err:
                    return await self.async_step_lights(None, errors={"base": err.code})
                self.data[CONF_ENTITIES] = build_membership_entities(
                    existing_entities, selected
                )
                return await self.async_save_data()

        # If an area was selected in the area step, narrow the picker to the
        # lights in that area via include_entities. The HA entity selector's
        # `filter` schema does not accept any area key — passing one raises a
        # schema validation error that surfaces as an "Unknown error" toast.
        entity_selector_config: dict[str, Any] = {
            "multiple": True,
            "filter": {"domain": "light"},
            "exclude_entities": lightener_entities,
        }
        area_id = self.data.get("_area_filter")
        if area_id:
            entity_selector_config["include_entities"] = (
                eligible_controlled_light_entity_ids(self.flow_handler.hass, area_id)
            )

        return self.flow_handler.async_show_form(
            step_id=self.steps.get("lights", "lights"),
            last_step=True,
            data_schema=vol.Schema(
                {
                    vol.Required(
                        "controlled_entities", default=controlled_entities
                    ): selector({"entity": entity_selector_config}),
                }
            ),
            errors=errors,
        )

    async def async_save_data(self) -> FlowResult:
        """Save the configured data."""

        # We don't save it into the "options" key but always in "config",
        # no matter if the user called the config or the options flow.

        # Strip internal flow-only keys (prefixed with _) before persisting.
        persist_data = {k: v for k, v in self.data.items() if not k.startswith("_")}

        # If in a config flow, create the config entry. Hand the user off to
        # the Lightener Studio panel for visual curve tuning — the editor is
        # where presets are picked against the live graph rather than as text
        # radios, which is the actual product experience.
        if self.config_entry is None:
            handoff = create_handoff_metadata(
                getattr(self.flow_handler, "context", {}).get("user_id")
            )
            persist_data[ENTRY_HANDOFF_KEY] = handoff
            return self.flow_handler.async_create_entry(
                title=persist_data.get(CONF_FRIENDLY_NAME),
                data=persist_data,
                description="open_editor",
                description_placeholders={
                    "editor_url": f"/lightener-editor?handoff={handoff['token']}"
                },
            )

        return self.flow_handler.async_create_entry(title="", data={})

    def _group_entity_id(self) -> str:
        """Return the Lightener entity owned by the options-flow entry."""
        registry = async_get_entity_registry(self.flow_handler.hass)
        return next(
            (
                entry.entity_id
                for entry in registry.entities.values()
                if entry.platform == DOMAIN
                and entry.config_entry_id == self.config_entry.entry_id
                and entry.domain == "light"
            ),
            "",
        )
