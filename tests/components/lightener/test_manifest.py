"""Tests for integration manifest invariants."""

import json
import re
from pathlib import Path


def test_manifest_does_not_require_frontend_component() -> None:
    """Keep frontend optional so tests don't fail in minimal HA environments."""
    manifest_path = (
        Path(__file__).resolve().parents[3]
        / "custom_components"
        / "lightener"
        / "manifest.json"
    )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    dependencies = manifest.get("dependencies", [])

    assert "http" in dependencies
    assert "frontend" not in dependencies


def test_manifest_orders_frontend_via_after_dependencies() -> None:
    """Soft-order setup after frontend so add_extra_js_url finds its UrlManager.

    frontend must stay OUT of hard dependencies (minimal HA environments) but
    IN after_dependencies, otherwise lightener can set up before frontend and
    the extra-module registration silently degrades for that boot.
    """
    manifest_path = (
        Path(__file__).resolve().parents[3]
        / "custom_components"
        / "lightener"
        / "manifest.json"
    )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert "frontend" in manifest.get("after_dependencies", [])
    assert "frontend" not in manifest.get("dependencies", [])


def test_changelog_release_versions_are_unique() -> None:
    """Avoid ambiguous release notes for a given version."""
    changelog_path = Path(__file__).resolve().parents[3] / "CHANGELOG.md"
    changelog = changelog_path.read_text(encoding="utf-8")
    versions = re.findall(r"^## \[([0-9][^\]]*)\]", changelog, flags=re.MULTILINE)

    duplicates = sorted(
        {version for version in versions if versions.count(version) > 1}
    )

    assert duplicates == []
