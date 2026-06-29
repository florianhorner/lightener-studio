"""Constants for the Lightener component."""

DOMAIN = "lightener_studio"

TYPE_DIMMABLE = "dimmable"
TYPE_ONOFF = "on_off"

# Default linear curve for new lights: 1% → 1%, 100% → 100%
DEFAULT_BRIGHTNESS = {"1": "1", "100": "100"}

# Built-in curve presets for onboarding in config/options flow.
CURVE_PRESETS: dict[str, dict[str, str]] = {
    "linear": DEFAULT_BRIGHTNESS,
    "dim_accent": {"1": "1", "25": "8", "50": "20", "100": "45"},
    "late_starter": {"1": "1", "45": "1", "70": "45", "100": "100"},
    "night_mode": {"1": "1", "20": "3", "50": "10", "100": "25"},
}

DEFAULT_CURVE_PRESET = "linear"
