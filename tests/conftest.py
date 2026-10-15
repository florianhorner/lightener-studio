"""Run the HA test plugin's loop fixtures on each test's own event loop.

Equivalent of home-assistant/core#166758 (shipped in
pytest-homeassistant-custom-component 0.13.326) for 0.13.316, the last release
that supports Python 3.13. Delete this file once the plugin is >= 0.13.326.

The plugin's sync autouse fixtures call asyncio.get_event_loop() before
pytest-asyncio creates the test's runner. With pytest-asyncio 1.3.0 that
returns the session loop, so debug mode and the lingering-task check never
reach the test's loop. With 1.4.0 there is no current loop after the first
test, and every later test errors at setup.
"""

import asyncio
from collections.abc import Generator

import pytest
import pytest_asyncio


@pytest_asyncio.fixture(autouse=True)
async def enable_event_loop_debug() -> None:
    """Enable debug mode on the loop the test runs on."""
    asyncio.get_running_loop().set_debug(True)


@pytest.fixture(autouse=True)
def verify_cleanup(
    enable_event_loop_debug: None,
    verify_cleanup: None,
) -> Generator[None]:
    """Run the plugin's verify_cleanup once the test's loop is current.

    enable_event_loop_debug is requested first: setting it up creates the
    test's runner, which makes the test's loop current before the plugin's
    verify_cleanup (requested by the same name) reads it. Declaring that order
    keeps it from depending on how pytest orders the plugin's autouse fixtures.
    """
    yield
