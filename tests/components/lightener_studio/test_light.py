"""Tests for the light platform."""

import inspect
from unittest.mock import ANY, Mock, patch
from uuid import uuid4

import pytest
from homeassistant.components.light import ATTR_TRANSITION, ColorMode
from homeassistant.components.light import DOMAIN as LIGHT_DOMAIN
from homeassistant.const import ATTR_ENTITY_ID, SERVICE_TURN_OFF, SERVICE_TURN_ON
from homeassistant.core import HomeAssistant, ServiceRegistry
from homeassistant.exceptions import HomeAssistantError

from custom_components.lightener_studio.const import TYPE_DIMMABLE, TYPE_ONOFF
from custom_components.lightener_studio.light import (
    LightenerControlledLight,
    LightenerLight,
    async_setup_platform,
    create_brightness_map,
    create_reverse_brightness_map,
    create_reverse_brightness_map_on_off,
    prepare_brightness_config,
    scale_ranged_value_to_int_range,
    translate_config_to_brightness,
)
from custom_components.lightener_studio.observability import end_span


async def test_turn_on_resilient_to_single_failure(
    hass: HomeAssistant, create_lightener
):
    """Ensure a failure in one entity service call does not cancel other calls."""

    # Create a lightener with two lights
    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {
                "light.test1": {},
                "light.test2": {},
            },
        }
    )

    calls: list[tuple] = []

    # Capture original class method so successful calls can delegate
    orig_async_call = ServiceRegistry.async_call

    async def fake_async_call(self, domain, service, data, blocking=True, context=None):
        calls.append((domain, service, data.get(ATTR_ENTITY_ID)))
        if data.get(ATTR_ENTITY_ID) == "light.test1":
            raise RuntimeError("boom")
        return await orig_async_call(
            self, domain, service, data, blocking=blocking, context=context
        )

    # Patch the class method with autospec so `self` is passed
    with patch.object(
        ServiceRegistry, "async_call", side_effect=fake_async_call, autospec=True
    ):
        await lightener.async_turn_on(brightness=128)
        await hass.async_block_till_done()

    # Both calls were attempted (order not guaranteed due to concurrency)
    attempted = sorted([c[2] for c in calls])
    assert attempted == ["light.test1", "light.test2"]

    # light.test1 failed
    assert hass.states.get("light.test1").state == "off"

    # light.test2 should have ended up on despite light.test1 failing
    assert hass.states.get("light.test2").state == "on"


###########################################################
### LightenerLight class only tests


async def test_lightener_light_properties(hass):
    """Test all the basic properties of the LightenerLight class."""

    config = {"friendly_name": "Living Room"}
    unique_id = str(uuid4())

    lightener = LightenerLight(hass, config, unique_id)

    assert lightener.unique_id == unique_id

    # Name must be empty so it'll be taken from the device
    assert lightener.name is None
    assert lightener.device_info["name"] == "Living Room"

    assert lightener.should_poll is False
    assert lightener.has_entity_name is True

    assert lightener.icon == "mdi:lightbulb-group"


async def test_lightener_light_properties_no_unique_id(hass):
    """Test all the basic properties of the LightenerLight class when no unique id is provided."""

    config = {"friendly_name": "Living Room"}

    lightener = LightenerLight(hass, config)

    assert lightener.unique_id is None
    assert lightener.device_info is None
    assert lightener.name == "Living Room"


async def test_lightener_light_turn_on(hass: HomeAssistant, create_lightener):
    """Test the state changes of the LightenerLight class when turned on."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {
                "light.test1": {},
                "light.test2": {},
            },
        }
    )

    await lightener.async_turn_on()
    await hass.async_block_till_done()

    assert hass.states.get("light.test1").state == "on"
    assert hass.states.get("light.test2").state == "on"


async def test_lightener_light_turn_on_forward(hass: HomeAssistant, create_lightener):  # pylint: disable=unused-argument
    """Test if passed arguments are forwared when turned on."""

    lightener: LightenerLight = await create_lightener()

    with patch.object(ServiceRegistry, "async_call") as async_call_mock:
        await lightener.async_turn_on(
            brightness=50, effect="blink", color_temp_kelvin=3000
        )

    async_call_mock.assert_called_once_with(
        LIGHT_DOMAIN,
        SERVICE_TURN_ON,
        {
            ATTR_ENTITY_ID: "light.test1",
            "brightness": 50,
            "effect": "blink",
            "color_temp_kelvin": 3000,
        },
        blocking=True,
        context=ANY,
    )


async def test_lightener_light_turn_on_go_off_if_brightness_0(
    hass: HomeAssistant, create_lightener
):
    """Test that turned on sends brightness 0 if the controlled light is on."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {"50": "0"}},
        }
    )

    hass.states.async_set(entity_id="light.test1", new_state="on")

    await lightener.async_turn_on(brightness=1)
    await hass.async_block_till_done()

    assert hass.states.get("light.test1").state == "off"


