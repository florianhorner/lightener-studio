"""Tests for the pure brightness-map helpers in ``custom_components.lightener_studio.brightness``.

These tests deliberately import from the ``brightness`` module so the pure
helpers are exercised directly, independent of the HA entity module. The
broader numerical coverage lives in ``test_light.py``.
"""

from __future__ import annotations

import pytest

from custom_components.lightener_studio.brightness import (
    build_brightness_maps,
    create_brightness_map,
    create_reverse_brightness_map,
    create_reverse_brightness_map_on_off,
    prepare_brightness_config,
    scale_ranged_value_to_int_range,
    translate_config_to_brightness,
)


@pytest.mark.parametrize(
    ("source", "target", "value", "expected"),
    [
        ((0, 100), (0, 255), 0, 0),
        ((0, 100), (0, 255), 50, 128),
        ((0, 100), (0, 255), 100, 255),
        ((1, 255), (0, 100), 128, 50),
        ((0, 10), (0, 100), 7, 70),
        # Pin banker's-rounding behaviour of Python's round().
        # 1.5 -> 2 and 2.5 -> 2 (round-half-to-even).
        ((0, 10), (0, 3), 5, 2),
        ((0, 4), (0, 5), 2, 2),
    ],
)
def test_scale_ranged_value_to_int_range(
    source: tuple[int, int],
    target: tuple[int, int],
    value: int,
    expected: int,
) -> None:
    assert scale_ranged_value_to_int_range(source, target, value) == expected


def test_translate_config_to_brightness_rescales_0_100_to_1_255() -> None:
    """Non-zero values get rescaled to the 1..255 range; zero stays zero."""
    result = translate_config_to_brightness({"50": "50"})
    # Keys and values are both rescaled, except zero which stays zero.
    assert len(result) == 1
    [(k, v)] = result.items()
    assert k == v  # symmetric mapping
    assert 1 <= k <= 255

    zero_result = translate_config_to_brightness({"100": "0"})
    assert zero_result == {255: 0}


def test_prepare_brightness_config_adds_endpoints_and_sorts() -> None:
    """Defaults for 0 and 255 are injected; output is sorted by key."""
    result = prepare_brightness_config({"50": "50"})
    assert result[0] == (0, 0)
    assert result[-1][0] == 255  # max key is 255
    # Sorted ascending
    keys = [k for k, _ in result]
    assert keys == sorted(keys)


def test_prepare_brightness_config_preserves_explicit_max() -> None:
    """If 255 is explicitly configured, the explicit value wins over the default."""
    # value_to_brightness((1,100), 100) == 255, value_to_brightness((1,100), 50) == 128
    result = prepare_brightness_config({"100": "50"})
    d = dict(result)
    assert d[255] == 128


def test_prepare_brightness_config_preserves_explicit_origin_dim_floor() -> None:
    """An explicit 0 key can define the first non-zero target brightness."""
    result = prepare_brightness_config({"0": "12", "100": "80"})
    d = dict(result)
    assert d[0] > 0
    assert d[255] < 255

    brightness_map = create_brightness_map(result)
    assert brightness_map[0] == 0
    assert brightness_map[1] > 0


def test_create_brightness_map_fills_full_range() -> None:
    """Map covers every lightener level 0..255 exactly once."""
    config = prepare_brightness_config({"50": "50"})
    m = create_brightness_map(config)
    assert set(m.keys()) == set(range(256))
    assert m[0] == 0
    assert m[255] == 255


def test_create_brightness_map_is_monotonic_for_linear_config() -> None:
    """For a linear config, the map is monotonically non-decreasing."""
    config = prepare_brightness_config({"50": "50"})
    m = create_brightness_map(config)
    values = [m[i] for i in range(256)]
    assert values == sorted(values)


def test_create_reverse_brightness_map_contains_all_entity_levels() -> None:
    """Reverse map keys span 0..255."""
    config = prepare_brightness_config({"50": "50"})
    levels = create_brightness_map(config)
    reverse = create_reverse_brightness_map(config, levels)
    assert set(reverse.keys()) == set(range(256))


def test_create_reverse_brightness_map_round_trip_linear() -> None:
    """For a linear map, every lightener level appears in the reverse lookup for its entity level."""
    config = prepare_brightness_config({"50": "50"})
    levels = create_brightness_map(config)
    reverse = create_reverse_brightness_map(config, levels)
    for lightener_level, entity_level in levels.items():
        assert lightener_level in reverse[entity_level]


