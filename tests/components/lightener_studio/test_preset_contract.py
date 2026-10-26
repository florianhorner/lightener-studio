"""Contract test pinning the backend curve presets to the shared fixture.

The curve presets are defined independently in two places:

* Backend: ``custom_components/lightener_studio/const.py`` (``CURVE_PRESETS``).
* Frontend: ``js/src/utils/presets.ts`` (``CURVE_PRESETS``).

A shared JSON fixture (``tests/fixtures/curve_presets.json``) holds the
canonical brightness dicts. This test pins the backend definition to that
fixture; a matching JS test pins the frontend definition. Together they
prevent the two sources of truth from silently drifting apart.
"""

import json
from pathlib import Path

import pytest

from custom_components.lightener_studio.brightness import (
    create_brightness_map,
    prepare_brightness_config,
)
from custom_components.lightener_studio.const import CURVE_PRESETS

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "curve_presets.json"


def test_backend_curve_presets_match_contract() -> None:
    """Backend CURVE_PRESETS must equal the shared fixture exactly."""
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    assert fixture == CURVE_PRESETS


def test_equal_midpoint_preserves_every_runtime_brightness_level() -> None:
    """The new editing handle must not change the existing Equal response."""
    previous = create_brightness_map(
        prepare_brightness_config({"1": "1", "100": "100"})
    )
    current = create_brightness_map(prepare_brightness_config(CURVE_PRESETS["linear"]))

    assert current == previous == {level: level for level in range(256)}


@pytest.mark.parametrize("preset_id", CURVE_PRESETS)
def test_preset_runtime_maps_stay_monotone_and_keep_their_caps(preset_id: str) -> None:
    """Check the actual quantized HA mapping, including retained legacy Night."""
    config = prepare_brightness_config(CURVE_PRESETS[preset_id])
    levels = create_brightness_map(config)
    values = [levels[level] for level in range(256)]
    assert values[0] == 0
    assert values == sorted(values)
    assert max(values) == config[-1][1]
    for room, target in config:
        assert levels[room] == target