async def test_lightener_light_turn_on_translate_brightness(
    hass: HomeAssistant, create_lightener
):
    """Test that turned on sends brightness 0 if the controlled light is on."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {"50": "0"}},
        }
    )
    hass.states.async_set(entity_id="light.test1", new_state="on")

    await lightener.async_turn_on(brightness=192)
    await hass.async_block_till_done()

    assert hass.states.get("light.test1").state == "on"
    assert hass.states.get("light.test1").attributes["brightness"] == 129


async def test_lightener_light_turn_on_go_off_if_brightness_0_transition(
    hass: HomeAssistant, create_lightener
):
    """Test that turned on sends brightness 0 if the controlled light is on."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {"50": "0"}},
        }
    )

    hass.states.async_set(entity_id="light.test1", new_state="on")

    with patch.object(ServiceRegistry, "async_call") as async_call_mock:
        await lightener.async_turn_on(brightness=1, transition=10)

    async_call_mock.assert_called_once_with(
        LIGHT_DOMAIN,
        SERVICE_TURN_OFF,
        {ATTR_ENTITY_ID: "light.test1", ATTR_TRANSITION: 10},
        blocking=True,
        context=ANY,
    )


async def test_lightener_light_color_mode_xy(hass: HomeAssistant, create_lightener):
    """Test that Lightener inherits the color mode of the controlled lights."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {}},
        }
    )

    hass.states.async_set(
        entity_id="light.test1",
        new_state="on",
        attributes={"color_mode": ColorMode.XY},
    )

    await lightener.async_update_ha_state()
    await hass.async_block_till_done()

    assert hass.states.get("light.test1").attributes["color_mode"] == ColorMode.XY

    assert lightener.color_mode == ColorMode.XY
    assert lightener.supported_color_modes == {ColorMode.XY}


async def test_lightener_light_color_mode_onoff(hass: HomeAssistant, create_lightener):
    """Test that Lightener keeps its color mode to BRIGHTNESS with an ONOFF controlled light."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test_onoff": {}},
        }
    )

    hass.states.async_set(
        entity_id="light.test_onoff",
        new_state="on",
        attributes={"color_mode": ColorMode.ONOFF},
    )

    await lightener.async_turn_on(brightness=1)
    await hass.async_block_till_done()

    assert lightener.color_mode == ColorMode.BRIGHTNESS
    assert lightener.supported_color_modes == {ColorMode.BRIGHTNESS}

    assert (
        hass.states.get("light.test_onoff").attributes["color_mode"] == ColorMode.ONOFF
    )

    # Assert that the color_mode goes to null when the light is turned off
    await lightener.async_turn_off()
    await hass.async_block_till_done()

    assert lightener.color_mode is None
    assert lightener.supported_color_modes == {ColorMode.BRIGHTNESS}


async def test_lightener_light_color_mode_unknown(
    hass: HomeAssistant, create_lightener
):
    """Test that Lightener keeps its color mode to BRIGHTNESS with a controlled light that has color_mode UNKNOWN."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test_temp": {}},
        }
    )

    hass.states.async_set(
        entity_id="light.test_temp",
        new_state="on",
        attributes={"color_mode": ColorMode.UNKNOWN},
    )

    await lightener.async_turn_on(brightness=1)
    await hass.async_block_till_done()

    assert lightener.color_mode == ColorMode.BRIGHTNESS

    assert (
        hass.states.get("light.test_temp").attributes["color_mode"] == ColorMode.UNKNOWN
    )

    # Assert that the color_mode goes to null when the light is turned off
    await lightener.async_turn_off()
    await hass.async_block_till_done()

    assert lightener.color_mode is None


async def test_lightener_light_async_update_group_state(
    hass: HomeAssistant, create_lightener
):
    """Test that turned on does nothing if the controlled light is already off."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {"50": "0"}},
        }
    )

    lightener._attr_brightness = 150  # pylint: disable=protected-access

    hass.states.async_set(
        entity_id="light.test1", new_state="on", attributes={"color_temp_kelvin": 3000}
    )

    lightener.async_update_group_state()

    assert lightener.is_on is True
    assert lightener.color_temp_kelvin == 3000

    assert lightener.brightness == 255

    hass.states.async_set(
        entity_id="light.test1", new_state="on", attributes={"brightness": 255}
    )

    lightener.async_update_group_state()

    assert lightener.brightness == 255

    hass.states.async_set(
        entity_id="light.test1", new_state="on", attributes={"brightness": 1}
    )

    lightener.async_update_group_state()

    assert lightener.brightness == 128

    hass.states.async_set(
        entity_id="light.test1", new_state="on", attributes={"brightness": 0}
    )

    lightener.async_update_group_state()

    assert lightener.is_on is True
    assert lightener.brightness == 0