def test_create_reverse_brightness_map_on_off_partition() -> None:
    """On/off reverse map: level 0 keeps the off levels, every other level shares the same on list."""
    config = prepare_brightness_config({"50": "50"})
    levels = create_brightness_map(config)
    reverse = create_reverse_brightness_map(config, levels)
    on_off = create_reverse_brightness_map_on_off(reverse)

    assert on_off[0] == reverse[0]
    # All non-zero entries point at the same on-level list.
    non_zero = [on_off[i] for i in range(1, 256)]
    assert all(entry == non_zero[0] for entry in non_zero)
    # The on-level list and off-level list are disjoint.
    assert not (set(on_off[0]) & set(non_zero[0]))


def test_build_brightness_maps_cache_hits_on_identical_config() -> None:
    """``build_brightness_maps`` is memoized: identical tuple inputs return the same object."""
    # Use a unique config unlikely to be cached already across test ordering.
    cfg = tuple(prepare_brightness_config({"42": "17"}))

    # Clear cache to make hit/miss assertions deterministic for this input.
    build_brightness_maps.cache_clear()

    first = build_brightness_maps(cfg)
    second = build_brightness_maps(cfg)

    # lru_cache returns the same tuple object on hit.
    assert first is second

    info = build_brightness_maps.cache_info()
    assert info.hits >= 1
    assert info.misses >= 1


def test_build_brightness_maps_distinct_configs_miss_cache_independently() -> None:
    """Different tuples are distinct cache keys."""
    build_brightness_maps.cache_clear()

    cfg_a = tuple(prepare_brightness_config({"20": "10"}))
    cfg_b = tuple(prepare_brightness_config({"80": "90"}))

    build_brightness_maps(cfg_a)
    build_brightness_maps(cfg_b)
    info = build_brightness_maps.cache_info()
    assert info.misses == 2
    assert info.currsize == 2


def test_light_module_reexports_share_cache_identity() -> None:
    """``light.build_brightness_maps`` must be the same object as the brightness-module symbol.

    This guards against accidental re-decoration in ``light.py`` which would
    create a second ``@lru_cache`` wrapper and split the cache.
    """
    from custom_components.lightener_studio import light as light_module

    assert light_module.build_brightness_maps is build_brightness_maps


# ---------------------------------------------------------------------------
# Flat-zero regions
#
# A curve that holds a light at 0 across a range of group levels ("stay off
# until the room reaches X%") is something users draw by hand today. It is the
# one shape that changes the *width* of the reverse map, so its behaviour is
# pinned here before anyone edits a preset into that shape.
# ---------------------------------------------------------------------------

# Off until group 45%, then ramp to full. 45% -> HA level 115, 70% -> 178.
FLAT_ZERO_CONFIG = {"45": "0", "70": "45", "100": "100"}


def test_flat_zero_region_maps_every_level_below_the_knee_to_off() -> None:
    """The forward map must report a hard 0, not a 1% floor, below the knee."""
    config = prepare_brightness_config(FLAT_ZERO_CONFIG)
    assert config == [(0, 0), (115, 0), (178, 115), (255, 255)]

    levels = create_brightness_map(config)
    assert {levels[i] for i in range(0, 116)} == {0}
    # The knee itself is above zero, so the light is genuinely off, not dim.
    assert levels[116] > 0
    assert levels[178] == 115
    assert levels[255] == 255


def test_flat_zero_region_widens_the_reverse_map_at_entity_level_zero() -> None:
    """Entity brightness 0 maps back to the whole flat band, not a single level.

    This is the property that makes ``LightenerLight`` reconciliation
    interesting: ``translate_brightness_back(0)`` returns 116 candidate group
    levels for this curve instead of the single ``[0]`` a monotonic curve
    yields. ``light.py`` then intersects those candidates across members and
    pops one. See ``test_light.py`` for the reconciliation behaviour that rides
    on this.
    """
    config = prepare_brightness_config(FLAT_ZERO_CONFIG)
    reverse = create_reverse_brightness_map(config, create_brightness_map(config))

    assert reverse[0] == list(range(0, 116))

    # A curve with no flat-zero region keeps the narrow, single-level mapping.
    linear = prepare_brightness_config({"1": "1", "100": "100"})
    linear_reverse = create_reverse_brightness_map(
        linear, create_brightness_map(linear)
    )
    assert linear_reverse[0] == [0]


