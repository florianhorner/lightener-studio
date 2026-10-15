"""Guard the test harness itself.

pytest-homeassistant-custom-component enables loop debug mode and checks for
lingering tasks after every test. Both only work if they reach the loop the
test runs on, which depends on how pytest-asyncio and the plugin interact.
These tests fail if a dependency bump breaks that silently.
"""

import asyncio
import importlib.metadata
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_PROBE_ENV = "LIGHTENER_HARNESS_PROBE"
# requirements.txt overrides these pins of the HA test plugin (installed second).
_OVERRIDDEN = {"pytest", "pytest-asyncio", "pytest-cov"}


def _normalize(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


async def test_event_loop_debug_is_on_for_the_test_loop() -> None:
    """enable_event_loop_debug must reach the loop the test runs on."""
    assert asyncio.get_running_loop().get_debug()


@pytest.mark.skipif(
    not os.environ.get(_PROBE_ENV),
    reason="probe, run by test_verify_cleanup_fails_a_lingering_task",
)
async def test_probe_leaves_a_task_behind() -> None:
    """Leave a task running; verify_cleanup must fail this test at teardown."""
    asyncio.get_running_loop().create_task(asyncio.Event().wait())


def test_verify_cleanup_fails_a_lingering_task(tmp_path: Path) -> None:
    """Run the probe in a child pytest and expect the cleanup check to fail it."""
    probe = Path(__file__).resolve().relative_to(_REPO_ROOT)
    report = tmp_path / "probe.xml"
    env = {k: v for k, v in os.environ.items() if k != "PYTEST_ADDOPTS"}
    env[_PROBE_ENV] = "1"
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "-p",
            "no:cacheprovider",
            f"--junitxml={report}",
            f"{probe}::test_probe_leaves_a_task_behind",
        ],
        cwd=_REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    output = result.stdout + result.stderr
    assert result.returncode == 1, output
    suite = ET.parse(report).getroot()
    suite = suite if suite.tag == "testsuite" else suite.find("testsuite")
    assert suite is not None, output
    assert suite.get("errors") == "1", output
    assert suite.get("failures") == "0", output
    errors = suite.findall(".//error")
    assert len(errors) == 1, output
    error_text = (errors[0].get("message") or "") + (errors[0].text or "")
    assert "Failed: Lingering task after test" in error_text, output


def test_overridden_test_pins_are_installed() -> None:
    """requirements.txt pins must win over the HA test plugin's own pins."""
    pins = {}
    for line in (_REPO_ROOT / "requirements.txt").read_text().splitlines():
        if match := re.fullmatch(r"([A-Za-z0-9_.-]+)==(\S+)", line.strip()):
            pins[_normalize(match[1])] = match[2]
    missing = _OVERRIDDEN - pins.keys()
    assert not missing, f"requirements.txt has no exact pin for {sorted(missing)}"
    for name in sorted(_OVERRIDDEN):
        installed = importlib.metadata.version(name)
        assert installed == pins[name], (
            f"{name} {installed} is installed but requirements.txt pins "
            f"{pins[name]}; install requirements-ha-test.txt before requirements.txt"
        )