async def test_lightener_light_async_update_group_state_zero(
    hass: HomeAssistant, create_lightener
):
    """Test that turned on does nothing if the controlled light is already off."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {}},
        }
    )

    lightener._attr_brightness = 150  # pylint: disable=protected-access

    hass.states.async_set(
        entity_id="light.test1", new_state="on", attributes={"brightness": 0}
    )

    lightener.async_update_group_state()

    assert lightener.brightness == 0


async def test_lightener_light_async_update_group_state_unavailable(
    hass: HomeAssistant, create_lightener
):
    """Test that turned on does nothing if the controlled light is already off."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {"50": "0"}, "light.I_DONT_EXIST": {}},
        }
    )

    lightener._attr_brightness = 150  # pylint: disable=protected-access

    hass.states.async_set(
        entity_id="light.test1", new_state="on", attributes={"brightness": 1}
    )

    lightener.async_update_group_state()

    assert lightener.brightness == 128


async def test_lightener_light_async_update_group_state_no_match_no_change(
    hass: HomeAssistant, create_lightener
):
    """Test that turned on does nothing if the controlled light is already off."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {"50": "0"}, "light.test2": {"10": "100"}},
        }
    )

    def test(test1: int, test2: int, result: int):
        lightener._attr_brightness = 150  # pylint: disable=protected-access

        hass.states.async_set(
            entity_id="light.test1", new_state="on", attributes={"brightness": test1}
        )

        hass.states.async_set(
            entity_id="light.test2", new_state="on", attributes={"brightness": test2}
        )

        lightener.async_update_group_state()

        assert lightener.brightness == result

    # Matches
    test(0, 29, 3)
    test(1, 255, 128)

    # No matches
    test(129, 1, 150)
    test(1, 254, 150)
    test(1, 1, 150)
    test(1, None, 150)


@pytest.mark.parametrize(
    "test1, current, result",
    [
        (0, 10, 10),
        (0, 20, 20),
        # We're in the range, so the change must happen here.
        (128, 20, 141),
        (255, 200, 200),
        (255, 255, 255),
    ],
)
async def test_lightener_light_async_update_group_state_current_good_no_change(
    test1, current, result, hass: HomeAssistant, create_lightener
):
    """Test that turned on does nothing if the controlled light is already off."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {"50": "0", "60": "100"}},
        }
    )

    lightener._prefered_brightness = current  # pylint: disable=protected-access

    hass.states.async_set(
        entity_id="light.test1", new_state="on", attributes={"brightness": test1}
    )

    lightener.async_update_group_state()

    assert lightener.brightness == result


