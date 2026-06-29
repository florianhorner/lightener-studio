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

from custom_components.lightener_studio.const import CURVE_PRESETS

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "curve_presets.json"


def test_backend_curve_presets_match_contract() -> None:
    """Backend CURVE_PRESETS must equal the shared fixture exactly."""
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    assert fixture == CURVE_PRESETS