def test_flat_zero_region_shifts_the_on_off_partition() -> None:
    """An on/off member of the same group counts fewer levels as "on".

    ``create_reverse_brightness_map_on_off`` derives its "on" set as the
    complement of the "off" set, so widening ``reverse[0]`` narrows it. For a
    non-dimmable light this is what decides whether it is switched on at all.
    """
    config = prepare_brightness_config(FLAT_ZERO_CONFIG)
    reverse = create_reverse_brightness_map(config, create_brightness_map(config))
    on_off = create_reverse_brightness_map_on_off(reverse)

    assert on_off[0] == list(range(0, 116))
    assert on_off[255] == list(range(116, 256))

    linear = prepare_brightness_config({"1": "1", "100": "100"})
    linear_on_off = create_reverse_brightness_map_on_off(
        create_reverse_brightness_map(linear, create_brightness_map(linear))
    )
    assert linear_on_off[255] == list(range(1, 256))


def test_no_shipped_preset_declares_a_flat_zero_region() -> None:
    """Pins the reconciliation blast radius of the built-in shapes.

    Every shipped preset is strictly increasing above group 0, so
    ``reverse[0] == [0]`` for all of them and the wide-candidate path above is
    reachable only from a hand-drawn curve. If a preset is ever changed into a
    flat-zero shape, this fails and points at the tests above.
    """
    from custom_components.lightener_studio.const import CURVE_PRESETS

    for preset_id, brightness in CURVE_PRESETS.items():
        config = prepare_brightness_config(brightness)
        levels = create_brightness_map(config)
        reverse = create_reverse_brightness_map(config, levels)
        assert reverse[0] == [0], f"{preset_id} now declares a flat-zero region"
        # And every preset still lights up as soon as the group leaves 0.
        assert levels[1] > 0, f"{preset_id} is off at the lowest non-zero group level"


# ---------------------------------------------------------------------------
# Dim-floor encoding: the frontend and the backend disagree
#
# The card treats "brightness 12% at the very bottom" as one idea with two
# interchangeable spellings. `prepareBrightnessConfig` in
# js/src/utils/interpolation.ts rewrites an explicit origin {0: t} onto
# lightener 1 before sampling, so the graph previews `{"0": t}` and `{"1": t}`
# identically (pinned from the other side by "treats the two dim-floor
# spellings as identical, unlike the backend" in
# js/src/utils/interpolation.test.ts).
#
# The backend does not do that rewrite: `curvesToWsPayload` stores the two as
# different keys and `prepare_brightness_config` keeps an explicit 0 as the
# first segment's start. The two forms then differ sharply at the bottom, 103
# vs 34 at group level 1, and by up to 2/255 everywhere above it because one
# ramps from level 0 and the other from level 3. Only the bottom is
# user-visible. Pinned here so the gap shows up in a test rather than in a
# room.
# ---------------------------------------------------------------------------


def test_origin_dim_floor_and_lightener_one_are_not_interchangeable() -> None:
    """{"0": t} clamps the bottom of the range; {"1": t} ramps into it."""
    at_origin = prepare_brightness_config({"0": "40", "100": "100"})
    at_one = prepare_brightness_config({"1": "40", "100": "100"})

    # An explicit origin becomes the first segment's start value...
    assert at_origin == [(0, 102), (255, 255)]
    # ...while lightener 1 lands at HA level 3 and leaves a ramp below it.
    assert at_one == [(0, 0), (3, 102), (255, 255)]

    origin_map = create_brightness_map(at_origin)
    one_map = create_brightness_map(at_one)

    # Both are off at a hard zero, since create_brightness_map seeds {0: 0}.
    assert origin_map[0] == 0 and one_map[0] == 0

    # They part company immediately above it: the origin form jumps straight to
    # its floor, the lightener-1 form interpolates up to it over three levels.
    assert origin_map[1] == 103
    assert one_map[1] == 34
    assert one_map[2] == 68
    assert one_map[3] == 102

    # Above that the two never fully converge either: the origin form ramps
    # from level 0 and the other from level 3, so the slopes differ slightly all
    # the way up. The residual is at most 2/255 (<1%) and both land on 255 at
    # the top, which is why only the bottom of the range is user-visible.
    residual = [abs(origin_map[i] - one_map[i]) for i in range(4, 256)]
    assert max(residual) <= 2
    assert origin_map[255] == one_map[255] == 255