async def test_lightener_light_async_update_group_state_onoff(
    hass: HomeAssistant, create_lightener
):
    """Test that turned on does nothing if the controlled light is already off."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test_onoff": {}},
        }
    )

    # lightener._attr_brightness = 150    # pylint: disable=protected-access

    hass.states.async_set(
        entity_id="light.test_onoff",
        new_state="on",
        attributes={"color_mode": ColorMode.ONOFF},
    )

    lightener.async_update_group_state()

    assert lightener.color_mode == ColorMode.BRIGHTNESS
    assert lightener.supported_color_modes == {ColorMode.BRIGHTNESS}


###########################################################
### LightenerControlledLight class only tests


async def test_lightener_light_entity_properties(hass):
    """Test all the basic properties of the LightenerLight class."""

    light = LightenerControlledLight("light.test1", {"brightness": {"10": "20"}}, hass)

    assert light.entity_id == "light.test1"


async def test_lightener_light_entity_calculated_levels(hass):
    """Test the calculation of brigthness levels."""

    light = LightenerControlledLight(
        "light.test1",
        {
            "brightness": {
                "10": "100",
            }
        },
        hass,
    )

    assert light.levels[0] == 0
    assert light.levels[13] == 128
    assert light.levels[25] == 245
    assert light.levels[26] == 255
    assert light.levels[27] == 255
    assert light.levels[100] == 255
    assert light.levels[255] == 255

    light = LightenerControlledLight(
        "light.test1",
        {
            "brightness": {
                "100": "0",  # Test the ordering
                "10": "10",
                "50": "100",
            }
        },
        hass,
    )

    assert light.levels[0] == 0
    assert light.levels[15] == 15
    assert light.levels[26] == 26
    assert light.levels[27] == 28
    assert light.levels[128] == 255
    assert light.levels[129] == 253
    assert light.levels[255] == 0


async def test_lightener_light_entity_reuses_cached_maps_for_same_config(hass):
    """Identical curve configs should reuse the derived brightness maps."""

    config = {
        "brightness": {
            "10": "100",
            "50": "25",
        }
    }

    first = LightenerControlledLight("light.test1", config, hass)
    second = LightenerControlledLight("light.test2", config, hass)

    assert first.levels is second.levels
    assert first.to_lightener_levels is second.to_lightener_levels
    assert first.to_lightener_levels_on_off is second.to_lightener_levels_on_off


async def test_lightener_light_entity_calculated_to_lightner_levels(hass):
    """Test the calculation of brigthness levels."""

    light = LightenerControlledLight(
        "light.test1",
        {
            "brightness": {
                "10": "100"  # 26: 255
            }
        },
        hass,
    )

    assert light.to_lightener_levels[0] == [0]
    assert light.to_lightener_levels[26] == [3]
    assert light.to_lightener_levels[253] == [26]
    assert light.to_lightener_levels[254] == [26]
    assert light.to_lightener_levels[255] == list(range(26, 256))

    light = LightenerControlledLight(
        "light.test1",
        {
            "brightness": {
                "100": "0",  # Test the ordering
                "10": "10",
                "50": "100",
            }
        },
        hass,
    )

    assert light.to_lightener_levels[0] == [0, 255]
    assert light.to_lightener_levels[26] == [26, 242]
    assert light.to_lightener_levels[255] == [128]

    assert light.to_lightener_levels[3] == [3, 254]
    assert light.to_lightener_levels[10] == [10, 250]


@pytest.mark.parametrize(
    "entity_id, expected_type",
    [
        ("light.test1", TYPE_DIMMABLE),
        ("light.test_onoff", TYPE_ONOFF),
    ],
)
async def test_lightener_light_entity_type(entity_id, expected_type, hass):
    """Test translate_brightness_back with float values."""

    light = LightenerControlledLight(
        entity_id,
        {},
        hass,
    )

    assert light.type is expected_type


@pytest.mark.parametrize(
    "lightener_level, light_level",
    [
        (0, 0),
        (1, 10),
        (26, 255),
        (39, 122),
        (255, 0),
    ],
)
async def test_lightener_light_entity_translate_brightness_dimmable(
    lightener_level, light_level, hass
):
    """Test translate_brightness_back with float values."""

    light = LightenerControlledLight(
        "light.test1",
        {
            "brightness": {
                "10": "100",
                "20": "0",
                "100": "0",
            }
        },
        hass,
    )

    assert light.translate_brightness(lightener_level) == light_level


@pytest.mark.parametrize(
    "lightener_level, light_level",
    [
        (0, 0),
        (1, 255),
        (26, 255),
        (39, 255),
        (255, 0),
    ],
)
async def test_lightener_light_entity_translate_brightness_dimmable_onoff(
    lightener_level, light_level, hass
):
    """Test translate_brightness_back with float values."""

    light = LightenerControlledLight(
        "light.test_onoff",
        {"brightness": {"10": "100", "20": "0", "100": "0"}},
        hass,
    )

    assert light.translate_brightness(lightener_level) == light_level


async def test_lightener_light_entity_translate_brightness_float(hass):
    """Test translate_brightness_back with float values."""

    light = LightenerControlledLight(
        "light.test1",
        {
            "brightness": {
                "10": "100"  # 26: 255
            }
        },
        hass,
    )

    assert light.translate_brightness(2.9) == 20


async def test_lightener_light_entity_translate_brightness_back_float(hass):
    """Test translate_brightness_back with float values."""

    light = LightenerControlledLight(
        "light.test1",
        {
            "brightness": {
                "10": "100"  # 26: 255
            }
        },
        hass,
    )

    assert light.translate_brightness_back(25.9) == [3]


###########################################################
### Other


async def test_async_setup_platform(hass):
    """Test for platform setup."""

    # pylint: disable=W0212

    async_add_entities_mock = Mock()

    config = {
        "platform": "lightener_studio",
        "lights": {
            "lightener_1": {
                "friendly_name": "Lightener 1",
                "entities": {"light.test1": {10: 100}},
            },
            "lightener_2": {
                "friendly_name": "Lightener 2",
                "entities": {"light.test2": {100: 10}},
            },
        },
    }

    await async_setup_platform(hass, config, async_add_entities_mock)

    assert async_add_entities_mock.call_count == 1

    created_lights: list = async_add_entities_mock.call_args.args[0]

    assert len(created_lights) == 2

    light: LightenerLight = created_lights[0]

    assert isinstance(light, LightenerLight)
    assert light.name == "Lightener 1"
    assert len(light._entities) == 1

    controlled_light: LightenerControlledLight = light._entities[0]

    assert isinstance(controlled_light, LightenerControlledLight)
    assert controlled_light.entity_id == "light.test1"
    assert controlled_light.levels[26] == 255

    light: LightenerLight = created_lights[1]

    assert isinstance(light, LightenerLight)
    assert light.name == "Lightener 2"
    assert len(light._entities) == 1

    controlled_light: LightenerControlledLight = light._entities[0]

    assert isinstance(controlled_light, LightenerControlledLight)
    assert light.extra_state_attributes["entity_id"][0] == "light.test2"
    assert controlled_light.entity_id == "light.test2"
    assert controlled_light.levels[255] == 26


@pytest.mark.parametrize(
    "config, expected_result",
    [
        # Normal configuration
        (
            {
                "10": "50",
                "20": "0",
                "30": "100",
            },
            {
                26: 128,
                51: 0,
                76: 255,
            },
        ),
        # Empty configuration
        ({}, {}),
        # Zero values
        ({"10": "0"}, {26: 0}),
        # 100% values
        ({"100": "100"}, {255: 255}),
    ],
)
def test_translate_config_to_brightness(config, expected_result):
    """Test the translate_config_to_brightness function."""

    assert translate_config_to_brightness(config) == expected_result


@pytest.mark.parametrize(
    "config, expected_result",
    [
        # Normal configuration
        (
            {
                "10": "50",
                "20": "0",
                "30": "100",
            },
            [
                (0, 0),
                (26, 128),
                (51, 0),
                (76, 255),
                (255, 255),
            ],
        ),
        # Empty configuration
        (
            {},
            [
                (0, 0),
                (255, 255),
            ],
        ),
        # 100% values
        (
            {
                "1": "100",
                "100": "50",
            },
            [
                (0, 0),
                (3, 255),
                (255, 128),
            ],
        ),
    ],
)
def test_prepare_brightness_config(config, expected_result):
    """Test the prepare_brightness_config function."""
    assert prepare_brightness_config(config) == expected_result


@pytest.mark.parametrize(
    "lightener_level, expected_entity_level",
    [
        (0, 0),
        (10, 30),
        (40, 0),
        (80, 90),
        (255, 255),
        (5, 15),
        (25, 15),
        (60, 45),
    ],
)
def test_create_brightness_map(lightener_level, expected_entity_level):
    """Test the create_brightness_map function."""

    config = [
        (0, 0),
        (10, 30),
        (40, 0),
        (80, 90),
        (255, 255),
    ]
    brigtness_map = create_brightness_map(config)

    assert brigtness_map[lightener_level] == expected_entity_level

    # Check if the length is correct
    assert len(brigtness_map) == 256


@pytest.mark.parametrize(
    "entity_level, expected_lightener_level_list",
    [
        (0, [0, 40]),
        (15, [5, 25, 47]),
        (30, [10, 53]),
        (90, [80]),
        (255, [255]),
    ],
)
def test_create_reverse_brightness_map(entity_level, expected_lightener_level_list):
    """Test the create_reverse_brightness_map function."""

    config = [
        (0, 0),
        (10, 30),
        (40, 0),
        (80, 90),
        (255, 255),
    ]

    levels = create_brightness_map(config)
    reverse_brightness_map = create_reverse_brightness_map(config, levels)

    assert reverse_brightness_map[entity_level] == expected_lightener_level_list

    # Check if the length is correct
    assert len(reverse_brightness_map) == 256


def test_create_reverse_brightness_map_on_off():
    """Test the create_reverse_brightness_map function."""

    config = [
        (0, 0),
        (10, 30),
        (40, 0),
        (80, 90),
        (255, 255),
    ]

    levels = create_brightness_map(config)
    reverse_brightness_map = create_reverse_brightness_map(config, levels)
    reverse_brightness_map_on_off = create_reverse_brightness_map_on_off(
        reverse_brightness_map
    )

    # Expected off is a list with 0 and 40
    expected_lightener_level_list_off = [0, 40]

    # Expected on is a list that goes from 1 to 255, except 40
    expected_lightener_level_list_on = list(range(1, 40)) + list(range(41, 256))

    assert reverse_brightness_map_on_off[0] == expected_lightener_level_list_off

    assert reverse_brightness_map_on_off[1] == expected_lightener_level_list_on
    assert reverse_brightness_map_on_off[10] == expected_lightener_level_list_on
    assert reverse_brightness_map_on_off[40] == expected_lightener_level_list_on
    assert reverse_brightness_map_on_off[45] == expected_lightener_level_list_on
    assert reverse_brightness_map_on_off[254] == expected_lightener_level_list_on
    assert reverse_brightness_map_on_off[255] == expected_lightener_level_list_on

    # Check if the length is correct
    assert len(reverse_brightness_map) == 256


@pytest.mark.parametrize(
    "source_range, value, target_range, expected_result",
    [
        # Positive order
        ((1, 255), 1, (1, 100), 1),
        ((1, 255), 255, (1, 100), 100),
        ((1, 255), 128, (1, 100), 50),
        # Low target range
        ((1, 255), 2, (1, 10), 1),
        ((1, 255), 15, (1, 10), 1),
        ((1, 255), 16, (1, 10), 2),
        ((1, 255), 25, (1, 10), 2),
        # Negative target order
        ((1, 255), 1, (255, 1), 255),
        ((1, 255), 255, (255, 1), 1),
        ((1, 255), 128, (255, 1), 128),
        # Negative source order
        ((255, 1), 1, (1, 100), 100),
        ((255, 1), 255, (1, 100), 1),
        ((255, 1), 26, (1, 100), 90),
    ],
)
def test_scale_ranged_value_to_int_range(
    source_range, value, target_range, expected_result
):
    """Test the scale_ranged_value_to_int_range function."""

    assert (
        scale_ranged_value_to_int_range(source_range, target_range, value)
        == expected_result
    )


# Issues


async def test_lightener_issue_41(hass: HomeAssistant, create_lightener):
    """Test the state changes of the LightenerLight class when turned on."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {
                "light.test1": {},
                "light.test2": {50: 0},
            },
        }
    )

    await lightener.async_turn_on(brightness=30)
    await hass.async_block_till_done()
    assert lightener.brightness == 30

    await lightener.async_turn_off()
    await hass.async_block_till_done()
    assert lightener.brightness is None
    assert hass.states.get("light.test1").state == "off"
    assert hass.states.get("light.test2").state == "off"

    await lightener.async_turn_on()
    await hass.async_block_till_done()
    assert lightener.brightness == 30

    assert hass.states.get("light.test1").state == "on"
    assert hass.states.get("light.test1").attributes["brightness"] == 30
    assert hass.states.get("light.test2").state == "off"


