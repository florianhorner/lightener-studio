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


def test_changelog_release_versions_are_unique() -> None:
    """Avoid ambiguous release notes for a given version."""
    changelog_path = Path(__file__).resolve().parents[3] / "CHANGELOG.md"
    changelog = changelog_path.read_text(encoding="utf-8")
    versions = re.findall(r"^## \[([0-9][^\]]*)\]", changelog, flags=re.MULTILINE)

    duplicates = sorted(
        {version for version in versions if versions.count(version) > 1}
    )

    assert duplicates == []
