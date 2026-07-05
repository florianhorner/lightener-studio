"""Guard the local dev HA config against regrowing the discovery stack.

`scripts/develop` (the Conductor Run button) boots Home Assistant against
`config/configuration.yaml` on the developer's machine. `default_config:` pulls in
zeroconf/ssdp/dhcp/usb/bluetooth, which scan the real LAN (real device names bleed
into the dev log) and crash on macOS CoreBluetooth at shutdown. The dev config uses
an explicit minimal stack instead; this test fails loudly if any of that creeps back.

Scope: the *dev* config only. The test fixture
`tests/components/lightener_studio/configuration.yaml` runs inside pytest's network-blocked
HA harness, so its `default_config:` is harmless and intentionally not guarded here.
"""

from pathlib import Path

import yaml

_FORBIDDEN_KEYS = frozenset(
    {"default_config", "bluetooth", "zeroconf", "ssdp", "dhcp", "usb"}
)


def test_dev_config_has_no_discovery_stack() -> None:
    """The local dev HA config must not enable LAN/Bluetooth discovery."""
    config_path = Path(__file__).resolve().parents[3] / "config" / "configuration.yaml"
    loaded = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}

    assert isinstance(loaded, dict), (
        "configuration.yaml must be a mapping at the top level"
    )

    present = _FORBIDDEN_KEYS.intersection(loaded)
    assert not present, (
        "config/configuration.yaml enables discovery integrations "
        f"{sorted(present)} — these scan the real LAN and crash on macOS "
        "CoreBluetooth. Use the explicit minimal stack (frontend/config/...) instead."
    )