async def test_lightener_issue_97(hass: HomeAssistant, create_lightener):
    """Test the state changes of the LightenerLight class when turned on."""

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {
                "light.test1": {50: 100},
                "light.test_onoff": {50: 0},
            },
        }
    )

    await lightener.async_turn_on(brightness=129)  # 51% of 255
    await hass.async_block_till_done()
    assert lightener.brightness == 129
    assert hass.states.get("light.test").attributes["brightness"] == 129

    assert hass.states.get("light.test1").state == "on"
    assert hass.states.get("light.test_onoff").state == "on"

    await lightener.async_turn_on(brightness=200)
    await hass.async_block_till_done()
    assert lightener.brightness == 200
    assert hass.states.get("light.test").attributes["brightness"] == 200

    assert hass.states.get("light.test1").state == "on"
    assert hass.states.get("light.test_onoff").state == "on"

    assert hass.states.get("light.test1").attributes["brightness"] == 255


async def test_turn_on_records_the_error_and_unfreezes_on_failure(
    hass: HomeAssistant, create_lightener
):
    """A failure while building the service calls must propagate, unfreeze the
    Lightener, and still close the observability span."""
    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {}},
        }
    )

    with (
        patch.object(
            LightenerControlledLight,
            "translate_brightness",
            side_effect=RuntimeError("translation exploded"),
        ),
        patch(
            "custom_components.lightener_studio.light.end_span",
            wraps=end_span,
        ) as ended,
        pytest.raises(ExceptionGroup),
    ):
        await lightener.async_turn_on(brightness=128)

    # The freeze guard is released even though the operation failed, otherwise
    # the Lightener would stop reacting to member state changes.
    assert lightener._is_frozen is False

    # The span closes as an error naming the failure, not silently as "ok".
    # Without this the whole error-recording path could be deleted and the
    # unfreeze assertion above would still pass.
    root_call = next(
        call
        for call in ended.call_args_list
        if call.args[1].name == "lightener.turn_on"
    )
    assert root_call.kwargs["status"] == "error"
    # The TaskGroup wraps the member failure, so the recorded type is the group
    # rather than the RuntimeError raised inside translate_brightness.
    assert root_call.kwargs["error_type"] == "ExceptionGroup"


