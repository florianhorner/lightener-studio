"""Adaptive Lighting integration contract tests.

These tests pin the behaviour that lets Adaptive Lighting (AL) drive a Lightener
group for BOTH brightness and color temperature without destroying the per-member
brightness curves staged in the Lightener.

How AL drives a Lightener (with ``expand_light_groups: false``)::

    AL interval tick
        │  light.turn_on(entity_id=light.<lightener>,
        │                brightness=B, color_temp_kelvin=K, transition=T)
        ▼
    LightenerLight.async_turn_on
        ├── brightness B ──► curve-mapped per member  (staging preserved)
        └── color_temp_kelvin K ──► forwarded verbatim to every member
                                    (FORWARDED_ATTRIBUTES passthrough)

The tests below simulate AL by calling the real ``light.turn_on`` service on the
Lightener entity and asserting what the controlled member lights actually receive.
No hardware, no interactivity — pure HA test harness, CI-safe.
"""

from homeassistant.components.light import DOMAIN as LIGHT_DOMAIN
from homeassistant.const import ATTR_ENTITY_ID, SERVICE_TURN_ON
from homeassistant.core import HomeAssistant

from custom_components.lightener.light import LightenerLight


async def _al_drive(
    hass: HomeAssistant,
    lightener_entity_id: str,
    **service_data: object,
) -> None:
    """Simulate one Adaptive Lighting interval tick via the light.turn_on service.

    Pass whatever AL would send on a tick: ``brightness=`` and/or
    ``color_temp_kelvin=``/``rgb_color=``, plus ``transition=``. Omit ``brightness``
    to model AL's ``separate_turn_on_commands`` color-only follow-up call.
    """
    await hass.services.async_call(
        LIGHT_DOMAIN,
        SERVICE_TURN_ON,
        {ATTR_ENTITY_ID: lightener_entity_id, **service_data},
        blocking=True,
    )
    await hass.async_block_till_done()


async def test_al_drives_brightness_and_color_through_group(
    hass: HomeAssistant, create_lightener
):
    """AL driving the Lightener entity reaches a color-capable member with BOTH axes."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test_temp": {}},  # default linear curve
        }
    )

    await _al_drive(hass, lightener.entity_id, brightness=200, color_temp_kelvin=3000)

    member = hass.states.get("light.test_temp")
    assert member.state == "on"
    # Brightness was curve-mapped (non-zero); exact curve math is covered elsewhere.
    assert member.attributes["brightness"] > 0
    # Color temperature was forwarded verbatim (allow mired round-trip slack).
    assert abs(member.attributes["color_temp_kelvin"] - 3000) <= 60

    # The Lightener entity itself reports the color back to AL.
    group = hass.states.get(lightener.entity_id)
    assert abs(group.attributes["color_temp_kelvin"] - 3000) <= 60


async def test_al_color_reaches_member_brought_on_in_same_tick(
    hass: HomeAssistant, create_lightener
):
    """A member the curve drives from off->on still gets the color from the same tick.

    This is the off-member edge: at low group brightness the curve maps the member to
    0 (turned off, no color). When a later tick raises brightness AND carries color,
    the member must come on already wearing that color — no stale-color frame.
    """

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            # 1% -> 0 (off) ... 100% -> 100 (full)
            "entities": {"light.test_temp": {"1": "0", "100": "100"}},
        }
    )

    # Tick 1: group near floor -> member maps to 0 -> off.
    await _al_drive(hass, lightener.entity_id, brightness=1, color_temp_kelvin=3000)
    assert hass.states.get("light.test_temp").state == "off"

    # Tick 2: group raised + warmer color -> member comes on WITH the new color.
    await _al_drive(hass, lightener.entity_id, brightness=255, color_temp_kelvin=4000)
    member = hass.states.get("light.test_temp")
    assert member.state == "on"
    assert abs(member.attributes["color_temp_kelvin"] - 4000) <= 60


async def test_al_mixed_group_color_member_and_onoff_member(
    hass: HomeAssistant, create_lightener
):
    """Mixed group: color forwarded to capable member, on/off member tolerates it."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {
                "light.test_temp": {},  # color-capable
                "light.test_onoff": {},  # on/off only
            },
        }
    )

    # Must not raise even though color_temp is meaningless for the on/off member.
    await _al_drive(hass, lightener.entity_id, brightness=255, color_temp_kelvin=3000)

    color_member = hass.states.get("light.test_temp")
    assert color_member.state == "on"
    assert abs(color_member.attributes["color_temp_kelvin"] - 3000) <= 60

    onoff_member = hass.states.get("light.test_onoff")
    assert onoff_member.state == "on"
    assert "color_temp_kelvin" not in onoff_member.attributes


