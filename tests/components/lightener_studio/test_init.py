"""Tests for __init__."""

import logging
import re
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.entity_registry import (
    async_get as async_get_entity_registry,
)
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.lightener_studio import (
    _detect_stale_domain_folder,
    async_migrate_entry,
    async_setup,
    async_unload_entry,
)
from custom_components.lightener_studio.config_flow import LightenerConfigFlow
from custom_components.lightener_studio.const import DOMAIN


async def test_async_setup_registers_websocket_and_static_path(
    hass: HomeAssistant,
) -> None:
    """Test integration setup registers websocket handlers and static frontend path."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch(
            "custom_components.lightener_studio.websocket.async_register_commands"
        ) as register_commands,
        patch(
            "homeassistant.components.frontend.async_register_built_in_panel"
        ) as register_panel,
    ):
        assert await async_setup(hass, {}) is True

    register_commands.assert_called_once_with(hass)
    hass.http.async_register_static_paths.assert_awaited_once()
    register_panel.assert_called_once()

    paths = hass.http.async_register_static_paths.await_args.args[0]
    by_url = {p.url_path: p for p in paths}

    unversioned = by_url["/lightener/lightener-curve-card.js"]
    assert unversioned.path.endswith(
        "/custom_components/lightener_studio/frontend/lightener-curve-card.js"
    )
    assert unversioned.cache_headers is False

    versioned_keys = [
        k
        for k in by_url
        if k != "/lightener/lightener-curve-card.js"
        and re.fullmatch(r"/lightener/lightener-curve-card\.[^/]+\.js", k)
    ]
    assert len(versioned_keys) == 1
    versioned = by_url[versioned_keys[0]]
    assert versioned.path.endswith(
        "/custom_components/lightener_studio/frontend/lightener-curve-card.js"
    )
    # The path-stamped URL is immutable per release, so it is cached.
    assert versioned.cache_headers is True

    panel = by_url["/lightener/lightener-panel.js"]
    assert panel.path.endswith(
        "/custom_components/lightener_studio/frontend/lightener-panel.js"
    )
    assert panel.cache_headers is False

    assert register_panel.call_args.args[1] == "custom"
    assert register_panel.call_args.kwargs["frontend_url_path"] == "lightener-editor"
    panel_custom = register_panel.call_args.kwargs["config"]["_panel_custom"]
    assert panel_custom["name"] == "lightener-editor-panel"
    assert panel_custom["embed_iframe"] is False
    assert panel_custom["trust_external"] is False
    assert panel_custom["module_url"].startswith("/lightener/lightener-panel.js?v=")
    assert panel_custom["js_url"].startswith("/lightener/lightener-panel.js?v=")


async def test_async_setup_panel_urls_degrade_gracefully_without_manifest(
    hass: HomeAssistant,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Test panel URLs fall back to unversioned when manifest.json cannot be read."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()
    # Only the manifest read goes through async_add_executor_job in async_setup.
    # Raising here is narrower than patching pathlib.Path.read_text globally.
    hass.async_add_executor_job = AsyncMock(side_effect=OSError("manifest missing"))

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch(
            "homeassistant.components.frontend.async_register_built_in_panel"
        ) as register_panel,
        caplog.at_level(logging.WARNING, logger="custom_components.lightener_studio"),
    ):
        assert await async_setup(hass, {}) is True

    hass.http.async_register_static_paths.assert_awaited_once()
    assert "Could not read manifest.json" in caplog.text

    panel_custom = register_panel.call_args.kwargs["config"]["_panel_custom"]
    assert panel_custom["module_url"] == "/lightener/lightener-panel.js"
    assert panel_custom["js_url"] == "/lightener/lightener-panel.js"


async def test_async_setup_versioned_path_omitted_without_version(
    hass: HomeAssistant,
) -> None:
    """Test that the versioned card path is skipped when manifest has no version key."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()
    hass.async_add_executor_job = AsyncMock(return_value="{}")

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
        patch("homeassistant.components.frontend.add_extra_js_url") as add_extra,
    ):
        assert await async_setup(hass, {}) is True

    paths = hass.http.async_register_static_paths.await_args.args[0]
    by_url = {p.url_path: p for p in paths}
    assert "/lightener/lightener-curve-card.js" in by_url
    assert "/lightener/lightener-panel.js" in by_url
    assert not any(
        re.fullmatch(r"/lightener/lightener-curve-card\.[^/]+\.js", k)
        for k in by_url
        if k != "/lightener/lightener-curve-card.js"
    )
    # Without a version, the extra module falls back to the bare card URL.
    add_extra.assert_called_once_with(hass, "/lightener/lightener-curve-card.js")