async def test_turn_off_records_the_error_and_unfreezes_on_failure(
    hass: HomeAssistant, create_lightener
):
    """A failing turn_off propagates but still unfreezes and writes state."""
    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {}},
        }
    )

    with (
        patch(
            "homeassistant.components.group.light.LightGroup.async_turn_off",
            side_effect=RuntimeError("group turn_off exploded"),
        ),
        patch.object(
            LightenerLight, "async_write_ha_state", autospec=True
        ) as write_state,
        patch(
            "custom_components.lightener_studio.light.end_span",
            wraps=end_span,
        ) as ended,
        pytest.raises(RuntimeError, match="group turn_off exploded"),
    ):
        await lightener.async_turn_off()

    assert lightener._is_frozen is False

    # "writes state" is half the docstring, so assert it: without the write the
    # UI keeps showing the pre-failure state until something else touches it.
    write_state.assert_called_once()

    root_call = next(
        call
        for call in ended.call_args_list
        if call.args[1].name == "lightener.turn_off"
    )
    assert root_call.kwargs["status"] == "error"
    assert root_call.kwargs["error_type"] == "RuntimeError"


async def test_no_sync_turn_on_or_turn_off_override(hass: HomeAssistant):
    """LightenerLight must not override Home Assistant's SYNC entry points.

    ``LightEntity.turn_on``/``turn_off`` are synchronous. The only caller is
    ``Entity.async_turn_on`` (helpers/entity.py:1695), which hands them to
    ``async_add_executor_job`` — and LightenerLight overrides ``async_turn_on``,
    so that caller never runs. An ``async def turn_on`` here would therefore be
    dead code, and if anything ever did reach it the executor would get an
    un-awaited coroutine and the light would silently not turn on.
    """
    assert "turn_on" not in vars(LightenerLight)
    assert "turn_off" not in vars(LightenerLight)
    assert not inspect.iscoroutinefunction(LightenerLight.turn_on)
    assert not inspect.iscoroutinefunction(LightenerLight.turn_off)