async def test_al_dusk_sequence_color_tracks_each_tick(
    hass: HomeAssistant, create_lightener
):
    """Over a sequence of AL ticks (dusk), the member's color follows every tick."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test_temp": {}},
        }
    )

    # (brightness, kelvin) pairs: brightening-to-dimming, cool-to-warm.
    timeline = [(255, 5000), (190, 4000), (120, 3200), (60, 2700)]
    for brightness, kelvin in timeline:
        await _al_drive(
            hass, lightener.entity_id, brightness=brightness, color_temp_kelvin=kelvin
        )
        member = hass.states.get("light.test_temp")
        assert member.state == "on"
        assert abs(member.attributes["color_temp_kelvin"] - kelvin) <= 60


# ---------------------------------------------------------------------------
# Hardening: AL's default behaviours (separate_turn_on_commands,
# detect_non_ha_changes, transition, prefer_rgb_color) exercise paths the
# happy-path tests above do not. AL's manual-change detector pauses a light
# when the group's reported brightness drifts past BRIGHTNESS_CHANGE (25), so
# the group must read back ~what AL sent or AL false-pauses the integration.
# ---------------------------------------------------------------------------

# Half of AL's BRIGHTNESS_CHANGE (25) threshold — staying under this keeps the
# group off AL's manual-override radar.
_AL_BRIGHTNESS_DRIFT_TOLERANCE = 12


async def test_al_group_brightness_reads_back_what_al_sent(
    hass: HomeAssistant, create_lightener
):
    """The group must report ~the brightness AL set, or detect_non_ha_changes pauses it."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test_temp": {}},  # linear curve
        }
    )

    await _al_drive(hass, lightener.entity_id, brightness=200, color_temp_kelvin=3000)

    group = hass.states.get(lightener.entity_id)
    assert abs(group.attributes["brightness"] - 200) <= _AL_BRIGHTNESS_DRIFT_TOLERANCE


async def test_al_group_brightness_readback_multi_member_nonlinear(
    hass: HomeAssistant, create_lightener
):
    """Two members on different non-linear curves must still read back near the sent level.

    This exercises the lossy reverse map + ``common_level.pop()`` resolution in
    async_update_group_state, which the single-member linear tests cannot.
    """

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {
                "light.test1": {"1": "1", "100": "100"},  # linear (brightness-only)
                "light.test_temp": {"1": "1", "50": "100", "100": "100"},  # saturating
            },
        }
    )

    await _al_drive(hass, lightener.entity_id, brightness=200)

    group = hass.states.get(lightener.entity_id)
    assert abs(group.attributes["brightness"] - 200) <= _AL_BRIGHTNESS_DRIFT_TOLERANCE


async def test_al_color_only_tick_preserves_brightness_and_state(
    hass: HomeAssistant, create_lightener
):
    """AL's separate_turn_on_commands color-only follow-up must not drop brightness or turn off."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test_temp": {}},
        }
    )

    # Combined tick establishes brightness.
    await _al_drive(hass, lightener.entity_id, brightness=200, color_temp_kelvin=3000)
    before = hass.states.get("light.test_temp").attributes["brightness"]

    # Color-only follow-up: NO brightness key (the split-command second call).
    await _al_drive(hass, lightener.entity_id, color_temp_kelvin=4500)

    member = hass.states.get("light.test_temp")
    assert member.state == "on"
    assert abs(member.attributes["color_temp_kelvin"] - 4500) <= 60
    # Brightness reused, not lost.
    assert member.attributes["brightness"] == before


async def test_al_transition_forwarded_including_off_member(
    hass: HomeAssistant, create_lightener
):
    """transition rides every AL tick; the off-member turn_off path must accept it."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test_temp": {"1": "0", "100": "100"}},
        }
    )

    # Low tick with transition -> member maps to 0 -> turn_off WITH transition (no raise).
    await _al_drive(
        hass, lightener.entity_id, brightness=1, color_temp_kelvin=3000, transition=2
    )
    assert hass.states.get("light.test_temp").state == "off"

    # Raise with transition -> member back on.
    await _al_drive(
        hass, lightener.entity_id, brightness=255, color_temp_kelvin=3000, transition=2
    )
    assert hass.states.get("light.test_temp").state == "on"


async def test_al_rgb_passthrough_mixed_group(hass: HomeAssistant, create_lightener):
    """prefer_rgb_color / sleep_rgb_color: AL sends rgb_color, not kelvin — must forward."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {
                "light.test_temp": {},  # rgb-capable
                "light.test_onoff": {},  # on/off only
            },
        }
    )

    await _al_drive(hass, lightener.entity_id, brightness=255, rgb_color=(255, 120, 40))

    color_member = hass.states.get("light.test_temp")
    assert color_member.state == "on"
    assert color_member.attributes.get("rgb_color") is not None

    onoff_member = hass.states.get("light.test_onoff")
    assert onoff_member.state == "on"