async def test_async_setup_skips_versioned_path_for_unsafe_version(
    hass: HomeAssistant,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Test that a version string with unsafe characters is rejected with a warning."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()
    hass.async_add_executor_job = AsyncMock(return_value='{"version": "../../evil"}')

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
        patch("homeassistant.components.frontend.add_extra_js_url") as add_extra,
        caplog.at_level(logging.WARNING, logger="custom_components.lightener_studio"),
    ):
        assert await async_setup(hass, {}) is True

    paths = hass.http.async_register_static_paths.await_args.args[0]
    by_url = {p.url_path: p for p in paths}
    assert "/lightener/lightener-curve-card.js" in by_url
    assert "/lightener/lightener-panel.js" in by_url
    assert not any(
        re.fullmatch(r"/lightener/lightener-curve-card\.[^/]+\.js", k)
        for k in by_url
        if k != "/lightener/lightener-curve-card.js"
    )
    assert "unsafe characters" in caplog.text
    # An unsafe version also falls back to the bare card URL.
    add_extra.assert_called_once_with(hass, "/lightener/lightener-curve-card.js")


async def test_async_setup_strips_build_metadata_from_versioned_path(
    hass: HomeAssistant,
) -> None:
    """A SemVer build-metadata segment (+build.N) must be stripped from the URL.

    Documents the chosen behavior: two builds that share a SemVer core but differ
    only in build metadata (e.g. 2.15.0+build.1 vs 2.15.0+build.2) collapse to the
    same versioned URL. This is acceptable because the project's release flow always
    bumps SemVer; pure build-metadata-only releases would not invalidate the SW
    cache and are therefore not a supported upgrade vector.
    """

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()
    hass.async_add_executor_job = AsyncMock(
        return_value='{"version": "2.15.0+build.4"}'
    )

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
    ):
        assert await async_setup(hass, {}) is True

    paths = hass.http.async_register_static_paths.await_args.args[0]
    by_url = {p.url_path: p for p in paths}
    assert "/lightener/lightener-curve-card.2.15.0.js" in by_url
    # The "+" must not leak into any registered URL — '+' is reserved in URL paths.
    assert not any("+" in k for k in by_url)


async def test_async_setup_continues_when_static_path_registration_fails(
    hass: HomeAssistant,
) -> None:
    """Test integration setup succeeds even if static path setup fails."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock(side_effect=RuntimeError)

    with (
        patch(
            "custom_components.lightener_studio.websocket.async_register_commands"
        ) as register_commands,
        patch("homeassistant.components.frontend.add_extra_js_url") as add_extra,
    ):
        assert await async_setup(hass, {}) is True

    register_commands.assert_called_once_with(hass)
    hass.http.async_register_static_paths.assert_awaited_once()
    # The card route never registered, so the extra-module URL must not be
    # added — otherwise every authenticated page would import a 404.
    add_extra.assert_not_called()


async def test_async_setup_continues_when_panel_registration_fails(
    hass: HomeAssistant,
) -> None:
    """Test integration setup succeeds even if panel registration fails."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch(
            "custom_components.lightener_studio.websocket.async_register_commands"
        ) as register_commands,
        patch(
            "homeassistant.components.frontend.async_register_built_in_panel",
            side_effect=RuntimeError,
        ) as register_panel,
    ):
        assert await async_setup(hass, {}) is True

    register_commands.assert_called_once_with(hass)
    hass.http.async_register_static_paths.assert_awaited_once()
    register_panel.assert_called_once()


async def test_async_setup_continues_when_http_component_is_unavailable(
    hass: HomeAssistant,
) -> None:
    """Test integration setup succeeds when hass.http is unavailable."""

    hass.http = None

    with (
        patch(
            "custom_components.lightener_studio.websocket.async_register_commands"
        ) as register_commands,
        patch("homeassistant.components.frontend.add_extra_js_url") as add_extra,
    ):
        assert await async_setup(hass, {}) is True

    register_commands.assert_called_once_with(hass)
    # No static route exists without hass.http; the extra module must not load.
    add_extra.assert_not_called()