async def test_controlled_light_type_is_none_when_the_light_is_unknown(hass):
    """An unresolvable light type degrades to None instead of raising, so a
    removed member cannot break brightness translation."""
    entity = LightenerControlledLight("light.gone", {}, hass)

    with patch(
        "custom_components.lightener_studio.light.get_light_type",
        side_effect=HomeAssistantError("no such light"),
    ):
        assert entity.type is None


async def test_translate_brightness_back_of_none_is_empty(hass):
    """An unavailable member reports no brightness, which maps to no levels."""
    entity = LightenerControlledLight("light.test1", {}, hass)

    assert entity.translate_brightness_back(None) == []


async def test_group_state_ignores_members_outside_this_lightener(
    hass: HomeAssistant, create_lightener
):
    """A tracked entity id with no matching controlled light is skipped rather
    than raising while recomputing the group brightness."""
    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.test1": {}},
        }
    )
    hass.states.async_set("light.test1", "on", {"brightness": 255})

    # Track an entity that is not part of this Lightener's controlled set, and
    # put it FIRST: the unknown id has to be skipped so the real member behind
    # it still gets reconciled. Appending it instead would let an early return
    # pass, because there would be nothing left to skip.
    lightener._entity_ids = ["light.test2", *lightener._entity_ids]
    hass.states.async_set("light.test2", "on", {"brightness": 10})

    # A stale level the reconciliation must overwrite from the real member.
    lightener._attr_brightness = 7
    lightener._prefered_brightness = 7

    lightener.async_update_group_state()

    assert "light.test2" not in lightener._entities_by_id
    assert lightener.is_on is True
    # Reconciled from light.test1 (identity curve at 255), not from the skipped
    # entity's 10 and not left at the stale 7.
    assert lightener._attr_brightness == 255


