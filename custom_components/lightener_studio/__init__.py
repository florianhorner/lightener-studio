"""Lightener Integration."""

import json
import logging
import re
from collections.abc import Mapping
from pathlib import Path
from types import MappingProxyType
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntry

from .config_flow import LightenerConfigFlow
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.LIGHT]

# The pre-rename folder name. HACS caches the domain it first derived for a
# repository and keeps extracting zip_release updates into that folder, so
# installs that predate the lightener -> lightener_studio rename can regrow
# custom_components/lightener/ (hacs/integration#931).
_STALE_DOMAIN_FOLDER = "lightener"

# Manifest fields that attribute a stray folder to this project. Upstream
# fredck/lightener legitimately lives at custom_components/lightener/ and
# must never be flagged — telling its users to delete it would destroy a
# working third-party integration.
_FORK_MARKERS = ("lightener-studio", "florianhorner")


def _detect_stale_domain_folder(component_dir: Path) -> str | None:
    """Classify a stray pre-rename sibling folder.

    Returns None when there is nothing that can safely be flagged,
    "collision" when the stray folder's manifest claims this integration's
    domain while the correctly-named folder also exists (Home Assistant may
    load either), or "legacy" when the folder holds this project's
    pre-rename manifest.
    """
    manifest_path = component_dir.parent / _STALE_DOMAIN_FOLDER / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text())
    except (FileNotFoundError, NotADirectoryError):
        return None
    except (OSError, ValueError):
        # Unreadable manifest: the folder cannot be attributed to this
        # project, so "delete this folder" would be unsafe advice.
        return None
    if not isinstance(manifest, dict):
        return None
    if manifest.get("domain") == DOMAIN:
        # Only a duplicate when the correctly-named folder also exists.
        # Otherwise the misplaced folder is the only installed copy (HA can
        # load it — the loader keys on manifest domain, not folder name) and
        # deleting it would remove the integration.
        if (component_dir.parent / DOMAIN).is_dir():
            return "collision"
        return None
    fingerprint = " ".join(
        str(manifest.get(field, ""))
        for field in ("documentation", "issue_tracker", "codeowners")
    )
    if any(marker in fingerprint for marker in _FORK_MARKERS):
        return "legacy"
    # An unrelated integration (e.g. upstream Lightener) installed here.
    return None


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Lightener integration."""
    from . import websocket

    websocket.async_register_commands(hass)

    try:
        _manifest_path = Path(__file__).parent / "manifest.json"
        _manifest_text = await hass.async_add_executor_job(_manifest_path.read_text)
        _raw_version = json.loads(_manifest_text).get("version", "")
        # Strip SemVer build metadata (e.g. +build.4) before URL use — '+' is
        # reserved in URL paths. The pre-release label after '-' is kept.
        # Limitation: two manifests that differ only in build metadata
        # (e.g. 2.15.0+build.1 vs 2.15.0+build.2) collapse to the same versioned
        # URL and won't bust the SW cache between them. Accepted because the
        # project's release flow always bumps SemVer — pure build-metadata-only
        # releases are not a supported upgrade path.
        _url_version = _raw_version.split("+")[0] if _raw_version else ""
        _version = (
            _url_version
            if re.fullmatch(
                r"[0-9]+\.[0-9]+\.[0-9]+(?:[.\-][A-Za-z0-9]+)*", _url_version
            )
            else ""
        )
        if _raw_version and not _version:
            _LOGGER.warning(
                "manifest.json version %r contains unsafe characters; skipping cache-busting",
                _raw_version,
            )
    except Exception as e:
        _LOGGER.warning("Could not read manifest.json for version cache-busting: %s", e)
        _version = ""

    _panel_url = (
        f"/lightener/lightener-panel.js?v={_version}"
        if _version
        else "/lightener/lightener-panel.js"
    )

    # Serve the frontend card and panel JS.
    # hass.http is unavailable during some tests. StaticPathConfig is preferred
    # when available, with a fallback for older HA versions.
    _card_file = str(Path(__file__).parent / "frontend" / "lightener-curve-card.js")
    # Unversioned URL kept for back-compat (users who manually added the
    # Lovelace resource at this URL continue to get the card served).
    _bare_card_url = "/lightener/lightener-curve-card.js"
    # Versioned URL: forces a SW cache miss on upgrade because the URL path
    # itself changes. lightener-panel.js imports from this versioned URL, and
    # it is also the URL registered as a frontend extra module below. With an
    # empty/unsafe version it falls back to the bare URL.
    _card_url = (
        f"/lightener/lightener-curve-card.{_version}.js" if _version else _bare_card_url
    )
    # True only when the card route was actually registered (either branch).
    # Stays False when hass.http is unavailable or registration raises.
    static_ok = False
    try:
        if getattr(hass, "http", None) is not None:
            static_paths = [
                (_bare_card_url, _card_file, False),
            ]
            if _version:
                # Both card entries point to the same physical file on disk.
                # The path-stamped URL is immutable per release, so it may be
                # cached aggressively; the bare URL must stay uncached.
                static_paths.append((_card_url, _card_file, True))
            static_paths.append(
                (
                    "/lightener/lightener-panel.js",
                    str(Path(__file__).parent / "frontend" / "lightener-panel.js"),
                    False,
                )
            )
            registered = False

            try:
                from homeassistant.components.http import StaticPathConfig

                register_paths = getattr(hass.http, "async_register_static_paths", None)
                if register_paths is not None:
                    await register_paths(
                        [
                            StaticPathConfig(
                                url_path, path, cache_headers=cache_headers
                            )
                            for url_path, path, cache_headers in static_paths
                        ]
                    )
                    registered = True
                    static_ok = True
            except ImportError:
                registered = False

            if not registered:
                async_register_static_path = getattr(
                    hass.http, "async_register_static_path", None
                )
                register_static_path = getattr(hass.http, "register_static_path", None)
                if (
                    async_register_static_path is not None
                    or register_static_path is not None
                ):
                    for url_path, path, cache_headers in static_paths:
                        if async_register_static_path is not None:
                            await async_register_static_path(
                                url_path, path, cache_headers=cache_headers
                            )
                        elif register_static_path is not None:
                            register_static_path(
                                url_path, path, cache_headers=cache_headers
                            )
                    static_ok = True
    except Exception:
        _LOGGER.debug("Could not register static paths for frontend assets")
        static_ok = False

    # Auto-load the card bundle on every dashboard (storage and YAML mode) via
    # HA's public extra-module API. Gated on static_ok so a failed static-path
    # registration never makes every authenticated page import a 404. The URL
    # is recomputed from the manifest version on every boot, and intentionally
    # NEVER removed on config-entry unload: entries are per-Lightener-group and
    # reload on every options-flow reconfigure, while this registration is
    # global for the whole HA runtime.
    if static_ok:
        try:
            from homeassistant.components.frontend import add_extra_js_url

            add_extra_js_url(hass, _card_url)
            _LOGGER.debug(
                "Registered Lightener card as a frontend extra module: %s", _card_url
            )
        except (ImportError, KeyError, AttributeError) as err:
            _LOGGER.warning(
                "Could not register Lightener card as a frontend extra module: %s",
                err,
            )

    # Register a dedicated sidebar panel for visual curve editing.
    try:
        from homeassistant.components import frontend

        frontend.async_register_built_in_panel(
            hass,
            "custom",
            sidebar_title="Lightener Studio",
            sidebar_icon="mdi:chart-bell-curve-cumulative",
            frontend_url_path="lightener-editor",
            config={
                "_panel_custom": {
                    "name": "lightener-editor-panel",
                    "embed_iframe": False,
                    "trust_external": False,
                    "module_url": _panel_url,
                    # Backward-compatible key for older custom panel handling.
                    "js_url": _panel_url,
                }
            },
            require_admin=False,
            config_panel_domain=DOMAIN,
        )
    except Exception:
        _LOGGER.debug("Could not register Lightener editor panel")

    # Surface a stray pre-rename custom_components/lightener/ folder as a
    # Repair issue. HACS's cached repository record can keep extracting
    # updates into the old folder name after the domain rename; when both
    # folders declare this domain, HA's loader picks one unpredictably.
    # Detection only — deleting the folder from under a running HA (it may
    # be the copy that actually loaded this boot) is not safe unattended.
    try:
        stale = await hass.async_add_executor_job(
            _detect_stale_domain_folder, Path(__file__).parent
        )
        from homeassistant.helpers import issue_registry as ir

        # Clear any issue kind that no longer applies (folder removed, or a
        # collision resolved into a dormant leftover) so a stale Repair card
        # never outlives its cause.
        for kind in ("collision", "legacy"):
            if kind != stale:
                ir.async_delete_issue(hass, DOMAIN, f"stale_domain_folder_{kind}")
        if stale is not None:
            ir.async_create_issue(
                hass,
                DOMAIN,
                f"stale_domain_folder_{stale}",
                is_fixable=False,
                severity=ir.IssueSeverity.CRITICAL
                if stale == "collision"
                else ir.IssueSeverity.WARNING,
                translation_key=f"stale_domain_folder_{stale}",
                learn_more_url=(
                    "https://github.com/florianhorner/lightener-studio/blob/master/"
                    "docs/TROUBLESHOOTING.md#hacs-installs-updates-into-the-old-"
                    "custom_componentslightener-folder"
                ),
            )
    except Exception:
        # Warning, not debug: this check exists to surface a data-integrity
        # risk, so its own failure must be visible at default log levels.
        _LOGGER.warning("Stale domain folder check failed", exc_info=True)

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up platform from a config entry."""

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # Group create/import: panel's list_entities cache must drop stale results
    # so the new group appears immediately.
    from . import websocket

    websocket._invalidate_entity_list_cache(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""

    # Forward the unloading of the entry to the platform.
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
        # Group delete: drop the cache so the panel doesn't show the removed group.
        from . import websocket

        websocket._invalidate_entity_list_cache(hass)

    return unload_ok


async def async_migrate_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Update old versions of the configuration to the current format."""

    version = config_entry.version
    data = config_entry.data

    # Lightener 1.x didn't have config entries, just manual configuration.yaml. We consider this the no-version option.
    if version is None or version == 1:
        new_data = await async_migrate_data(data, version)

        hass.config_entries.async_update_entry(config_entry, data=new_data, version=2)

        return True

    if config_entry.version == LightenerConfigFlow.VERSION:
        return True

    _LOGGER.error('Unknown configuration version "%i"', version)
    return False


async def async_migrate_data(
    data: MappingProxyType[str, Any], version: int | None = None
) -> MappingProxyType[str, Any]:
    """Update data from old versions of the configuration to the current format."""

    # Lightener 1.x didn't have config entries, just manual configuration.yaml. We consider this the no-version option.
    if version is None or version == 1:
        new_data = {
            "entities": {},
        }

        if data.get("friendly_name") is not None:
            new_data["friendly_name"] = data["friendly_name"]

        for entity, brightness in data.get("entities", {}).items():
            if (
                isinstance(brightness, Mapping)
                and "brightness" in brightness
                and isinstance(brightness["brightness"], Mapping)
            ):
                normalized_brightness = dict(brightness["brightness"])
            elif isinstance(brightness, Mapping):
                normalized_brightness = dict(brightness)
            else:
                normalized_brightness = brightness

            new_data.get("entities")[entity] = {"brightness": normalized_brightness}

        return MappingProxyType(new_data)

    # Otherwise return a copy of the data.
    return MappingProxyType(dict(data))


async def async_remove_config_entry_device(
    _hass: HomeAssistant, _config_entry: ConfigEntry, _device_entry: DeviceEntry
) -> bool:
    """Remove a config entry from a device."""

    return True