async def test_async_setup_registers_card_extra_module_with_registered_url(
    hass: HomeAssistant,
) -> None:
    """Test the extra-module URL exactly matches a registered static url_path."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
        patch("homeassistant.components.frontend.add_extra_js_url") as add_extra,
    ):
        assert await async_setup(hass, {}) is True

    paths = hass.http.async_register_static_paths.await_args.args[0]
    url_paths = {p.url_path for p in paths}

    add_extra.assert_called_once()
    called_hass, card_url = add_extra.call_args.args
    assert called_hass is hass
    # The URL must be one of the actually registered static routes — guards
    # against f-string drift between registration and add_extra_js_url.
    assert card_url in url_paths
    # And it must be the path-versioned card route, not the bare one.
    assert card_url != "/lightener/lightener-curve-card.js"
    assert re.fullmatch(r"/lightener/lightener-curve-card\.[^/]+\.js", card_url)


async def test_async_setup_registers_card_extra_module_via_legacy_static_path(
    hass: HomeAssistant,
) -> None:
    """Test the legacy static-path fallback branch also gates-in the extra module."""

    hass.http = MagicMock(spec=["async_register_static_path"])
    hass.http.async_register_static_path = AsyncMock()

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
        patch("homeassistant.components.frontend.add_extra_js_url") as add_extra,
    ):
        assert await async_setup(hass, {}) is True

    url_paths = {
        call.args[0] for call in hass.http.async_register_static_path.await_args_list
    }
    cache_by_url = {
        call.args[0]: call.kwargs["cache_headers"]
        for call in hass.http.async_register_static_path.await_args_list
    }

    add_extra.assert_called_once()
    card_url = add_extra.call_args.args[1]
    assert card_url in url_paths
    assert re.fullmatch(r"/lightener/lightener-curve-card\.[^/]+\.js", card_url)
    # Cache policy must hold on this branch too: versioned cached, bare not.
    assert cache_by_url[card_url] is True
    assert cache_by_url["/lightener/lightener-curve-card.js"] is False


async def test_async_setup_warns_when_frontend_module_is_unavailable(
    hass: HomeAssistant,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Test setup succeeds with a warning when the frontend module cannot import."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        # Patch the panel registration BEFORE blanking the module so the panel
        # path (which resolves `frontend` via the parent package attribute)
        # degrades harmlessly instead of touching real frontend internals.
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
        patch.dict(sys.modules, {"homeassistant.components.frontend": None}),
        caplog.at_level(logging.WARNING, logger="custom_components.lightener_studio"),
    ):
        assert await async_setup(hass, {}) is True

    hass.http.async_register_static_paths.assert_awaited_once()
    assert "Could not register Lightener card as a frontend extra module" in caplog.text


async def test_async_setup_warns_when_add_extra_js_url_raises(
    hass: HomeAssistant,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Test setup succeeds with a warning when the frontend UrlManager is absent."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
        patch(
            "homeassistant.components.frontend.add_extra_js_url",
            side_effect=KeyError("frontend_extra_module_url"),
        ) as add_extra,
        caplog.at_level(logging.WARNING, logger="custom_components.lightener_studio"),
    ):
        assert await async_setup(hass, {}) is True

    add_extra.assert_called_once()
    assert "Could not register Lightener card as a frontend extra module" in caplog.text


async def test_unloading_one_entry_never_removes_extra_module_url(
    hass: HomeAssistant,
) -> None:
    """Unloading one of several entries must never touch the extra-module registry.

    The integration creates one config entry per Lightener group and options-flow
    reconfigure reloads entries while async_setup does NOT rerun — removing the
    global URL on any entry unload would kill the card on ALL dashboards until a
    full restart. The inverse contract: remove_extra_js_url is never called.
    """

    entry_one = MockConfigEntry(
        domain="lightener_studio",
        data={"friendly_name": "Group One", "entities": {"light.test1": {}}},
    )
    entry_two = MockConfigEntry(
        domain="lightener_studio",
        data={"friendly_name": "Group Two", "entities": {"light.test2": {}}},
    )
    entry_one.add_to_hass(hass)
    entry_two.add_to_hass(hass)

    with patch(
        "homeassistant.components.frontend.remove_extra_js_url",
        create=True,
    ) as remove_extra:
        # Setting up the first entry initializes the component, which loads
        # every known entry of the domain — both groups come up together.
        assert await hass.config_entries.async_setup(entry_one.entry_id)
        await hass.async_block_till_done()
        assert entry_one.state is ConfigEntryState.LOADED
        assert entry_two.state is ConfigEntryState.LOADED

        assert await hass.config_entries.async_unload(entry_one.entry_id)
        await hass.async_block_till_done()

    assert entry_one.state is ConfigEntryState.NOT_LOADED
    # The sibling entry keeps working after the unload.
    assert entry_two.state is ConfigEntryState.LOADED
    remove_extra.assert_not_called()


def test_detect_stale_domain_folder_absent(tmp_path) -> None:
    """No sibling lightener folder -> nothing to flag."""

    component_dir = tmp_path / "lightener_studio"
    component_dir.mkdir()

    assert _detect_stale_domain_folder(component_dir) is None


def test_detect_stale_domain_folder_without_manifest(tmp_path) -> None:
    """A sibling folder without a manifest.json is not flagged."""

    (tmp_path / "lightener_studio").mkdir()
    (tmp_path / "lightener").mkdir()

    assert _detect_stale_domain_folder(tmp_path / "lightener_studio") is None


def test_detect_stale_domain_folder_legacy(tmp_path) -> None:
    """A sibling folder still declaring the old domain is a legacy leftover."""

    component_dir = tmp_path / "lightener_studio"
    component_dir.mkdir()
    stale = tmp_path / "lightener"
    stale.mkdir()
    (stale / "manifest.json").write_text('{"domain": "lightener"}')

    assert _detect_stale_domain_folder(component_dir) == "legacy"


def test_detect_stale_domain_folder_collision(tmp_path) -> None:
    """A sibling folder claiming this integration's domain is a collision."""

    component_dir = tmp_path / "lightener_studio"
    component_dir.mkdir()
    stale = tmp_path / "lightener"
    stale.mkdir()
    (stale / "manifest.json").write_text(f'{{"domain": "{DOMAIN}"}}')

    assert _detect_stale_domain_folder(component_dir) == "collision"