# ---------------------------------------------------------------------------
# Group reconciliation with a flat-zero member
#
# A curve that holds its light at 0 across a band of group levels ("stay off
# until the room reaches X%") is a shape users draw by hand. It is the only
# shape that makes ``translate_brightness_back(0)`` return a wide candidate set
# (116 levels instead of 1, see ``test_brightness.py``), which feeds the
# intersect-then-``set.pop()`` path in ``async_update_group_state``. These
# tests pin what that resolves to today, so the behaviour cannot drift
# unnoticed if a preset ever takes this shape.
# ---------------------------------------------------------------------------

# Off until group 45% (HA level 115), then ramp to full.
FLAT_ZERO_CURVE = {"45": "0", "70": "45", "100": "100"}


async def test_group_state_with_flat_zero_member_takes_the_other_members_level(
    hass: HomeAssistant, create_lightener
):
    """A wide off-band must not let the group pick an arbitrary level.

    ``light.flat`` is off, so it reports every group level in 0..115 as
    possible. ``light.linear`` is on at 100, which is possible at exactly one
    group level. The intersection is a single value, so the ``set.pop()`` in
    ``async_update_group_state`` has nothing to choose between.
    """

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.flat": dict(FLAT_ZERO_CURVE), "light.linear": {}},
        }
    )

    lightener._attr_brightness = 150  # pylint: disable=protected-access

    hass.states.async_set(entity_id="light.flat", new_state="off")
    hass.states.async_set(
        entity_id="light.linear", new_state="on", attributes={"brightness": 100}
    )

    lightener.async_update_group_state()

    assert lightener.is_on is True
    assert lightener.brightness == 100


async def test_group_state_with_flat_zero_member_keeps_brightness_when_members_disagree(
    hass: HomeAssistant, create_lightener
):
    """No common level must hold the current brightness, not fall into the off band.

    ``light.linear`` at 200 is outside the flat member's 0..115 off band, so the
    two members share no possible group level. The group must keep the value it
    already had rather than adopting one from the wide candidate set.
    """

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {"light.flat": dict(FLAT_ZERO_CURVE), "light.linear": {}},
        }
    )

    lightener._attr_brightness = 150  # pylint: disable=protected-access

    hass.states.async_set(entity_id="light.flat", new_state="off")
    hass.states.async_set(
        entity_id="light.linear", new_state="on", attributes={"brightness": 200}
    )

    lightener.async_update_group_state()

    assert lightener.is_on is True
    assert lightener.brightness == 150


async def test_two_flat_members_leave_a_wide_intersection_resolved_by_pop(
    hass: HomeAssistant, create_lightener
):
    """Two flat regions overlap, and the winner comes out of ``set.pop()``.

    ``light.flat`` is off, so every group level in 0..115 is possible for it.
    ``light.plateau`` holds a constant 10% across group levels 51..153, so at
    that brightness it too reports a wide band. The intersection is dozens of
    levels wide and ``async_update_group_state`` resolves it with
    ``common_level.pop()``, which returns an arbitrary element of a set.

    The exact value is asserted on purpose. It is not a designed answer; it is
    what ``pop()`` happens to return. If the resolution is ever made explicit
    (lowest, nearest-to-preferred, hold-current), this is the test that has to
    change, deliberately rather than by accident.
    """

    lightener: LightenerLight = await create_lightener(
        config={
            "friendly_name": "Test",
            "entities": {
                "light.flat": dict(FLAT_ZERO_CURVE),
                # Constant 10% from group 20% to 60%, then up to full.
                "light.plateau": {"20": "10", "60": "10", "100": "100"},
            },
        }
    )

    lightener._attr_brightness = 150  # pylint: disable=protected-access

    hass.states.async_set(entity_id="light.flat", new_state="off")
    hass.states.async_set(
        entity_id="light.plateau", new_state="on", attributes={"brightness": 26}
    )

    lightener.async_update_group_state()

    assert lightener.is_on is True

    # Spell out how wide the choice actually is, so a future reader can see
    # that 51 is one of 65 equally-possible answers rather than a computed one.
    flat, plateau = lightener._entities  # pylint: disable=protected-access
    overlap = set(flat.translate_brightness_back(0)) & set(
        plateau.translate_brightness_back(26)
    )
    assert len(overlap) == 65
    assert min(overlap) == 51 and max(overlap) == 115

    assert lightener.brightness == 51
