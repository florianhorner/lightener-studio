"""Constants for the Lightener component."""

DOMAIN = "lightener_studio"

TYPE_DIMMABLE = "dimmable"
TYPE_ONOFF = "on_off"

# Default linear curve for new lights: 1% → 1%, 100% → 100%
DEFAULT_BRIGHTNESS = {"1": "1", "100": "100"}

# Starting shapes plus legacy presets accepted by cached clients.
CURVE_PRESETS: dict[str, dict[str, str]] = {
    "linear": DEFAULT_BRIGHTNESS,
    "dim_accent": {"1": "1", "25": "8", "50": "20", "100": "45"},
    "early_starter": {
        "1": "3",
        "15": "36",
        "25": "55",
        "50": "85",
        "65": "93",
        "100": "100",
    },
    "late_starter": {
        "1": "0",
        "60": "0",
        "70": "10",
        "80": "35",
        "90": "65",
        "100": "100",
    },
    # Retained for the legacy lightener/add_light API; absent from the chooser.
    "night_mode": {"1": "1", "20": "3", "50": "10", "100": "25"},
}

DEFAULT_CURVE_PRESET = "linear"

# Versioned contract for ``lightener/list_candidate_lights`` registry-state
# metadata. Clients must treat a response as v1 only when this exact capability
# marker is present and every row owns all required boolean fields.
CANDIDATE_STATE_METADATA_CAPABILITY = "candidate_state_metadata"
CANDIDATE_STATE_METADATA_VERSION = 1

# Stable membership error surfaced by every write path.
MEMBERSHIP_ERROR_DISABLED_ENTITY = "disabled_entity"