def test_detect_stale_domain_folder_unreadable_manifest(tmp_path) -> None:
    """An unreadable manifest is still a stray folder worth flagging."""

    component_dir = tmp_path / "lightener_studio"
    component_dir.mkdir()
    stale = tmp_path / "lightener"
    stale.mkdir()
    (stale / "manifest.json").write_text("not json")

    assert _detect_stale_domain_folder(component_dir) == "legacy"


@pytest.mark.parametrize(
    ("stale", "issue_id", "severity"),
    [
        ("collision", "stale_domain_folder_collision", ir.IssueSeverity.CRITICAL),
        ("legacy", "stale_domain_folder_legacy", ir.IssueSeverity.WARNING),
    ],
)
async def test_async_setup_creates_stale_folder_repair_issue(
    hass: HomeAssistant, stale: str, issue_id: str, severity: ir.IssueSeverity
) -> None:
    """A detected stray pre-rename folder raises a Repair issue."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
        patch(
            "custom_components.lightener_studio._detect_stale_domain_folder",
            return_value=stale,
        ),
    ):
        assert await async_setup(hass, {}) is True

    issue = ir.async_get(hass).async_get_issue(DOMAIN, issue_id)
    assert issue is not None
    assert issue.severity == severity
    assert issue.is_fixable is False
    assert issue.translation_key == issue_id
    assert "TROUBLESHOOTING.md" in issue.learn_more_url


async def test_async_setup_creates_no_issue_without_stale_folder(
    hass: HomeAssistant,
) -> None:
    """A clean install registers no Repair issue."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
        patch(
            "custom_components.lightener_studio._detect_stale_domain_folder",
            return_value=None,
        ),
    ):
        assert await async_setup(hass, {}) is True

    assert not [key for key in ir.async_get(hass).issues if key[0] == DOMAIN]


async def test_async_setup_survives_stale_folder_check_failure(
    hass: HomeAssistant,
) -> None:
    """A crashing stale-folder check must never block integration setup."""

    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()

    with (
        patch("custom_components.lightener_studio.websocket.async_register_commands"),
        patch("homeassistant.components.frontend.async_register_built_in_panel"),
        patch(
            "custom_components.lightener_studio._detect_stale_domain_folder",
            side_effect=RuntimeError,
        ),
    ):
        assert await async_setup(hass, {}) is True


async def test_async_setup_entry(hass):
    """Test setting up Lightener successfully."""
    config_entry = MockConfigEntry(
        domain="lightener_studio",
        data={
            "friendly_name": "Test",
            "entities": {
                "light.test1": {},
            },
        },
    )
    config_entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    assert "lightener_studio.light" in hass.config.components


@patch(
    "custom_components.lightener_studio.async_unload_entry", wraps=async_unload_entry
)
async def test_async_unload_entry(mock_unload, hass):
    """Test setting up Lightener successfully."""
    config_entry = MockConfigEntry(
        domain="lightener_studio",
        data={
            "friendly_name": "Test",
            "entities": {
                "light.test1": {},
            },
        },
    )
    config_entry.add_to_hass(hass)
    await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    assert config_entry.state is ConfigEntryState.LOADED
    assert "light.test" in hass.states.async_entity_ids()

    assert await hass.config_entries.async_remove(config_entry.entry_id)
    await hass.async_block_till_done()
    assert config_entry.state is ConfigEntryState.NOT_LOADED
    assert "light.test" not in hass.states.async_entity_ids()

    # Ensure that the Lightener unload implementation was called.
    mock_unload.assert_called_once()
    assert mock_unload.return_value


async def test_migrate_entry_current(hass: HomeAssistant) -> None:
    """Test is the migration does nothing for an up-to-date configuration."""

    config_entry = ConfigEntry(
        version=LightenerConfigFlow.VERSION,
        minor_version=LightenerConfigFlow.VERSION,
        title="lightener",
        domain=DOMAIN,
        data={},
        source="user",
        unique_id=None,
        options=None,
        discovery_keys=[],
        subentries_data={},
    )

    data = config_entry.data

    assert await async_migrate_entry(hass, config_entry) is True

    assert config_entry.data is data


async def test_migrate_entry_v1(hass: HomeAssistant) -> None:
    """Test is the migration does nothing for an up-to-date configuration."""

    config_v1 = {
        "friendly_name": "Test",
        "entities": {
            "light.test1": {
                "10": "20",
                "30": "40",
            },
            "light.test2": {
                "50": "60",
                "70": "80",
            },
        },
    }

    config_entry = ConfigEntry(
        version=1,
        minor_version=1,
        title="lightener",
        domain=DOMAIN,
        data=config_v1,
        source="user",
        unique_id=None,
        options=None,
        discovery_keys=[],
        subentries_data={},
    )

    with patch.object(hass.config_entries, "async_update_entry") as update_mock:
        assert await async_migrate_entry(hass, config_entry) is True

    assert update_mock.call_count == 1
    assert update_mock.call_args.kwargs.get("data") == {
        "friendly_name": "Test",
        "entities": {
            "light.test1": {"brightness": {"10": "20", "30": "40"}},
            "light.test2": {"brightness": {"50": "60", "70": "80"}},
        },
    }


async def test_migrate_entry_v1_already_wrapped(hass: HomeAssistant) -> None:
    """Test migration preserves entries already using the v2 entity shape."""

    config_v1 = {
        "friendly_name": "Test",
        "entities": {
            "light.test1": {
                "brightness": {
                    "10": "20",
                    "30": "40",
                }
            }
        },
    }

    config_entry = ConfigEntry(
        version=1,
        minor_version=1,
        title="lightener",
        domain=DOMAIN,
        data=config_v1,
        source="user",
        unique_id=None,
        options=None,
        discovery_keys=[],
        subentries_data={},
    )

    with patch.object(hass.config_entries, "async_update_entry") as update_mock:
        assert await async_migrate_entry(hass, config_entry) is True

    assert update_mock.call_count == 1
    assert update_mock.call_args.kwargs.get("data") == config_v1


async def test_migrate_unknown_version(hass: HomeAssistant) -> None:
    """Test is the migration does nothing for an up-to-date configuration."""

    config_entry = ConfigEntry(
        version=1000,
        minor_version=1000,
        title="lightener",
        domain=DOMAIN,
        data={},
        source="user",
        unique_id=None,
        options=None,
        discovery_keys=[],
        subentries_data={},
    )

    with patch.object(logging.Logger, "error") as mock:
        assert await async_migrate_entry(hass, config_entry) is False

    mock.assert_called_once_with('Unknown configuration version "%i"', 1000)


async def test_remove_device(
    hass: HomeAssistant, hass_ws_client, create_lightener
) -> None:
    """Ensure HA can remove the Lightener device."""

    # Create a Lightener via the helper so a device and entity are registered.
    lightener = await create_lightener()

    # Find the created entity and its device id.
    er = async_get_entity_registry(hass)
    entity_entry = er.async_get(lightener.entity_id)
    assert entity_entry is not None
    assert entity_entry.device_id is not None
    device_id = entity_entry.device_id
    assert entity_entry.config_entry_id is not None
    config_entry_id = entity_entry.config_entry_id

    # Ensure the config component is set up so it registers the device_registry websocket commands.
    assert await async_setup_component(hass, "config", {})
    await hass.async_block_till_done()

    # Call the websocket API to remove the config entry from the device.
    ws = await hass_ws_client(hass)
    ws_result = await ws.remove_device(device_id, config_entry_id)

    # It should succeed and return a result payload.
    assert ws_result["type"] == "result"
    assert ws_result["success"] is True

    # And the device should no longer reference this config entry.
    dev_reg = dr.async_get(hass)
    device_entry = dev_reg.async_get(device_id)
    if device_entry is not None:
        assert config_entry_id not in device_entry.config_entries
